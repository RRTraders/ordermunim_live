/**
 * OrdersMunim - Standalone Virtual QZ Tray Desktop Bridge
 * 
 * Runs a zero-dependency WebSocket server on port 8182.
 * Drops directly into any Windows/Mac PC.
 * When Myntra Partner Portal sends print jobs, this bridge automatically saves
 * the Shipping Label and Tax Invoice directly into your PC's "Downloads" folder!
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8182;
const DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads');

const PRINTER_LABEL = 'OrdersMunim Thermal Label Printer';
const PRINTER_INVOICE = 'OrdersMunim Tax Invoice Printer';

console.log('===============================================================');
console.log('   OrdersMunim - Myntra Virtual QZ Tray Bridge (Port 8182)     ');
console.log('   Status: READY & LISTENING                                   ');
console.log(`   PDF Save Directory: ${DOWNLOADS_DIR}                      `);
console.log('===============================================================');
console.log('');
console.log('[INFO] Open Myntra Partner Portal (partners.myntrainfo.com)');
console.log('[INFO] Under Order tab -> "Configure Printer", set printer name to:');
console.log(`       "${PRINTER_LABEL}"`);
console.log('');
console.log('[WAITING] Waiting for Myntra order print commands...');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
  res.end('OrdersMunim Virtual QZ Tray Server is Running on port ' + PORT);
});

server.on('upgrade', (req, socket, head) => {
  const secKey = req.headers['sec-websocket-key'];
  if (!secKey) {
    socket.destroy();
    return;
  }

  const hash = crypto
    .createHash('sha1')
    .update(secKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${hash}`
  ];

  socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');
  console.log('[CONNECTED] Myntra Portal connected to OrdersMunim Virtual QZ Bridge!');

  socket.on('data', (buffer) => {
    try {
      const payload = decodeWebSocketFrame(buffer);
      if (!payload) return;

      const msgStr = payload.toString('utf8');
      const req = JSON.parse(msgStr);
      handleQzRequest(req, socket);
    } catch (err) {
      // Ignore frame fragmentation or parse issues
    }
  });

  socket.on('close', () => {
    console.log('[DISCONNECTED] Myntra Portal connection closed.');
  });
});

function handleQzRequest(req, socket) {
  const call = req.call;
  console.log(`[REQUEST] Myntra called: "${call}"`);

  let responseData = { result: true };

  if (call === 'getPrinters' || call === 'printers.getPrinters') {
    responseData = {
      result: [PRINTER_LABEL, PRINTER_INVOICE, 'OrdersMunim PDF Downloader', 'Microsoft Print to PDF']
    };
  } else if (call === 'findPrinter' || call === 'printers.find') {
    const query = String(req.params?.query || '').toLowerCase();
    responseData = {
      result: query.includes('invoice') ? PRINTER_INVOICE : PRINTER_LABEL
    };
  } else if (call === 'getCertificate' || call === 'security.getCertificate') {
    responseData = {
      result: 'OrdersMunim Trusted Digital Certificate'
    };
  } else if (call === 'print') {
    const printData = req.params?.data;
    const config = req.params?.config || {};
    savePrintJobAsPdf(config, printData);
    responseData = { result: true };
  }

  // Preserve request UID if Myntra sent position/uid
  if (req.position) responseData.position = req.position;
  if (req.uid) responseData.uid = req.uid;

  sendWebSocketFrame(socket, JSON.stringify(responseData));
}

function savePrintJobAsPdf(config, data) {
  if (!data) return;
  const items = Array.isArray(data) ? data : [data];
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}-${String(now.getSeconds()).padStart(2,'0')}`;

  items.forEach((item, index) => {
    const rawData = (typeof item === 'object' && item.data !== undefined) ? item.data : item;
    const printerName = String(config?.printer?.name || config?.printer || '').toLowerCase();
    const isInvoice = printerName.includes('invoice') || (typeof rawData === 'string' && rawData.toLowerCase().includes('invoice'));
    const docType = isInvoice ? 'Tax_Invoice' : 'Shipping_Label';
    const filePath = path.join(DOWNLOADS_DIR, `Myntra_${docType}_${timeStr}_${index + 1}.pdf`);

    if (typeof rawData === 'string') {
      if (rawData.startsWith('JVBERi0x') || /^[A-Za-z0-9+/=]+$/.test(rawData.substring(0, 50))) {
        // Base64 PDF
        const cleanB64 = rawData.replace(/^data:application\/pdf;base64,/, '').trim();
        const buf = Buffer.from(cleanB64, 'base64');
        fs.writeFileSync(filePath, buf);
        console.log(`\n🎉 [SUCCESS] Saved PDF to:\n    --> ${filePath}\n`);
      } else if (rawData.includes('^XA') || rawData.includes('^XZ')) {
        // Raw ZPL label
        const zplPath = path.join(DOWNLOADS_DIR, `Myntra_Label_${timeStr}_${index + 1}.zpl`);
        fs.writeFileSync(zplPath, rawData, 'utf8');
        console.log(`\n🎉 [SUCCESS] Saved ZPL to:\n    --> ${zplPath}\n`);
      }
    }
  });
}

function decodeWebSocketFrame(buffer) {
  if (buffer.length < 2) return null;
  const secondByte = buffer[1];
  const isMasked = (secondByte & 0x80) === 0x80;
  let payloadLength = secondByte & 0x7F;
  let currentOffset = 2;

  if (payloadLength === 126) {
    payloadLength = buffer.readUInt16BE(2);
    currentOffset = 4;
  } else if (payloadLength === 127) {
    // Large payload
    payloadLength = Number(buffer.readBigUInt64BE(2));
    currentOffset = 10;
  }

  let maskingKey = null;
  if (isMasked) {
    maskingKey = buffer.slice(currentOffset, currentOffset + 4);
    currentOffset += 4;
  }

  const payload = buffer.slice(currentOffset, currentOffset + payloadLength);
  if (isMasked && maskingKey) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= maskingKey[i % 4];
    }
  }

  return payload;
}

function sendWebSocketFrame(socket, text) {
  const payloadBuffer = Buffer.from(text, 'utf8');
  const payloadLength = payloadBuffer.length;
  let headerBuffer;

  if (payloadLength <= 125) {
    headerBuffer = Buffer.alloc(2);
    headerBuffer[0] = 0x81; // FIN + text opcode
    headerBuffer[1] = payloadLength;
  } else if (payloadLength <= 65535) {
    headerBuffer = Buffer.alloc(4);
    headerBuffer[0] = 0x81;
    headerBuffer[1] = 126;
    headerBuffer.writeUInt16BE(payloadLength, 2);
  } else {
    headerBuffer = Buffer.alloc(10);
    headerBuffer[0] = 0x81;
    headerBuffer[1] = 127;
    headerBuffer.writeBigUInt64BE(BigInt(payloadLength), 2);
  }

  socket.write(Buffer.concat([headerBuffer, payloadBuffer]));
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[READY] OrdersMunim Virtual QZ Bridge running on http://127.0.0.1:${PORT}`);
});
