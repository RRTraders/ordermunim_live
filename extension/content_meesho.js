// OrdersMunim - Content Script for Meesho Supplier Panel (supplier.meesho.com)
// Automatically captures Return Handover OTP (Valmo, Shadowfax, Delhivery) and syncs to mobile app in real time

const FIREBASE_PROJECT_ID = "meesho-otp-app";
let lastPushedOtp = "";
let lastPushedCount = "";

console.log("[OrdersMunim] Meesho OTP Sync active on supplier.meesho.com");

function extractReturnDetails() {
  const otpNode = Array.from(document.querySelectorAll('*')).find(e => 
    e.innerText && /OTP:/i.test(e.innerText) && /\b\d{4,6}\b/.test(e.innerText)
  );

  let courier = "Unknown";
  let otp = "";
  let dateTime = "";
  
  if (otpNode) {
    const text = otpNode.innerText;
    const partnerMatch = text.match(/([a-zA-Z]+)\s+OTP:/i);
    const otpMatch = text.match(/\b\d{4,6}\b/);
    const dateMatch = text.match(/\d{1,2}\s+[a-zA-Z]+,\s*\d{1,2}:\d{2}\s*(?:AM|PM)/i);
    
    if (partnerMatch) courier = partnerMatch[1];
    if (otpMatch) otp = otpMatch[0];
    if (dateMatch) dateTime = dateMatch[0];
  }

  const handoverNode = Array.from(document.querySelectorAll('*')).find(e => 
    e.innerText && /Total\s+Handover\s+Count\s*:\s*\d+/i.test(e.innerText)
  );
  
  let handoverCount = 0;
  if (handoverNode) {
    const countMatch = handoverNode.innerText.match(/Total\s+Handover\s+Count\s*:\s*(\d+)/i);
    if (countMatch) handoverCount = parseInt(countMatch[1], 10);
  }

  const urlMatch = window.location.href.match(/fulfillment\/([a-zA-Z0-9]+)/);
  const fulfillmentId = urlMatch ? urlMatch[1] : "";

  if (otp) {
    return {
      otp,
      courier,
      dateTime: dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      handoverCount,
      fulfillmentId
    };
  }
  return null;
}

async function syncToFirebase(details) {
  chrome.storage.local.get(["meeshoSyncKey", "userAccounts", "subscriptionStatus"], async (result) => {
    // Check if account is expired
    if (result.subscriptionStatus && result.subscriptionStatus.active === false) {
      console.warn("[OrdersMunim] Subscription expired. OTP Sync paused.");
      return;
    }

    // Auto-resolve account ID: prefer userAccounts if available, else meeshoSyncKey
    let targetAccount = null;
    if (Array.isArray(result.userAccounts) && result.userAccounts.length > 0) {
      targetAccount = result.userAccounts[0]; // Primary store
    }

    const syncKey = targetAccount ? targetAccount.id : result.meeshoSyncKey;
    if (!syncKey) {
      return;
    }

    // Local in-memory deduplication
    if (lastPushedOtp === details.otp && lastPushedCount === details.handoverCount) {
      return;
    }

    try {
      // 1. Fetch current remote document to check if Mobile app already pushed this OTP
      const docUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/accounts/${encodeURIComponent(syncKey)}`;
      const checkRes = await fetch(docUrl);
      if (checkRes.ok) {
        const docData = await checkRes.json();
        const existingOtp = docData.fields?.currentOtp?.stringValue || '';
        if (existingOtp && existingOtp === details.otp) {
          // Mobile already pushed this exact OTP! Do not overwrite.
          console.log(`[OrdersMunim Meesho Sync] OTP (${details.otp}) already present in Firebase (pushed by mobile or previous cycle). Skipping update.`);
          lastPushedOtp = details.otp;
          lastPushedCount = details.handoverCount;
          return;
        }
      }

      console.log(`[OrdersMunim] New Return OTP: ${details.otp} (${details.courier}). Updating Firebase for account: ${syncKey}...`);

      const updateUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/accounts/${encodeURIComponent(syncKey)}?updateMask.fieldPaths=currentOtp&updateMask.fieldPaths=courier&updateMask.fieldPaths=handoverCount&updateMask.fieldPaths=dateTime&updateMask.fieldPaths=lastUpdated&updateMask.fieldPaths=status&updateMask.fieldPaths=fulfillmentId`;

      const payload = {
        fields: {
          currentOtp: { stringValue: details.otp },
          courier: { stringValue: details.courier },
          handoverCount: { integerValue: details.handoverCount.toString() },
          dateTime: { stringValue: details.dateTime },
          lastUpdated: { stringValue: new Date().toISOString() },
          status: { stringValue: "live" },
          fulfillmentId: { stringValue: details.fulfillmentId }
        }
      };

      const res = await fetch(updateUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        lastPushedOtp = details.otp;
        lastPushedCount = details.handoverCount;
        console.log("[OrdersMunim] Successfully synced OTP to mobile app!");
        chrome.storage.local.set({
          lastSyncedData: {
            otp: details.otp,
            courier: details.courier,
            handoverCount: details.handoverCount,
            time: new Date().toLocaleTimeString()
          }
        });
      }
    } catch (err) {
      console.error("[OrdersMunim] Network error pushing to Firebase:", err);
    }
  });
}


function scan() {
  const details = extractReturnDetails();
  if (details) {
    syncToFirebase(details);
  }
}

setInterval(scan, 3000);
const observer = new MutationObserver(() => scan());
if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
scan();
