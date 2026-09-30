const { chromium } = require('playwright');

async function main() {
  const context = await chromium.launchPersistentContext('./user_data_testlogin', {
    channel: 'chrome',
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const page = await context.newPage();

  page.on('request', req => {
    if (req.method() === 'POST') {
      console.log('[POST REQUEST]', req.url());
      try {
        console.log('[POST DATA]', req.postData());
      } catch (e) {}
    }
  });

  page.on('response', async res => {
    if (res.request().method() === 'POST' && res.url().includes('login')) {
      console.log('[LOGIN RESPONSE STATUS]', res.status());
      try {
        console.log('[LOGIN RESPONSE BODY]', await res.text());
      } catch (e) {}
    }
  });

  console.log("Navigating to https://supplier.meesho.com/panel/v3/new/root/login...");
  await page.goto('https://supplier.meesho.com/panel/v3/new/root/login');
  await page.waitForTimeout(3000);

  console.log("Filling inputs...");
  await page.fill('input[name="emailOrPhone"]', 'testsupplier@example.com');
  await page.fill('input[name="password"]', 'samplePassword123');
  console.log("Clicking Log in button...");
  await page.click('button:has-text("Log in")');

  await page.waitForTimeout(5000);
  console.log("Finished test.");
  await context.close();
}

main().catch(console.error);
