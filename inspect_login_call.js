const { chromium } = require('./server/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  
  page.on('request', req => {
    if (req.url().includes('v2-login')) {
      console.log('=== REQUEST URL ===');
      console.log(req.url());
      console.log('=== METHOD ===');
      console.log(req.method());
      console.log('=== HEADERS ===');
      console.log(JSON.stringify(req.headers(), null, 2));
      console.log('=== POST DATA ===');
      console.log(req.postData());
    }
  });

  await page.goto('https://supplier.meesho.com/panel/v3/new/root/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="emailOrPhone"]', { timeout: 15000 });
  await page.locator('input[name="emailOrPhone"]').fill('testfakeuser@gmail.com');
  await page.locator('input[name="password"]').fill('TestPass123!');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(4000);
  await browser.close();
})();
