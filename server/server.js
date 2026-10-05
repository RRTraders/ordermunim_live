const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const FIREBASE_PROJECT_ID = "meesho-otp-app";

const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// In-memory debug log ring buffer
const logBuffer = [];
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(msg);
  logBuffer.push(line);
  if (logBuffer.length > 300) logBuffer.shift();
}

// =====================================================================
// SESSION PERSISTENCE — saves cookies to disk after login
// =====================================================================

function loadSession(syncKey) {
  try {
    const file = path.join(SESSIONS_DIR, syncKey, 'api_session.json');
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return null;
}

function saveSession(syncKey, data) {
  try {
    const dir = path.join(SESSIONS_DIR, syncKey);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'api_session.json'), JSON.stringify(data, null, 2));
  } catch (e) { log(`[Session] Save error: ${e.message}`); }
}

function deleteSessionData(syncKey) {
  try {
    const dir = path.join(SESSIONS_DIR, syncKey);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {}
}

// =====================================================================
// FIRESTORE HELPER
// =====================================================================

async function updateFirestoreAccount(syncKey, data) {
  try {
    const fieldsToUpdate = [];
    const fieldsObj = {};

    if (data.storeName !== undefined) { fieldsToUpdate.push('storeName'); fieldsObj.storeName = { stringValue: data.storeName }; }
    if (data.otp !== undefined) { fieldsToUpdate.push('currentOtp'); fieldsObj.currentOtp = { stringValue: data.otp }; }
    if (data.courier !== undefined) { fieldsToUpdate.push('courier'); fieldsObj.courier = { stringValue: data.courier }; }
    if (data.handoverCount !== undefined) { fieldsToUpdate.push('handoverCount'); fieldsObj.handoverCount = { integerValue: String(data.handoverCount || 0) }; }
    if (data.dateTime !== undefined) { fieldsToUpdate.push('dateTime'); fieldsObj.dateTime = { stringValue: data.dateTime }; }
    if (data.identifier !== undefined) { fieldsToUpdate.push('identifier'); fieldsObj.identifier = { stringValue: data.identifier }; }
    if (data.status !== undefined) { fieldsToUpdate.push('status'); fieldsObj.status = { stringValue: data.status }; }
    if (data.otpList !== undefined) {
      fieldsToUpdate.push('otpList');
      fieldsObj.otpList = {
        arrayValue: {
          values: (data.otpList || []).map(item => ({
            mapValue: {
              fields: {
                otp:          { stringValue: item.otp || '----' },
                courier:      { stringValue: item.courier || '' },
                handoverCount:{ integerValue: String(item.handoverCount || 0) },
                dateTime:     { stringValue: item.dateTime || '' }
              }
            }
          }))
        }
      };
    }
    fieldsToUpdate.push('lastUpdated');
    fieldsObj.lastUpdated = { stringValue: new Date().toISOString() };

    const maskParams = fieldsToUpdate.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/accounts/${encodeURIComponent(syncKey)}?${maskParams}`;
    const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: fieldsObj }) });
    log(`[Firestore] Updated ${syncKey}: status=${res.status}`);
  } catch (err) { log(`[Firestore] Error: ${err.message}`); }
}

// =====================================================================
// MEESHO OTP API — calls Meesho's internal API using saved session cookies
// =====================================================================

function buildMeeshoHeaders(cookies, identifier) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
    'Origin': 'https://supplier.meesho.com',
    'Referer': `https://supplier.meesho.com/panel/v3/new/fulfillment/${identifier}/returns/overview`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Cookie': cookies
  };
}

async function fetchOTPWithCookies(identifier, cookies) {
  log(`[OTP API] Fetching OTP for ${identifier}...`);

  try {
    const res = await fetch('https://supplier.meesho.com/api/fulfillment/returnRto/fetchDeliveryOTPs', {
      method: 'POST',
      headers: buildMeeshoHeaders(cookies, identifier),
      body: JSON.stringify({ identifier, child_supplier_identifier: null, child_supplier_id: null })
    });

    log(`[OTP API] fetchDeliveryOTPs status: ${res.status}`);

    if (res.ok) {
      const json = await res.json();
      log(`[OTP API] Response: ${JSON.stringify(json)}`);
      const rawList = json.supplier_delivery_otp || [];
      if (rawList.length > 0) {
        // Map ALL couriers — not just the first one
        const otpList = rawList.map(item => ({
          otp: item.otp || '----',
          courier: item.carrier_details?.name || item.carrier_name || 'Courier',
          // Meesho uses total_handover_count; fallback chain covers API variations
          handoverCount:
            item.total_handover_count ??
            item.delivery_shipment_details?.total_handover_count ??
            item.delivery_shipment_details?.total_shipment_count ??
            item.count ??
            0,
          dateTime: item.otp_expiry_timestamp
            ? new Date(item.otp_expiry_timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        }));
        log(`[OTP API] All couriers: ${JSON.stringify(otpList)}`);
        return { otpList };
      }
    } else if (res.status === 401 || res.status === 403) {
      log(`[OTP API] Session expired for ${identifier}, needs re-login`);
      return null; // Signal session expired
    }
  } catch (e) {
    log(`[OTP API] Error: ${e.message}`);
  }

  return { otpList: [] };
}

// =====================================================================
// BROWSER-BASED LOGIN — Only used ONCE per account, then saves cookies
// =====================================================================

async function launchBrowserContext(sessionDir) {
  const baseArgs = [
    '--headless=new',
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--no-first-run', '--disable-gpu', '--no-default-browser-check',
    '--disable-infobars', '--window-position=-2400,-2400',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
  ];

  let context;

  try {
    context = await chromium.launchPersistentContext(sessionDir, {
      channel: 'chrome',
      headless: true, // 100% invisible background process
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      ignoreDefaultArgs: ['--enable-automation'],
      args: baseArgs
    });
  } catch (err) {
    log(`[Browser] Chrome unavailable (${err.message.split('\n')[0]}), using bundled Chromium...`);
    context = await chromium.launchPersistentContext(sessionDir, {
      headless: true, // 100% invisible background process
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      ignoreDefaultArgs: ['--enable-automation'],
      args: baseArgs
    });
  }

  // Mask webdriver property
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  return context;
}


async function loginAndExtractMeesho(syncKey, email, password, storeName, userId) {
  log(`\n=== [Login] Starting for: ${email} (${syncKey}) ===`);

  const sessionDir = path.join(SESSIONS_DIR, syncKey, 'browser');
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  let context;
  try {
    context = await launchBrowserContext(sessionDir);
    const page = await context.newPage();

    let loginApiError = null;
    let apiStoreName = null;
    page.on('response', async res => {
      const u = res.url();
      if (u.includes('v2-login') || u.includes('/api/container/user/') || u.includes('/supplier/profile')) {
        try {
          const body = await res.json();
          log(`[Login] API response from ${u.split('?')[0]}: ${JSON.stringify(body).substring(0, 300)}`);
          if (!res.ok) {
            loginApiError = body?.error || body?.options?.backendData?.error || 'Authentication failed';
          } else {
            const possibleName = body?.data?.supplier_name || body?.data?.store_name || body?.supplier_name || body?.store_name || body?.name || body?.legal_entity_name;
            if (possibleName && typeof possibleName === 'string' && possibleName.trim().length > 1) {
              apiStoreName = possibleName.trim();
              log(`[Login] Detected real store name from API: "${apiStoreName}"`);
            }
          }
        } catch (e) {}
      }
    });

    log(`[Login] Navigating to Meesho supplier login page...`);
    await page.goto('https://supplier.meesho.com/panel/v3/new/root/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Handle Access Denied
    const title = await page.title().catch(() => '');
    if (title.includes('Access Denied') || title.includes('access denied')) {
      log(`[Login] Akamai block detected on initial load.`);
      await context.close();
      return { success: false, error: 'Meesho security shield blocked this request. Please wait 1 minute and try again.' };
    }

    // Wait for login form
    let alreadyLoggedIn = false;
    try {
      await page.waitForSelector('input[name="emailOrPhone"]', { timeout: 12000 });
    } catch (e) {
      if (!page.url().includes('login')) {
        alreadyLoggedIn = true;
        log(`[Login] Already logged in!`);
      } else {
        log(`[Login] Login form not found: ${e.message}`);
        await context.close();
        return { success: false, error: 'Could not load Meesho login form. Please try again in a moment.' };
      }
    }

    if (!alreadyLoggedIn) {
      log(`[Login] Filling credentials for ${email}...`);
      await page.locator('input[name="emailOrPhone"]').fill(email.trim());
      await page.waitForTimeout(300);
      await page.locator('input[name="password"]').fill(password);
      await page.waitForTimeout(300);

      // Submit and wait for response or URL change
      await page.locator('button[type="submit"]').first().click();

      // Wait up to 10 seconds for URL change or API error
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(500);
        const u = page.url();
        if (u.includes('growth') || u.includes('fulfillment') || u.includes('dashboard')) {
          log(`[Login] URL changed to dashboard: ${u}`);
          break;
        }
        if (loginApiError) {
          log(`[Login] API returned error: ${loginApiError}`);
          break;
        }
      }

      const currentUrl = page.url();
      log(`[Login] URL after submit: ${currentUrl}`);

      if (currentUrl.includes('login') || loginApiError) {
        // Still on login page — get error text
        const errorText = loginApiError || await page.evaluate(() => {
          const selectors = ['[role="alert"]', '[class*="error" i]', '[class*="helper" i]'];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.innerText && el.innerText.trim().length > 3) return el.innerText.trim();
          }
          return null;
        });
        log(`[Login] Failed. Error: ${errorText}`);
        await context.close();
        return { success: false, error: errorText || 'Wrong email or password. Please check your Meesho credentials.' };
      }
    }


    // --- LOGGED IN SUCCESSFULLY ---
    // Extract identifier from URL
    const currentUrl = page.url();
    const identifier = (currentUrl.match(/(?:growth|fulfillment)\/([a-zA-Z0-9]+)/) || [])[1] || '';

    // Navigate to returns page first so all dashboard elements are rendered
    if (identifier) {
      await page.goto(`https://supplier.meesho.com/panel/v3/new/fulfillment/${identifier}/returns/overview`, {
        waitUntil: 'domcontentloaded', timeout: 20000
      }).catch(() => {});
      await page.waitForTimeout(5000);
    }

    // Save screenshot for verification
    await page.screenshot({ path: path.join(__dirname, 'last_store_login.png') }).catch(() => {});

    // Extract real account holder / store name from fully rendered page
    const domStoreName = await page.evaluate(() => {
      // 1. Check sidebar top element next to the storefront icon
      const sidebar = document.querySelector('aside, nav, [class*="sidebar" i], [class*="Sidebar" i]');
      if (sidebar) {
        const leafNodes = Array.from(sidebar.querySelectorAll('*')).filter(el => {
          return el.children.length === 0 && el.innerText && el.innerText.trim().length > 1;
        });
        for (const el of leafNodes) {
          const t = el.innerText.trim();
          if (t.length > 1 && t.length < 50 && !t.includes('\n') &&
              !/^(Home|Orders|Returns|Pricing|Claims|Inventory|Catalog|Quality|Payments|Warehouse|Notices|Support|Boost|Influencer|Advertisement|Promotions|Instant|Supplier|Hub|NEW|Live|Update|Settings|How it works|Manage Business)/i.test(t)) {
            return t;
          }
        }
      }

      // 2. Check "Welcome back, {Store Name}"
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, span, p'));
      for (const h of headings) {
        if (h.innerText && /Welcome\s+back,?\s*([^\n!.,]+)/i.test(h.innerText)) {
          const m = h.innerText.match(/Welcome\s+back,?\s*([^\n!.,]+)/i);
          if (m && m[1].trim().length > 1) return m[1].trim();
        }
      }

      // 3. Check any dropdown or header with storefront/user icon
      const dropdowns = Array.from(document.querySelectorAll('button, [role="button"], header *'));
      for (const el of dropdowns) {
        if (el.children.length === 0 && el.innerText) {
          const t = el.innerText.trim();
          if (t.length > 1 && t.length < 40 && !t.includes('\n') && !/^(Notice|Support|How|Search|Filter|Sort|Download|Export|Return|RTO|Orders)/i.test(t)) {
            return t;
          }
        }
      }

      return '';
    });

    const detectedStoreName = storeName || apiStoreName || domStoreName || (email.includes('@') ? email.split('@')[0] : email);
    log(`[Login] Final detected Store Name: "${detectedStoreName}" (api="${apiStoreName}", dom="${domStoreName}"), Identifier: "${identifier}"`);

    // Extract cookies for future API calls
    const cookies = await context.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Save session
    saveSession(syncKey, {
      email,
      identifier,
      storeName: detectedStoreName,
      cookies: cookieStr,
      savedAt: new Date().toISOString()
    });

    // Now fetch OTP via API using the fresh cookies
    let otpResult = await fetchOTPWithCookies(identifier, cookieStr);

    // Also try DOM extraction as backup
    if (!otpResult || otpResult.otp === '----') {
      otpResult = await page.evaluate(() => {
        let otp = '----', courier = 'No active return', handoverCount = 0;
        const dateTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        const otpNode = Array.from(document.querySelectorAll('*')).find(e =>
          e.children.length < 3 && e.innerText && /OTP:/i.test(e.innerText) && /\b\d{4,6}\b/.test(e.innerText)
        );
        if (otpNode) {
          const text = otpNode.innerText;
          const partnerMatch = text.match(/([a-zA-Z]+)\s+OTP:/i);
          const otpMatch = text.match(/\b(\d{4,6})\b/);
          if (partnerMatch) courier = partnerMatch[1];
          if (otpMatch) otp = otpMatch[1];

          const countNode = Array.from(document.querySelectorAll('*')).find(e =>
            e.children.length < 3 && e.innerText && /Total\s+Handover\s+Count\s*:\s*\d+/i.test(e.innerText)
          );
          if (countNode) {
            const m = countNode.innerText.match(/(\d+)/);
            if (m) handoverCount = parseInt(m[1], 10);
          }
        }
        return { otp, courier, handoverCount, dateTime };
      }) || { otp: '----', courier: 'No active return', handoverCount: 0, dateTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
    }

    log(`[Login] OTP result: ${JSON.stringify(otpResult)}`);

    // Duplicate check
    try {
      const chkRes = await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/accounts`);
      const chkData = await chkRes.json();
      if (chkData.documents) {
        for (const docItem of chkData.documents) {
          const docKey = docItem.name.split('/').pop();
          if (docKey === syncKey) continue;
          const f = docItem.fields || {};
          const existingEmail = f.email?.stringValue || '';
          const existingIdent = f.identifier?.stringValue || '';
          const existingUser = f.userId?.stringValue || '';
          const matchEmail = existingEmail && email && existingEmail.trim().toLowerCase() === email.trim().toLowerCase();
          const matchIdent = existingIdent && identifier && existingIdent === identifier;

          if ((matchEmail || matchIdent) && existingUser !== userId) {
            if (existingUser === 'vJID6QrALTf4ybiDP5TuLvNkyN63') {
              fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/accounts/${docKey}`, { method: 'DELETE' }).catch(() => {});
              continue;
            }
            log(`[Login] DUPLICATE: ${email} already linked by another client.`);
            return { success: false, error: `This Meesho account is already linked by another client.` };
          }
        }
      }
    } catch (e) { log(`[Login] Duplicate check error: ${e.message}`); }

    return {
      success: true,
      storeName: detectedStoreName,
      identifier,
      otpList: otpResult.otpList || [],
      // Keep legacy single-OTP fields from first entry for backward compat
      otp: (otpResult.otpList?.[0]?.otp) || '----',
      courier: (otpResult.otpList?.[0]?.courier) || 'No active return',
      handoverCount: (otpResult.otpList?.[0]?.handoverCount) || 0,
      dateTime: (otpResult.otpList?.[0]?.dateTime) || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };

  } catch (err) {
    log(`[Login] Error: ${err.message}`);
    return { success: false, error: `Login error: ${err.message}` };
  } finally {
    if (context) await context.close().catch(() => {});
  }
}

