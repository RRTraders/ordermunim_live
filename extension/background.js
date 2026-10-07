// OrdersMunim - Background Service Worker (Manifest V3)
// Handles Subscription Validation, Expiration Checks, and Secure PDF Downloads

const FIREBASE_PROJECT_ID = 'meesho-otp-app';

// Validate subscription against Firestore
async function verifySubscription() {
  const data = await chrome.storage.local.get(['userUid', 'userEmail', 'meeshoSyncKey']);
  const uid = data.userUid;
  const syncKey = data.meeshoSyncKey;

  // If neither UID nor Sync Key is saved, user is not logged in
  if (!uid && !syncKey) {
    const status = {
      active: false,
      reason: 'not_logged_in',
      message: 'Please log in with your OrdersMunim account in the extension.'
    };
    await chrome.storage.local.set({ subscriptionStatus: status });
    return status;
  }

  try {
    let userDoc = null;

    // 1. Check users collection if UID is available
    if (uid) {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
      const res = await fetch(url);
      if (res.ok) {
        userDoc = await res.json();
      }
    }

    // 2. Fallback: check accounts collection if syncKey is provided
    if (!userDoc && syncKey) {
      const accUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/accounts/${encodeURIComponent(syncKey)}`;
      const accRes = await fetch(accUrl);
      if (accRes.ok) {
        const accData = await accRes.json();
        const accUserId = accData.fields?.userId?.stringValue;
        if (accUserId) {
          const userUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(accUserId)}`;
          const uRes = await fetch(userUrl);
          if (uRes.ok) userDoc = await uRes.json();
        }
      }
    }

    if (!userDoc || !userDoc.fields) {
      const status = {
        active: false,
        reason: 'account_not_found',
        message: 'OrdersMunim account not found. Please log in again.'
      };
      await chrome.storage.local.set({ subscriptionStatus: status });
      return status;
    }

    const fields = userDoc.fields;
    const userStatus = fields.status?.stringValue || 'on_hold';
    const role = fields.role?.stringValue || 'seller';
    const maxAccounts = parseInt(fields.maxAccounts?.integerValue || '0', 10);
    const validTill = fields.validTill?.stringValue || fields.planExpiresAt?.stringValue || '';

    // Check if account is placed on hold by Admin
    if (userStatus === 'on_hold') {
      const status = {
        active: false,
        reason: 'on_hold',
        message: 'Account is On Hold. Please contact OrdersMunim admin to activate.'
      };
      await chrome.storage.local.set({ subscriptionStatus: status });
      return status;
    }

    // Check if account has a quota or is super admin
    if (role !== 'super_admin' && maxAccounts <= 0) {
      const status = {
        active: false,
        reason: 'unpaid',
        message: 'No active plan. Please subscribe at ordermunim.web.app to activate.'
      };
      await chrome.storage.local.set({ subscriptionStatus: status });
      return status;
    }

    // Check plan expiration date if specified
    if (validTill) {
      const expiryTime = new Date(validTill).getTime();
      if (!isNaN(expiryTime) && Date.now() > expiryTime) {
        const status = {
          active: false,
          reason: 'expired',
          validTill: validTill,
          message: `Subscription expired on ${new Date(validTill).toLocaleDateString()}. Please renew plan.`
        };
        await chrome.storage.local.set({ subscriptionStatus: status });
        return status;
      }
    }

    // Account is active and verified!
    const status = {
      active: true,
      role: role,
      userStatus: userStatus,
      maxAccounts: maxAccounts,
      validTill: validTill || 'Active',
      lastVerified: Date.now()
    };
    await chrome.storage.local.set({ subscriptionStatus: status });

    // Auto-fetch user's Meesho store accounts from Firestore
    if (uid) {
      try {
        const qUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
        const qRes = await fetch(qUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: 'accounts' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'userId' },
                  op: 'EQUAL',
                  value: { stringValue: uid }
                }
              }
            }
          })
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          const userAccounts = [];
          for (const item of qData) {
            if (item.document) {
              const docName = item.document.name;
              const docId = docName.split('/').pop();
              const f = item.document.fields || {};
              userAccounts.push({
                id: docId,
                storeName: f.storeName?.stringValue || f.supplierName?.stringValue || 'Meesho Store',
                currentOtp: f.currentOtp?.stringValue || '',
                phone: f.phone?.stringValue || f.mobile?.stringValue || ''
              });
            }
          }
          await chrome.storage.local.set({ userAccounts });
        }
      } catch (accErr) {
        console.warn('[OrdersMunim Background] Failed to auto-fetch stores:', accErr);
      }
    }

    return status;


  } catch (err) {
    console.warn('[OrdersMunim Background] Network error during verification:', err);
    // Return last cached status if offline/temporary error
    const cached = await chrome.storage.local.get(['subscriptionStatus']);
    if (cached.subscriptionStatus) {
      return cached.subscriptionStatus;
    }
    return {
      active: false,
      reason: 'network_error',
      message: 'Unable to verify license. Check internet connection.'
    };
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.action === 'check_subscription') {
      const status = await verifySubscription();
      sendResponse(status);
      return;
    }

    if (message.action === 'download_label') {
      const status = await verifySubscription();
      if (!status.active) {
        sendResponse({ success: false, error: status.message || 'Subscription expired' });
        return;
      }

      const item = message.data;
      if (!item || !item.rawContent) {
        sendResponse({ success: false, error: 'Empty print content' });
        return;
      }

      let dataUrl = item.rawContent;
      if (!dataUrl.startsWith('http://') && !dataUrl.startsWith('https://') && !dataUrl.startsWith('data:')) {
        dataUrl = `data:application/pdf;base64,${dataUrl.replace(/\s/g, '')}`;
      }

      const filename = `Myntra_Label_${Date.now()}_${item.index || 0}.pdf`;
      try {
        const downloadId = await chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: false
        });
        sendResponse({ success: true, downloadId });
      } catch (dErr) {
        console.error('[OrdersMunim Background] Download error:', dErr);
        sendResponse({ success: false, error: dErr.message });
      }
      return;
    }

    if (message.action === 'force_reverify') {
      const status = await verifySubscription();
      sendResponse(status);
      return;
    }

    sendResponse({ error: 'Unknown action' });
  })();

  return true; // Keep message channel open for async response
});

// Periodic verification every 10 minutes
chrome.alarms.create('reverify_license', { periodInMinutes: 10 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'reverify_license') {
    verifySubscription();
  }
});

// Initial verification on startup / installed
chrome.runtime.onInstalled.addListener(() => {
  verifySubscription();
});
chrome.runtime.onStartup.addListener(() => {
  verifySubscription();
});
