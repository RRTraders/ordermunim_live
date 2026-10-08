const fs = require('fs');
const path = require('path');

const session = JSON.parse(fs.readFileSync(path.join(__dirname, 'sessions', 'MSH-4705', 'api_session.json'), 'utf8'));
const { identifier, cookies } = session;

async function check(body, extraHeaders = {}) {
  try {
    const res = await fetch('https://supplier.meesho.com/api/container/supplier/getSupplierDetails', {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Origin': 'https://supplier.meesho.com',
        'Referer': `https://supplier.meesho.com/panel/v3/new/fulfillment/${identifier}/returns/overview`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Cookie': cookies,
        'client_type': 'd-web',
        'identifier': identifier,
        'supplier_id': '2244040',
        ...extraHeaders
      },
      body: JSON.stringify(body)
    });
    console.log(`[${res.status}] Body:`, JSON.stringify(body));
    const text = await res.text();
    console.log(text.substring(0, 500));
  } catch (e) {
    console.error(e.message);
  }
}

(async () => {
  await check({ supplier_identifier: identifier, client_type: 'd-web' });
  await check({ supplier_id: 2244040, client_type: 'd-web' });
  await check({ az_identifier: identifier, client_type: 'd-web' });
  await check({ identifier: identifier, child_supplier_identifier: null, child_supplier_id: null, client_type: 'd-web' });
  await check({ identifier, client_type: 'd-web' }, { 'identifier': identifier });
})();