// =====================================================================
// AUTO-REFRESH — Uses saved cookies, NO browser needed
// =====================================================================

async function checkReturnsForSession(syncKey) {
  const session = loadSession(syncKey);
  if (!session || !session.identifier || !session.cookies) {
    log(`[Auto-Sync] No valid session for ${syncKey}`);
    return null;
  }

  const { identifier, cookies } = session;
  log(`[Auto-Sync] Refreshing ${syncKey} (${identifier}) via API...`);

  const result = await fetchOTPWithCookies(identifier, cookies);

  if (result === null) {
    // Session expired — mark as needs re-login
    log(`[Auto-Sync] Session expired for ${syncKey}, skipping`);
    await updateFirestoreAccount(syncKey, { status: 'needs_relogin' });
    return null;
  }

  await updateFirestoreAccount(syncKey, {
    otpList: result.otpList || [],
    otp: result.otp,
    courier: result.courier,
    handoverCount: result.handoverCount,
    dateTime: result.dateTime,
    status: 'live'
  });

  return result;
}

// Auto-refresh every 3 minutes
setInterval(async () => {
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/accounts`);
    const data = await res.json();
    if (data.documents) {
      for (const doc of data.documents) {
        const key = doc.name.split('/').pop();
        if (key.startsWith('MSH-')) await checkReturnsForSession(key);
      }
    }
  } catch (e) { log(`[Auto-Sync] Interval error: ${e.message}`); }
}, 3 * 60 * 1000);

// =====================================================================
// ROUTES
// =====================================================================

app.delete('/api/meesho/session/:syncKey', (req, res) => {
  deleteSessionData(req.params.syncKey);
  res.json({ success: true });
});

app.post('/api/meesho/refresh/:syncKey', async (req, res) => {
  const result = await checkReturnsForSession(req.params.syncKey);
  if (result) return res.json({ success: true, ...result });
  return res.status(500).json({ error: 'Failed to refresh OTP' });
});

app.post('/api/meesho/login', async (req, res) => {
  const { userId, syncKey, storeName, email, password } = req.body;
  if (!email || !password || !syncKey) return res.status(400).json({ error: 'Missing fields' });
  try {
    const result = await loginAndExtractMeesho(syncKey, email, password, storeName, userId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.redirect('https://meesho-otp-live.web.app'));

app.get('/api/debug/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(logBuffer.join('\n'));
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Heartbeat
// Automatic Cloudflare Tunnel Manager
const { spawn } = require('child_process');
let cloudflareProcess = null;
let activeTunnelUrl = null;

function ensureCloudflareTunnel() {
  if (process.env.RENDER_EXTERNAL_URL) return;
  const cfBinary = path.join(__dirname, 'cloudflared.exe');
  if (!fs.existsSync(cfBinary)) return;

  log('[Tunnel] Starting fresh Cloudflare HTTPS tunnel...');
  try {
    cloudflareProcess = spawn(cfBinary, ['tunnel', '--url', `http://localhost:${PORT}`]);
    cloudflareProcess.stderr.on('data', (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && match[0] !== activeTunnelUrl) {
        activeTunnelUrl = match[0];
        log(`[Tunnel] Live Cloudflare URL: ${activeTunnelUrl}`);
        updateServerHeartbeat(activeTunnelUrl);
      }
    });
    cloudflareProcess.on('error', (err) => log(`[Tunnel] Error: ${err.message}`));
  } catch (e) {
    log(`[Tunnel] Spawn failed: ${e.message}`);
  }
}

