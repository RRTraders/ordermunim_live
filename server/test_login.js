const { chromium } = require('playwright');

async function test() {
  console.log("Launching browser...");
  const context = await chromium.launchPersistentContext('./user_data', {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const page = await context.newPage();
  await page.goto('https://supplier.meesho.com/panel/v3/new/login');
  
  console.log("Navigated. Waiting up to 15 seconds to see elements...");
  for (let i = 0; i < 15; i++) {
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input')).map(input => ({
        type: input.type,
        placeholder: input.placeholder,
        name: input.name,
        id: input.id
      }));
    });
    if (inputs.length > 0) {
      console.log(`[FOUND INPUTS at ${i}s]:`, JSON.stringify(inputs));
      break;
    }
    await page.waitForTimeout(1000);
  }

  const finalUrl = page.url();
  console.log("Final URL:", finalUrl);
  await context.close();
}

test();
