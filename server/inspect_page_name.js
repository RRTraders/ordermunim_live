const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const sessionDir = path.join(__dirname, 'sessions', 'MSH-4705', 'browser');
  const context = await chromium.launchPersistentContext(sessionDir, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1366, height: 768 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox'
    ]
  });

  const page = await context.newPage();
  
  // Listen to all network requests
  const apiCalls = [];
  page.on('response', async res => {
    const u = res.url();
    if (u.includes('supplier') || u.includes('profile') || u.includes('user') || u.includes('meesho.com/api')) {
      try {
        const text = await res.text();
        apiCalls.push({ url: u, text: text.substring(0, 300) });
      } catch (e) {}
    }
  });

  console.log("Navigating to returns page...");
  await page.goto('https://supplier.meesho.com/panel/v3/new/fulfillment/1ydxc/returns/overview', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  // Take screenshot
  await page.screenshot({ path: path.join(__dirname, 'live_returns_page.png') });
  console.log("Saved live_returns_page.png");

  // Get all text content on the page
  const textInfo = await page.evaluate(() => {
    // Check all elements with text
    const elements = Array.from(document.querySelectorAll('header *, nav *, [class*="sidebar" i] *, [class*="profile" i] *, [class*="supplier" i] *, [class*="store" i] *'));
    const texts = elements.map(e => e.innerText ? e.innerText.trim() : '').filter(t => t.length > 2 && t.length < 50);
    return Array.from(new Set(texts));
  });

  console.log("PAGE TEXTS FOUND:");
  console.log(JSON.stringify(textInfo, null, 2));

  console.log("\nAPI CALLS MADE:");
  apiCalls.forEach(c => console.log(c.url, c.text));

  await context.close();
})();
