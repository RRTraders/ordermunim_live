/**
 * OrdersMunim - Myntra Virtual QZ Tray Interceptor
 * 
 * Bypasses QZ Tray DEMO and physical printer requirements on Myntra Partner Portal.
 * Automatically captures shipping label and invoice print streams and saves them as PDF files.
 */
(function() {
  'use strict';

  if (window.__ordersmunim_qz_installed__) return;
  window.__ordersmunim_qz_installed__ = true;

  console.log('%c[OrdersMunim]%c Virtual QZ Tray Bridge Active! Myntra labels & invoices will download as PDF directly.', 'color:#06b6d4;font-weight:bold;', 'color:#10b981;');

  const PRINTER_LABEL = 'OrdersMunim Thermal Label Printer';
  const PRINTER_INVOICE = 'OrdersMunim Tax Invoice Printer';

  function showNotification(title, message, isSuccess = true) {
    try {
      const banner = document.createElement('div');
      banner.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #090d16;
        color: #ffffff;
        border: 1.5px solid ${isSuccess ? '#10b981' : '#f59e0b'};
        padding: 14px 20px;
        border-radius: 14px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        box-shadow: 0 16px 36px rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: omFadeIn 0.3s ease-out;
      `;
      banner.innerHTML = `
        <div style="width:32px;height:32px;border-radius:10px;background:${isSuccess ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'};display:flex;align-items:center;justify-content:center;color:${isSuccess ? '#10b981' : '#f59e0b'};font-weight:bold;font-size:16px;">
          ${isSuccess ? '✓' : 'ℹ'}
        </div>
        <div>
          <div style="font-weight:bold;color:#f8fafc;font-size:13px;">${title}</div>
          <div style="color:#94a3b8;font-size:11.5px;margin-top:2px;">${message}</div>
        </div>
      `;
      document.body.appendChild(banner);
      setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transition = 'opacity 0.4s ease';
        setTimeout(() => banner.remove(), 400);
      }, 4500);
    } catch (e) {
      console.warn('[OrdersMunim Notification Error]:', e);
    }
  }

  function downloadPdfFromBase64(b64, filename) {
    try {
      const cleanB64 = b64.replace(/^data:application\/pdf;base64,/, '').trim();
      const byteCharacters = atob(cleanB64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      triggerFileDownload(blob, filename);
    } catch (err) {
      console.error('[OrdersMunim] Error decoding base64 PDF:', err);
    }
  }

  function downloadPdfFromUrl(url, filename) {
    try {
      fetch(url)
        .then(res => res.blob())
        .then(blob => triggerFileDownload(blob, filename))
        .catch(() => {
          // Fallback direct link
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => a.remove(), 1000);
        });
    } catch (err) {
      console.error('[OrdersMunim] URL download error:', err);
    }
  }

  function triggerFileDownload(blob, filename) {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(blobUrl);
    }, 1500);
    showNotification('PDF Downloaded!', `${filename} saved successfully.`);
  }

  function processPrintItem(item, config, index) {
    const rawData = (typeof item === 'object' && item.data !== undefined) ? item.data : item;
    const format = (typeof item === 'object' && item.format) ? item.format : '';
    const now = new Date();
    const timeStr = `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
    const printerName = String(config?.printer?.name || config?.printer || '').toLowerCase();
    
    let isInvoice = printerName.includes('invoice');
    if (!isInvoice && typeof rawData === 'string' && (rawData.toLowerCase().includes('tax invoice') || rawData.toLowerCase().includes('invoice'))) {
      isInvoice = true;
    }
    
    const docType = isInvoice ? 'Tax_Invoice' : 'Shipping_Label';
    const filename = `Myntra_${docType}_${timeStr}_${index + 1}.pdf`;

    if (format === 'base64' || (typeof rawData === 'string' && rawData.startsWith('JVBERi0x'))) {
      downloadPdfFromBase64(rawData, filename);
      return true;
    }
    
    if (format === 'file' || (typeof rawData === 'string' && (rawData.startsWith('http://') || rawData.startsWith('https://') || rawData.startsWith('blob:')))) {
      downloadPdfFromUrl(rawData, filename);
      return true;
    }

    if (typeof rawData === 'string' && (rawData.includes('^XA') || rawData.includes('^XZ'))) {
      // Raw ZPL label command
      console.log('[OrdersMunim] Raw ZPL Label captured');
      const blob = new Blob([rawData], { type: 'text/plain;charset=utf-8' });
      triggerFileDownload(blob, `Myntra_ZPL_Label_${timeStr}_${index + 1}.zpl`);
      return true;
    }

    if (typeof rawData === 'string' && rawData.length > 100) {
      // Attempt base64 fallback
      try {
        downloadPdfFromBase64(rawData, filename);
        return true;
      } catch {}
    }

    return false;
  }

  // ================= 1. DEFINE VIRTUAL WINDOW.QZ =================
  window.qz = {
    version: '2.2.4',
    websocket: {
      connect: function() {
        console.log('[OrdersMunim QZ] connect() -> Virtual QZ connected!');
        return Promise.resolve();
      },
      disconnect: function() {
        return Promise.resolve();
      },
      isActive: function() {
        return true;
      },
      getConnection: function() {
        return { status: 'Connected', host: 'localhost', port: 8182 };
      }
    },
    printers: {
      find: function(query) {
        console.log('[OrdersMunim QZ] findPrinter query:', query);
        const q = String(query || '').toLowerCase();
        if (q.includes('invoice')) return Promise.resolve(PRINTER_INVOICE);
        return Promise.resolve(PRINTER_LABEL);
      },
      getDefault: function() {
        return Promise.resolve(PRINTER_LABEL);
      },
      getPrinters: function() {
        return Promise.resolve([
          PRINTER_LABEL,
          PRINTER_INVOICE,
          'OrdersMunim PDF Downloader',
          'Microsoft Print to PDF'
        ]);
      }
    },
    configs: {
      create: function(printer, opts) {
        return {
          printer: printer || PRINTER_LABEL,
          options: opts || {}
        };
      }
    },
    print: function(config, data) {
      console.log('[OrdersMunim QZ] Intercepted print call! Config:', config, 'Data:', data);
      showNotification('Printing Intercepted', 'Extracting document into clean PDF...', false);

      const items = Array.isArray(data) ? data : [data];
      let handledCount = 0;

      items.forEach((item, idx) => {
        if (processPrintItem(item, config, idx)) {
          handledCount++;
        }
      });

      if (handledCount === 0) {
        showNotification('Print Captured', 'Received print command. Order marked as packed.', true);
      }

      return Promise.resolve({
        success: true,
        message: 'Printed via OrdersMunim Virtual Downloader'
      });
    }
  };

  // ================= 2. INTERCEPT RAW WEBSOCKET (ws://localhost:8182) =================
  const NativeWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    const urlStr = String(url || '');
    if (urlStr.includes(':8182') || urlStr.includes(':8181')) {
      console.log('[OrdersMunim] Mocking QZ Tray WebSocket connection to:', urlStr);
      
      const fakeWs = {
        readyState: 1, // WebSocket.OPEN
        url: urlStr,
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        send: function(msg) {
          try {
            const req = JSON.parse(msg);
            console.log('[OrdersMunim WebSocket] Intercepted request:', req);
            
            setTimeout(() => {
              let res = { result: true };
              if (req.call === 'getPrinters') {
                res = { result: [PRINTER_LABEL, PRINTER_INVOICE, 'OrdersMunim PDF Downloader'] };
              } else if (req.call === 'findPrinter') {
                const q = String(req.params?.query || '').toLowerCase();
                res = { result: q.includes('invoice') ? PRINTER_INVOICE : PRINTER_LABEL };
              } else if (req.call === 'getCertificate') {
                res = { result: 'OrdersMunim Trusted Digital Certificate' };
              } else if (req.call === 'print') {
                if (req.params?.data) {
                  window.qz.print(req.params.config || {}, req.params.data);
                }
                res = { result: true };
              }

              if (typeof fakeWs.onmessage === 'function') {
                fakeWs.onmessage({ data: JSON.stringify(res) });
              }
            }, 60);
          } catch (e) {
            console.warn('[OrdersMunim WebSocket parse error]:', e);
          }
        },
        close: function() {
          if (typeof fakeWs.onclose === 'function') fakeWs.onclose();
        },
        addEventListener: function(type, listener) {
          if (type === 'message') fakeWs.onmessage = listener;
          if (type === 'open') fakeWs.onopen = listener;
        },
        removeEventListener: function() {}
      };

      setTimeout(() => {
        if (typeof fakeWs.onopen === 'function') fakeWs.onopen({ type: 'open' });
      }, 50);

      return fakeWs;
    }

    return new NativeWebSocket(url, protocols);
  };

  // Keep prototype chain
  window.WebSocket.prototype = NativeWebSocket.prototype;
  window.WebSocket.CONNECTING = NativeWebSocket.CONNECTING;
  window.WebSocket.OPEN = NativeWebSocket.OPEN;
  window.WebSocket.CLOSING = NativeWebSocket.CLOSING;
  window.WebSocket.CLOSED = NativeWebSocket.CLOSED;

})();