process.on('exit', () => { if (cloudflareProcess) try { cloudflareProcess.kill(); } catch (e) {} });
process.on('SIGINT', () => { if (cloudflareProcess) try { cloudflareProcess.kill(); } catch (e) {} process.exit(); });

async function updateServerHeartbeat(explicitUrl) {
  try {
    const apiUrl = explicitUrl || activeTunnelUrl || process.env.RENDER_EXTERNAL_URL || process.env.TUNNEL_URL || null;
    const maskParam = apiUrl ? '&updateMask.fieldPaths=apiUrl&updateMask.fieldPaths=tunnelUrl' : '';
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/config/server?updateMask.fieldPaths=lastOnline${maskParam}`;
    const fields = { lastOnline: { stringValue: new Date().toISOString() } };
    if (apiUrl) {
      fields.apiUrl = { stringValue: apiUrl };
      fields.tunnelUrl = { stringValue: apiUrl };
    }
    await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    if (apiUrl) log(`[Heartbeat] Active Server URL: ${apiUrl}`);
  } catch (e) {}
}

app.listen(PORT, '0.0.0.0', async () => {
  log(`[Server] Running on port ${PORT}`);
  ensureCloudflareTunnel();
  // Wait 4 seconds for quicktunnel to obtain new URL from Cloudflare
  setTimeout(async () => {
    await updateServerHeartbeat();
  }, 4000);
  setInterval(() => updateServerHeartbeat(), 30000);
});

