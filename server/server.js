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

// Helper to push updates to Firestore
async function updateFirestoreAccount(syncKey, data) {
  try {
    const fieldsToUpdate = [];
    const fieldsObj = {};

    if (data.storeName !== undefined) {
      fieldsToUpdate.push('storeName');
      fieldsObj.storeName = { stringValue: data.storeName };
    }
    if (data.otp !== undefined) {
      fieldsToUpdate.push('currentOtp');
      fieldsObj.currentOtp = { stringValue: data.otp };
    }
    if (data.courier !== undefined) {
      fieldsToUpdate.push('courier');
      fieldsObj.courier = { stringValue: data.courier };
    }
    if (data.handoverCount !== undefined) {
      fieldsToUpdate.push('handoverCount');
      fieldsObj.handoverCount = { integerValue: (data.handoverCount || 0).toString() };
    }
    if (data.dateTime !== undefined) {
      fieldsToUpdate.push('dateTime');
      fieldsObj.dateTime = { stringValue: data.dateTime };
    }
    if (data.identifier !== undefined) {
      fieldsToUpdate.push('identifier');
      fieldsObj.identifier = { stringValue: data.identifier };
    }
    if (data.status !== undefined) {
      fieldsToUpdate.push('status');
      fieldsObj.status = { stringValue: data.status };
    }
    fieldsToUpdate.push('lastUpdated');
    fieldsObj.lastUpdated = { stringValue: new Date().toISOString() };

    const maskParams = fieldsToUpdate.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/accounts/${encodeURIComponent(syncKey)}?${maskParams}`;
    
    const payload = { fields: fieldsObj };

    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log(`[Firestore] Updated ${syncKey}: status=${res.status}`);
  } catch (err) {
    console.error("[Firestore] Update error:", err.message);
  }
}

// Function to log in to Meesho and extract return OTP
async function loginAndExtractMeesho(syncKey, email, password, storeName, userId) {
  console.log(`\n========================================`);
  console.log(`[Meesho Worker] Starting login for: ${storeName} (${email})`);
  console.log(`========================================`);

  const sessionDir = path.join(__dirname, 'sessions', syncKey);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  let context;
  try {
    context = await chromium.launchPersistentContext(sessionDir, {
      channel: 'chrome',
      headless: false, // Runs visible on your machine so you see the login action
      viewport: { width: 1280, height: 800 },
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
        '--no-sandbox'
      ]
    });

    const page = await context.newPage();
    console.log("[Meesho Worker] Navigating to https://supplier.meesho.com/panel/v3/new/root/login...");
    await page.goto('https://supplier.meesho.com/panel/v3/new/root/login', { waitUntil: 'domcontentloaded' });
    
    // Give page time to load inputs
    await page.waitForTimeout(3000);

    // Check if already logged in
    if (!page.url().includes('login')) {
      console.log("[Meesho Worker] Already logged in with active session!");
    } else {
      console.log(`[Meesho Worker] Entering credentials for ${email}...`);
      
      // Fill emailOrPhone and password
      const emailInput = page.locator('input[name="emailOrPhone"], input[type="text"]').first();
      const passwordInput = page.locator('input[name="password"], input[type="password"]').first();

      if (await emailInput.count() > 0) {
        await emailInput.fill(email);
        await page.waitForTimeout(300);

        if (await passwordInput.count() > 0) {
          await passwordInput.fill(password);
          await page.waitForTimeout(300);

          const submitBtn = page.locator('button:has-text("Log in"), button[type="submit"]').first();
          if (await submitBtn.count() > 0) {
            console.log("[Meesho Worker] Submitting login form...");
            await submitBtn.click();
            console.log("[Meesho Worker] Waiting 6 seconds for login authorization...");
            await page.waitForTimeout(6000);
          }
        }
      }
    }

    const currentUrl = page.url();
    console.log(`[Meesho Worker] Current URL after login attempt: ${currentUrl}`);

    if (currentUrl.includes('login') && !currentUrl.includes('growth') && !currentUrl.includes('fulfillment')) {
      console.log("[Meesho Worker] Login failed or still on login page.");
      return { success: false, error: "Login failed. Please check your Meesho email and password." };
    }

    // 1. Extract Real Store Name and Identifier from Authenticated Page
    const detectedIdentifier = (currentUrl.match(/(?:growth|fulfillment)\/([a-zA-Z0-9]+)/) || [])[1] || '1ydxc';
    
    const detectedStoreName = await page.evaluate(() => {
      // Look for "Welcome back, StoreName"
      const h1 = document.querySelector('h1');
      if (h1 && h1.innerText.includes('Welcome back')) {
        return h1.innerText.replace('Welcome back,', '').trim();
      }
      // Or profile element in header
      const headerNames = Array.from(document.querySelectorAll('header *, [class*="supplier" i] *'))
        .map(e => e.innerText ? e.innerText.trim() : '')
        .filter(t => t.length > 2 && t.length < 35 && !t.includes('\n'));
      if (headerNames.length > 0) return headerNames[0];

      return document.body.innerText.split('\n')[0].trim();
    });

    console.log(`[Meesho Worker] Logged In Successfully! Real Store: "${detectedStoreName}", Identifier: "${detectedIdentifier}"`);

    // Verify if this store is already linked in Firestore (prevent duplicate accounts across different users)
    try {
      const checkUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/accounts`;
      const chkRes = await fetch(checkUrl);
      const chkData = await chkRes.json();
      if (chkData.documents) {
        for (const doc of chkData.documents) {
          const docKey = doc.name.split('/').pop();
          if (docKey === syncKey) continue;
          const f = doc.fields || {};
          const existingName = f.storeName?.stringValue || '';
          const existingEmail = f.email?.stringValue || '';
          const existingIdent = f.identifier?.stringValue || '';
          const existingUser = f.userId?.stringValue || '';

          const matchName = existingName && detectedStoreName && existingName.trim().toLowerCase() === detectedStoreName.trim().toLowerCase();
          const matchEmail = existingEmail && email && existingEmail.trim().toLowerCase() === email.trim().toLowerCase();
          const matchIdent = existingIdent && detectedIdentifier && existingIdent === detectedIdentifier;

          if (matchName || matchEmail || matchIdent) {
            // Case 1: If old store was under Admin UID (vJID6QrALTf4ybiDP5TuLvNkyN63), it was a test store -> remove it
            if (existingUser === 'vJID6QrALTf4ybiDP5TuLvNkyN63') {
              console.log(`[Meesho Worker] Removing old admin test store: ${docKey}`);
              fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/accounts/${docKey}`, { method: 'DELETE' }).catch(() => {});
              continue;
            }

            // Case 2: If store belongs to the SAME user, they are updating / re-connecting their store -> allow
            if (userId && existingUser === userId) {
              console.log(`[Meesho Worker] Store ${docKey} already belongs to user ${userId}, updating...`);
              continue;
            }

            // Case 3: Belongs to another client
            console.log(`[Meesho Worker] DUPLICATE REJECTED: Store "${detectedStoreName}" already linked by another client!`);
            if (context) await context.close().catch(() => {});
            try {
              fs.rmSync(sessionDir, { recursive: true, force: true });
            } catch(e) {}
            return { 
              success: false, 
              duplicate: true,
              error: `Store "${detectedStoreName}" is already linked by another client.` 
            };
          }
        }
      }
    } catch(chkErr) {
      console.error("[Meesho Worker] Error checking duplicates:", chkErr.message);
    }

    // Save metadata for session
    try {
      fs.writeFileSync(path.join(sessionDir, 'meta.json'), JSON.stringify({ identifier: detectedIdentifier, storeName: detectedStoreName }));
    } catch(e) {}

    // 2. Navigate Directly to the Returns Overview Page
    const returnsUrl = `https://supplier.meesho.com/panel/v3/new/fulfillment/${detectedIdentifier}/returns/overview`;
    console.log(`[Meesho Worker] Navigating to Returns page: ${returnsUrl}...`);
    await page.goto(returnsUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(6000);
    await page.screenshot({ path: path.join(__dirname, 'returns_page.png') });

    // 3. Extract the Live Return Handover OTP and Courier
    const extracted = await page.evaluate(async (ident) => {
      let otp = "----";
      let courier = "No active return";
      let handoverCount = 0;
      let dateTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // First check DOM for live OTP banner
      const otpNode = Array.from(document.querySelectorAll('*')).find(e => 
        e.innerText && /OTP:/i.test(e.innerText) && /\b\d{4,6}\b/.test(e.innerText)
      );

      if (otpNode) {
        const text = otpNode.innerText;
        const partnerMatch = text.match(/([a-zA-Z]+)\s+OTP:/i);
        const otpMatch = text.match(/\b\d{4,6}\b/);
        const dateMatch = text.match(/\d{1,2}\s+[a-zA-Z]+,\s*\d{1,2}:\d{2}\s*(?:AM|PM)/i);
        
        if (partnerMatch) courier = partnerMatch[1];
        if (otpMatch) otp = otpMatch[0];
        if (dateMatch) dateTime = dateMatch[0];

        const countNode = Array.from(document.querySelectorAll('*')).find(e => 
          e.innerText && /Total\s+Handover\s+Count\s*:\s*\d+/i.test(e.innerText)
        );
        if (countNode) {
          const cMatch = countNode.innerText.match(/Total\s+Handover\s+Count\s*:\s*(\d+)/i);
          if (cMatch) handoverCount = parseInt(cMatch[1], 10);
        }
      }

      // Also try calling the internal API from the returns page
      try {
        const apiRes = await fetch('/api/fulfillment/returnRto/fetchDeliveryOTPs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: ident, child_supplier_identifier: null, child_supplier_id: null })
        });
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.supplier_delivery_otp && json.supplier_delivery_otp.length > 0) {
            const item = json.supplier_delivery_otp[0];
            otp = item.otp || otp;
            courier = item.carrier_details?.name || item.carrier_name || courier;
            handoverCount = item.delivery_shipment_details?.total_shipment_count || item.count || handoverCount;
            if (item.otp_expiry_timestamp) {
              dateTime = new Date(item.otp_expiry_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
          }
        }
      } catch (e) {}

      return {
        otp,
        courier,
        handoverCount,
        dateTime
      };
    }, detectedIdentifier);

    console.log("[Meesho Worker] Extracted Live OTP Result:", extracted);

    await updateFirestoreAccount(syncKey, {
      storeName: detectedStoreName,
      identifier: detectedIdentifier,
      otp: extracted.otp,
      courier: extracted.courier,
      handoverCount: extracted.handoverCount,
      dateTime: extracted.dateTime,
      status: "live"
    });

    return {
      success: true,
      storeName: detectedStoreName,
      identifier: detectedIdentifier,
      otp: extracted.otp,
      courier: extracted.courier,
      handoverCount: extracted.handoverCount,
      dateTime: extracted.dateTime
    };

  } catch (err) {
    console.error("[Meesho Worker] Error during login flow:", err);
    return { success: false, error: err.message };
  } finally {
    if (context) {
      // Keep session saved, close window after sync
      await context.close().catch(() => {});
    }
  }
}

// Helper to re-check returns for an already logged-in session
async function checkReturnsForSession(syncKey) {
  const sessionDir = path.join(__dirname, 'sessions', syncKey);
  if (!fs.existsSync(sessionDir)) return null;

  let identifier = null;
  const metaPath = path.join(sessionDir, 'meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (meta.identifier) identifier = meta.identifier;
    } catch (e) {}
  }
  if (!identifier) {
    try {
      const res = await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/accounts/${syncKey}`);
      if (res.ok) {
        const d = await res.json();
        identifier = d.fields?.identifier?.stringValue;
      }
    } catch(e) {}
  }

  if (!identifier) {
    console.warn(`[Auto-Sync] No identifier found in session or Firestore for ${syncKey}, skipping`);
    return null;
  }

  console.log(`[Auto-Sync] Checking returns for ${syncKey} (identifier: ${identifier})...`);
  let context;
  try {
    context = await chromium.launchPersistentContext(sessionDir, {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1280, height: 800 },
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
        '--no-sandbox'
      ]
    });

    const page = await context.newPage();
    const returnsUrl = `https://supplier.meesho.com/panel/v3/new/fulfillment/${identifier}/returns/overview`;
    await page.goto(returnsUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(6000);

    const title = await page.title();
    const currentUrl = page.url();

    if (title.includes('Access Denied') || currentUrl.includes('/root/login')) {
      console.warn(`[Auto-Sync] Warning: Page redirected or denied for ${syncKey} (URL: ${currentUrl}). Skipping update to protect data.`);
      return null;
    }

    const extracted = await page.evaluate(async (ident) => {
      let otp = "----";
      let courier = "No active return";
      let handoverCount = 0;
      let dateTime = "Checked at " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const otpNode = Array.from(document.querySelectorAll('*')).find(e => 
        e.innerText && /OTP:/i.test(e.innerText) && /\b\d{4,6}\b/.test(e.innerText)
      );

      if (otpNode) {
        const text = otpNode.innerText;
        const partnerMatch = text.match(/([a-zA-Z]+)\s+OTP:/i);
        const otpMatch = text.match(/\b\d{4,6}\b/);
        const dateMatch = text.match(/\d{1,2}\s+[a-zA-Z]+,\s*\d{1,2}:\d{2}\s*(?:AM|PM)/i);
        
        if (partnerMatch) courier = partnerMatch[1];
        if (otpMatch) otp = otpMatch[0];
        if (dateMatch) dateTime = dateMatch[0];

        const countNode = Array.from(document.querySelectorAll('*')).find(e => 
          e.innerText && /Total\s+Handover\s+Count\s*:\s*\d+/i.test(e.innerText)
        );
        if (countNode) {
          const cMatch = countNode.innerText.match(/Total\s+Handover\s+Count\s*:\s*(\d+)/i);
          if (cMatch) handoverCount = parseInt(cMatch[1], 10);
        }
      }

      // Also try calling the internal API from the returns page
      try {
        const apiRes = await fetch('/api/fulfillment/returnRto/fetchDeliveryOTPs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: ident, child_supplier_identifier: null, child_supplier_id: null })
        });
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.supplier_delivery_otp && json.supplier_delivery_otp.length > 0) {
            const item = json.supplier_delivery_otp[0];
            otp = item.otp || otp;
            courier = item.carrier_details?.name || item.carrier_name || courier;
            handoverCount = item.delivery_shipment_details?.total_shipment_count || item.count || handoverCount;
            if (item.otp_expiry_timestamp) {
              dateTime = new Date(item.otp_expiry_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
          }
        }
      } catch (e) {}

      return { otp, courier, handoverCount, dateTime };
    }, identifier);

    console.log(`[Auto-Sync] Result for ${syncKey}:`, extracted);

    await updateFirestoreAccount(syncKey, {
      otp: extracted.otp,
      courier: extracted.courier,
      handoverCount: extracted.handoverCount,
      dateTime: extracted.dateTime,
      status: "live"
    });

    return extracted;
  } catch (err) {
    console.error(`[Auto-Sync] Error checking ${syncKey}:`, err.message);
    return null;
  } finally {
    if (context) await context.close().catch(() => {});
  }
}

// Background Auto-Refresh every 3 minutes for all active connected accounts in Firestore
setInterval(async () => {
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/accounts`);
    const data = await res.json();
    if (data.documents) {
      for (const doc of data.documents) {
        const key = doc.name.split('/').pop();
        if (key.startsWith('MSH-')) {
          await checkReturnsForSession(key);
        }
      }
    }
  } catch (e) {
    console.error("[Auto-Sync] Error during interval fetch:", e.message);
  }
}, 3 * 60 * 1000);

// DELETE /api/meesho/session/:syncKey (Clean up session folder on delete)
app.delete('/api/meesho/session/:syncKey', (req, res) => {
  const { syncKey } = req.params;
  const sessionDir = path.join(__dirname, 'sessions', syncKey);
  if (fs.existsSync(sessionDir)) {
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log(`[Session] Deleted session folder for ${syncKey}`);
    } catch (e) {
      console.error(`[Session] Error deleting session for ${syncKey}:`, e.message);
    }
  }
  res.json({ success: true });
});

// POST /api/meesho/refresh/:syncKey
app.post('/api/meesho/refresh/:syncKey', async (req, res) => {
  const { syncKey } = req.params;
  const result = await checkReturnsForSession(syncKey);
  if (result) {
    return res.json({ success: true, ...result });
  } else {
    return res.status(500).json({ error: "Failed to refresh OTP" });
  }
});

// POST /api/meesho/login
app.post('/api/meesho/login', async (req, res) => {
  const { userId, syncKey, storeName, email, password } = req.body;
  if (!email || !password || !syncKey) {
    return res.status(400).json({ error: "Missing email, password, or syncKey" });
  }

  try {
    const result = await loginAndExtractMeesho(syncKey, email, password, storeName, userId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: system-ui, sans-serif; text-align: center; padding: 60px 20px; background: #090d16; color: #ffffff; min-height: 100vh; box-sizing: border-box;">
      <div style="max-width: 500px; margin: 0 auto; background: #131c2e; border: 1px solid #1e293b; padding: 32px; rounded: 24px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #0284c7, #2563eb); border-radius: 16px; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center; font-size: 30px;">
          📦
        </div>
        <h1 style="color: #38bdf8; font-size: 24px; margin-bottom: 8px;">Meesho OTP Cloud Worker</h1>
        <p style="color: #10b981; font-weight: bold; font-size: 14px; margin: 8px 0;">🟢 Status: 100% Online & Live on Render</p>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 24px;">Backend API is actively processing automated Meesho logins and syncing Return Handover OTPs in real-time.</p>
        <a href="https://meesho-otp-live.web.app" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 14px;">Open Web App Dashboard</a>
      </div>
    </div>
  `);
});

app.get('/api/health', (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

async function updateServerHeartbeat(apiUrl) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/config/server?updateMask.fieldPaths=lastOnline${apiUrl ? '&updateMask.fieldPaths=apiUrl' : ''}`;
    const fields = {
      lastOnline: { stringValue: new Date().toISOString() }
    };
    if (apiUrl) {
      fields.apiUrl = { stringValue: apiUrl };
    }
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
  } catch (err) {
    // Silent catch
  }
}

const DEFAULT_API_URL = process.env.TUNNEL_URL || 'https://driving-psp-titanium-announce.trycloudflare.com';

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Meesho OTP Server] Backend running on port ${PORT}`);
  const publicUrl = process.env.RENDER_EXTERNAL_URL || process.env.TUNNEL_URL || null;
  if (publicUrl) {
    console.log(`[Meesho OTP Server] Publishing public API URL: ${publicUrl}`);
    updateServerHeartbeat(publicUrl);
  } else {
    updateServerHeartbeat();
  }
  setInterval(() => {
    updateServerHeartbeat(publicUrl);
  }, 60000);
});

