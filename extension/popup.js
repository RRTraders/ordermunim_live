// Extension popup logic
document.addEventListener("DOMContentLoaded", () => {
  const syncKeyInput = document.getElementById("syncKey");
  const saveBtn = document.getElementById("saveBtn");
  const syncStatus = document.getElementById("syncStatus");
  const lastOtp = document.getElementById("lastOtp");
  const lastCourier = document.getElementById("lastCourier");
  const lastCount = document.getElementById("lastCount");

  // Load saved key & status
  chrome.storage.local.get(["meeshoSyncKey", "lastSyncedData"], (result) => {
    if (result.meeshoSyncKey) {
      syncKeyInput.value = result.meeshoSyncKey;
      syncStatus.textContent = "Active";
      syncStatus.className = "badge badge-green";
    }
    if (result.lastSyncedData) {
      lastOtp.textContent = result.lastSyncedData.otp || "--";
      lastCourier.textContent = result.lastSyncedData.courier || "--";
      lastCount.textContent = result.lastSyncedData.handoverCount || "--";
    }
  });

  saveBtn.addEventListener("click", () => {
    const key = syncKeyInput.value.trim().toUpperCase();
    if (!key) {
      alert("Please enter a valid Account Sync Key from your mobile app!");
      return;
    }
    chrome.storage.local.set({ meeshoSyncKey: key }, () => {
      syncStatus.textContent = "Active";
      syncStatus.className = "badge badge-green";
      alert("Sync Key saved successfully! Any OTP on this tab will now automatically sync to your mobile app.");
    });
  });
});
