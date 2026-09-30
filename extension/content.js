// Content Script running on supplier.meesho.com

const FIREBASE_PROJECT_ID = "meesho-otp-app";
let lastPushedOtp = "";
let lastPushedCount = "";

console.log("[Meesho OTP Sync] Content script active on supplier.meesho.com");

function extractReturnDetails() {
  // 1. Find OTP and Partner
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

  // 2. Find Total Handover Count
  const handoverNode = Array.from(document.querySelectorAll('*')).find(e => 
    e.innerText && /Total\s+Handover\s+Count\s*:\s*\d+/i.test(e.innerText)
  );
  
  let handoverCount = 0;
  if (handoverNode) {
    const countMatch = handoverNode.innerText.match(/Total\s+Handover\s+Count\s*:\s*(\d+)/i);
    if (countMatch) handoverCount = parseInt(countMatch[1], 10);
  }

  // 3. Extract store / fulfillment ID from URL if available
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
  // Get sync key configured by the user
  chrome.storage.local.get(["meeshoSyncKey"], async (result) => {
    const syncKey = result.meeshoSyncKey;
    if (!syncKey) {
      console.log("[Meesho OTP Sync] No Sync Key configured in extension popup. Please open the extension and enter your Account Key.");
      return;
    }

    // Check if this OTP/Count was already pushed recently
    if (lastPushedOtp === details.otp && lastPushedCount === details.handoverCount) {
      return; // Already up to date
    }

    console.log(`[Meesho OTP Sync] Detected new Return OTP: ${details.otp} (${details.courier}). Pushing to Firebase for key: ${syncKey}...`);

    try {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/accounts/${encodeURIComponent(syncKey)}?updateMask.fieldPaths=currentOtp&updateMask.fieldPaths=courier&updateMask.fieldPaths=handoverCount&updateMask.fieldPaths=dateTime&updateMask.fieldPaths=lastUpdated&updateMask.fieldPaths=status&updateMask.fieldPaths=fulfillmentId`;
      
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

      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        lastPushedOtp = details.otp;
        lastPushedCount = details.handoverCount;
        console.log("[Meesho OTP Sync] Successfully synced OTP to mobile app!");
        chrome.storage.local.set({
          lastSyncedData: {
            otp: details.otp,
            courier: details.courier,
            handoverCount: details.handoverCount,
            time: new Date().toLocaleTimeString()
          }
        });
      } else {
        const errText = await res.text();
        console.error("[Meesho OTP Sync] Firebase push error:", errText);
      }
    } catch (err) {
      console.error("[Meesho OTP Sync] Network error pushing to Firebase:", err);
    }
  });
}

function scan() {
  const details = extractReturnDetails();
  if (details) {
    syncToFirebase(details);
  }
}

// Run scan periodically and on DOM changes
setInterval(scan, 3000);

const observer = new MutationObserver(() => {
  scan();
});
observer.observe(document.body, { childList: true, subtree: true });
scan();
