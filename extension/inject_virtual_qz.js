// OrdersMunim - In-Page Virtual QZ Tray Engine
// Injected into MAIN world on Myntra Partner Portals (mdirect.myntrainfo.com, partners.myntrainfo.com)
// Emulates QZ Tray WebSocket (localhost:8182) to intercept print jobs and generate direct PDF downloads without QZ errors.

(function() {
  'use strict';

  // State
  let isSubscriptionActive = false;
  let licenseErrorMsg = '';

  // Listen for license updates from Content Script
  window.addEventListener('__ORDERSMUNIM_LICENSE_UPDATE__', function(e) {
    if (e.detail) {
      isSubscriptionActive = !!e.detail.active;
      licenseErrorMsg = e.detail.message || '';
      updateFloatingBadge();
    }
  });

  // Request license status from content script
  window.dispatchEvent(new CustomEvent('__ORDERSMUNIM_REQUEST_LICENSE__'));

  // Floating Badge UI
  let badgeEl = null;
  function updateFloatingBadge() {
    if (!badgeEl) {
      badgeEl = document.createElement('div');
      badgeEl.id = 'ordersmunim-floating-badge';
      badgeEl.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #0f172a;
        color: #fff;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 10px 14px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 12px;
        user-select: none;
        transition: all 0.2s ease;
      `;
      document.documentElement.appendChild(badgeEl);
    }

    if (isSubscriptionActive) {
      badgeEl.style.borderColor = '#10b981';
      badgeEl.innerHTML = `
        <div style="width: 10px; height: 10px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></div>
        <div>
          <div style="font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 4px;">
            OrdersMunim Virtual QZ <span style="color: #34d399; font-size: 10px; background: rgba(16,185,129,0.2); padding: 1px 6px; border-radius: 6px;">READY</span>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Print jobs will download as PDF directly (No QZ Tray needed)</div>
        </div>
      `;
    } else {
      badgeEl.style.borderColor = '#ef4444';
      badgeEl.innerHTML = `
        <div style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 8px #ef4444;"></div>
        <div>
          <div style="font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 4px;">
            OrdersMunim <span style="color: #f87171; font-size: 10px; background: rgba(239,68,68,0.2); padding: 1px 6px; border-radius: 6px;">SUBSCRIPTION EXPIRED</span>
          </div>
          <div style="font-size: 10px; color: #fca5a5; margin-top: 2px;">${licenseErrorMsg || 'Please log in or renew plan on ordermunim.web.app'}</div>
        </div>
      `;
    }
  }

  // Hide Myntra QZ Error banners automatically
  function suppressQzErrorBanner() {
    const errorAlerts = document.querySelectorAll('*');
    for (const el of errorAlerts) {
      if (el.innerText && /Failed to establish connection with QZ|Unable to establish connection with QZ/i.test(el.innerText)) {
        if (el.offsetParent !== null && el.id !== 'ordersmunim-floating-badge') {
          // If container has error class or banner style
          const banner = el.closest('.alert, [role="alert"], .notification, div') || el;
          banner.style.display = 'none';
        }
      }
    }
  }
  setInterval(suppressQzErrorBanner, 800);

  // Hook Native WebSocket
  const NativeWebSocket = window.WebSocket;

  function isQzTrayUrl(url) {
    if (!url) return false;
    const str = String(url).toLowerCase();
    return str.includes('localhost:8182') ||
           str.includes('127.0.0.1:8182') ||
           str.includes('localhost:8181') ||
           str.includes('127.0.0.1:8181');
  }

  class VirtualQzWebSocket {
    constructor(url, protocols) {
      this.url = url;
      this.protocols = protocols;
      this.readyState = 0; // CONNECTING
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.onclose = null;

      // Simulate instantaneous successful connection if subscription is active
      setTimeout(() => {
        if (!isSubscriptionActive) {
          console.warn('[OrdersMunim] QZ Connection rejected: Subscription Expired or Inactive.');
          this.readyState = 3; // CLOSED
          if (this.onerror) this.onerror(new Event('error'));
          if (this.onclose) this.onclose(new CloseEvent('close', { wasClean: false, code: 1006, reason: 'OrdersMunim subscription expired' }));
          return;
        }

        this.readyState = 1; // OPEN
        console.log('[OrdersMunim Virtual QZ] WebSocket connected to Myntra print client successfully.');
        if (this.onopen) this.onopen(new Event('open'));
      }, 50);
    }

    send(data) {
      if (!isSubscriptionActive) {
        console.error('[OrdersMunim] Subscription Expired: cannot execute print.');
        alert('OrdersMunim: Your subscription is expired or inactive. Please renew on ordermunim.web.app to download labels.');
        return;
      }

      let parsed;
      try {
        parsed = typeof data === 'string' ? JSON.parse(data) : data;
      } catch {
        parsed = {};
      }

      const reqId = parsed.promise !== undefined ? parsed.promise : parsed.call;
      const callType = parsed.call || '';

      // Handle QZ Tray API Protocol
      setTimeout(() => {
        let response = null;

        if (callType === 'version' || callType.includes('version')) {
          response = {
            call: callType,
            promise: reqId,
            result: '2.1.0'
          };
        } else if (callType.includes('printers.find') || callType.includes('printers.getDefault') || callType.includes('printers')) {
          response = {
            call: callType,
            promise: reqId,
            result: 'OrdersMunim Virtual PDF Printer'
          };
        } else if (callType === 'print' || callType.includes('print')) {
          console.log('[OrdersMunim Virtual QZ] Intercepted Print Request:', parsed);
          // Extract print data (base64 PDF, raw ZPL, or URL)
          handleInterceptedPrint(parsed.params);

          response = {
            call: callType,
            promise: reqId,
            result: 'Success'
          };
        } else {
          // General fallback success for other QZ calls (status, certificate, etc.)
          response = {
            call: callType,
            promise: reqId,
            result: 'OK'
          };
        }

        if (this.onmessage && response) {
          this.onmessage(new MessageEvent('message', {
            data: JSON.stringify(response)
          }));
        }
      }, 30);
    }

    close() {
      this.readyState = 3; // CLOSED
      if (this.onclose) this.onclose(new CloseEvent('close'));
    }
  }

  // Function to process intercepted print payload and trigger PDF download
  function handleInterceptedPrint(params) {
    if (!params) return;

    let printDataList = [];
    if (Array.isArray(params.data)) {
      printDataList = params.data;
    } else if (params.data) {
      printDataList = [params.data];
    }

    printDataList.forEach((item, idx) => {
      let rawContent = typeof item === 'string' ? item : (item.data || item.url || '');
      let format = item.format || item.type || 'pdf';

      // Forward to content script for safe download via chrome.downloads API
      window.dispatchEvent(new CustomEvent('__ORDERSMUNIM_DOWNLOAD_LABEL__', {
        detail: {
          rawContent,
          format,
          index: idx,
          timestamp: Date.now()
        }
      }));
    });
  }

  // Intercept window.WebSocket
  window.WebSocket = function(url, protocols) {
    if (isQzTrayUrl(url)) {
      return new VirtualQzWebSocket(url, protocols);
    }
    return new NativeWebSocket(url, protocols);
  };
  window.WebSocket.prototype = NativeWebSocket.prototype;
  window.WebSocket.CONNECTING = NativeWebSocket.CONNECTING;
  window.WebSocket.OPEN = NativeWebSocket.OPEN;
  window.WebSocket.CLOSING = NativeWebSocket.CLOSING;
  window.WebSocket.CLOSED = NativeWebSocket.CLOSED;

  // Initialize badge on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateFloatingBadge);
  } else {
    updateFloatingBadge();
  }

  console.log('[OrdersMunim] Virtual QZ Tray Engine initialized.');
})();
