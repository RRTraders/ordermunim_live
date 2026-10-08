const crypto = require('crypto');
(async () => {
  // Step 1: Get login page to get initial cookies
  const getRes = await fetch('https://supplier.meesho.com/panel/v3/new/root/login', {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-IN,en;q=0.9',
    }
  });
  
  const allCookies = getRes.headers.getSetCookie ? getRes.headers.getSetCookie() : [];
  console.log('Cookies from login page GET:');
  allCookies.forEach(c => console.log(' -', c.split(';')[0]));
  
  const cookieStr = allCookies.map(c => c.split(';')[0]).join('; ');
  const html = await getRes.text();
  
  console.log('Page size:', html.length, 'bytes');
  const titleStart = html.indexOf('<title');
  const titleEnd = html.indexOf('</title>');
  if (titleStart !== -1) console.log('Page title:', html.substring(titleStart, titleEnd + 8));
  
  // Step 2: Try login with those cookies plus a generated browser_uid
  const browserUid = crypto.randomUUID();
  const fullCookieStr = cookieStr + (cookieStr ? '; ' : '') + 'browser_uid=' + browserUid + '; s_b=true';
  
  const loginRes = await fetch('https://supplier.meesho.com/api/container/user/v2-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Origin': 'https://supplier.meesho.com',
      'Referer': 'https://supplier.meesho.com/panel/v3/new/root/login',
      'Cookie': fullCookieStr
    },
    body: JSON.stringify({ email_or_phone: 'test@test.com', password: 'wrongpassword' })
  });
  
  console.log('\nLogin with ak_bmsc+browser_uid cookies:', loginRes.status);
  const body = await loginRes.text();
  console.log('Login response:', body.substring(0, 300));
  
  // Step 3: Try with connect.sid from our SAVED session
  const fs = require('fs');
  const path = require('path');
  const sessionApiFile = path.join(__dirname, 'server', 'sessions', 'MSH-2120', 'api_session.json');
  if (fs.existsSync(sessionApiFile)) {
    const session = JSON.parse(fs.readFileSync(sessionApiFile, 'utf8'));
    console.log('\nSaved session identifier:', session.identifier);
    console.log('Saved cookies (first 200):', session.cookies ? session.cookies.substring(0, 200) : 'none');
    
    // Try OTP fetch with saved cookies
    const otpRes = await fetch('https://supplier.meesho.com/api/fulfillment/returnRto/fetchDeliveryOTPs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://supplier.meesho.com',
        'Referer': 'https://supplier.meesho.com/panel/v3/new/fulfillment/' + session.identifier + '/returns/overview',
        'Cookie': session.cookies
      },
      body: JSON.stringify({ identifier: session.identifier, child_supplier_identifier: null, child_supplier_id: null })
    });
    console.log('\nOTP API with saved MSH-2120 cookies:', otpRes.status);
    const otpBody = await otpRes.text();
    console.log('OTP response:', otpBody.substring(0, 400));
  } else {
    console.log('\nNo saved api_session.json for MSH-2120');
  }
})().catch(e => console.error('ERROR:', e.message));
