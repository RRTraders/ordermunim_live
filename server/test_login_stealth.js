const { chromium } = require('playwright');

(async () => {
  console.log('Testing full login flow with stealth (domcontentloaded)...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 }
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  page.on('request', req => {
    if (req.url().includes('v2-login')) {
      console.log('=== REQUEST URL ===', req.url());
      console.log('=== REQUEST METHOD ===', req.method());
      console.log('=== REQUEST HEADERS ===', JSON.stringify(req.headers(), null, 2));
      console.log('=== REQUEST POST DATA ===', req.postData());
    }
  });

  page.on('response', async res => {
    if (res.url().includes('v2-login') || res.url().includes('login') || res.url().includes('container/user')) {
      console.log('API Response:', res.status(), res.url());
      try {
        const text = await res.text();
        console.log('Body:', text.substring(0, 300));
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://supplier.meesho.com/panel/v3/new/root/login', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('Title:', await page.title());
    await page.waitForSelector('input[name="emailOrPhone"]', { timeout: 15000 });
    console.log('Found email input, typing...');
    await page.locator('input[name="emailOrPhone"]').fill('testfakeuser@gmail.com');
    await page.locator('input[name="password"]').fill('TestPass123!');
    console.log('Clicking login...');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(6000);
    console.log('After submit URL:', page.url());
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
