const https = require('https');
const zlib = require('zlib');
const crypto = require('crypto');

function doRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        const enc = res.headers['content-encoding'];
        const decode = (buf) => {
          try { return JSON.parse(buf.toString()); } catch { return buf.toString().substring(0, 500); }
        };
        if (enc === 'gzip' || enc === 'br') {
          const fn = enc === 'gzip' ? zlib.gunzip : zlib.brotliDecompress;
          fn(raw, (err, d) => resolve({ status: res.statusCode, headers: res.headers, body: decode(d || raw) }));
        } else {
          resolve({ status: res.statusCode, headers: res.headers, body: decode(raw) });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testDirectLogin(email, password) {
  console.log('Testing Exact Web Payload via Pure Node.js REST API...');
  console.log('Email:', email);

  const instanceId = crypto.randomBytes(16).toString('base64url');
  const browserId = Buffer.from(`${Date.now()} + ${Math.floor(Math.random() * 1000)} + meesho_otp`).toString('base64');

  const postData = JSON.stringify({
    email: email,
    password: password,
    device_id: email,
    instance: instanceId
  });

  const result = await doRequest({
    hostname: 'supplier.meesho.com',
    port: 443,
    path: '/api/container/user/v2-login',
    method: 'POST',
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'accept': 'application/json, text/plain, */*',
      'identifier': 'login',
      'client-type': 'd-web',
      'client-package-version': '1.0.41',
      'browser-id': browserId,
      'sec-ch-ua-platform': '"Windows"',
      'sec-ch-ua': '"Chromium";v="133", "Google Chrome";v="133", "Not A(Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      'origin': 'https://supplier.meesho.com',
      'referer': 'https://supplier.meesho.com/panel/v3/new/root/login',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'content-length': Buffer.byteLength(postData)
    }
  }, postData);

  console.log('\n=== Direct API Response ===');
  console.log('Status:', result.status);
  console.log('Body:', JSON.stringify(result.body, null, 2));

  const cookies = [];
  const setCookieHeader = result.headers['set-cookie'] || [];
  setCookieHeader.forEach(c => cookies.push(c.split(';')[0]));
  console.log('Cookies received:', cookies.length);
  cookies.forEach(c => console.log(' -', c.substring(0, 60)));

  return { status: result.status, body: result.body, cookies };
}

const EMAIL = process.argv[2] || 'testfakeuser@gmail.com';
const PASS = process.argv[3] || 'TestPass123!';
testDirectLogin(EMAIL, PASS).catch(console.error);
