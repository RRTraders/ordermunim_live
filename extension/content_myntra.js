// OrdersMunim - Content Script for Myntra (mdirect.myntrainfo.com, partners.myntrainfo.com)
// Bridges between in-page Virtual QZ engine and Chrome Extension background service worker

(function() {
  'use strict';

  console.log('[OrdersMunim] Content script active on Myntra portal.');

  // Check subscription status with background
  async function syncLicenseStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'check_subscription' });
      const active = response && response.active === true;
      const message = response && response.message ? response.message : '';

      window.dispatchEvent(new CustomEvent('__ORDERSMUNIM_LICENSE_UPDATE__', {
        detail: { active, message }
      }));
    } catch (err) {
      console.warn('[OrdersMunim] Failed to check subscription status:', err);
    }
  }

  // Handle requests from in-page script
  window.addEventListener('__ORDERSMUNIM_REQUEST_LICENSE__', () => {
    syncLicenseStatus();
  });

  // Handle intercepted label download from Virtual QZ
  window.addEventListener('__ORDERSMUNIM_DOWNLOAD_LABEL__', async (e) => {
    const detail = e.detail;
    if (!detail) return;

    try {
      const resp = await chrome.runtime.sendMessage({
        action: 'download_label',
        data: detail
      });
      console.log('[OrdersMunim] Download queued:', resp);
    } catch (err) {
      console.error('[OrdersMunim] Failed to queue download:', err);
      // Fallback: trigger standard blob download in window
      fallbackBrowserDownload(detail);
    }
  });

  function fallbackBrowserDownload(detail) {
    let content = detail.rawContent;
    if (!content) return;

    try {
      let blobUrl = '';
      if (content.startsWith('http://') || content.startsWith('https://')) {
        blobUrl = content;
      } else if (content.startsWith('data:')) {
        blobUrl = content;
      } else {
        // Plain base64 PDF string
        const byteCharacters = atob(content.replace(/\s/g, ''));
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        blobUrl = URL.createObjectURL(blob);
      }

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Myntra_Shipping_Label_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('[OrdersMunim] Fallback download failed:', err);
    }
  }

  // Periodic subscription verification
  syncLicenseStatus();
  setInterval(syncLicenseStatus, 60000); // Re-check every 60s
})();
