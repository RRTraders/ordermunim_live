const https = require('https');
const zlib = require('zlib');

const postData = JSON.stringify({
  email: 'test@test.com',
  password: 'testpass123'
});

const options = {
  hostname: 'supplier.meesho.com',
  port: 443,
  path: '/api/container/user/v2-login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36',
    'Origin': 'https://supplier.meesho.com',
    'Referer': 'https://supplier.meesho.com/panel/v3/new/root/login',
    'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('--- Response Headers ---');
  console.log(JSON.stringify(res.headers, null, 2));
  
  let chunks = [];
  res.on('data', (chunk) => { chunks.push(chunk); });
  res.on('end', () => {
    const raw = Buffer.concat(chunks);
    const encoding = res.headers['content-encoding'];
    if (encoding === 'gzip') {
      zlib.gunzip(raw, (err, decoded) => {
        console.log('Body:', decoded ? decoded.toString().substring(0, 500) : 'decode error');
      });
    } else {
      console.log('Body:', raw.toString().substring(0, 500));
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(postData);
req.end();
