// OrdersMunim - Extension Popup Controller
// Manages authentication, subscription verification, and marketplace status

const FIREBASE_API_KEY = 'AIzaSyBXcH8anFAy8xWfQnfHcb1Pyf9J1aM0DDE';

document.addEventListener('DOMContentLoaded', async () => {
  const subBadge = document.getElementById('subBadge');
  const subDetails = document.getElementById('subDetails');
  const renewBtn = document.getElementById('renewBtn');
  const myntraStatus = document.getElementById('myntraStatus');
  const meeshoStatus = document.getElementById('meeshoStatus');

  const loggedOutSection = document.getElementById('loggedOutSection');
  const loggedInSection = document.getElementById('loggedInSection');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const loginBtn = document.getElementById('loginBtn');
  const userEmailDisplay = document.getElementById('userEmailDisplay');
  const syncKeyInput = document.getElementById('syncKeyInput');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const authError = document.getElementById('authError');
  const authSuccess = document.getElementById('authSuccess');

  function showError(msg) {
    authError.textContent = msg;
    authError.style.display = 'block';
    authSuccess.style.display = 'none';
  }

  function showSuccess(msg) {
    authSuccess.textContent = msg;
    authSuccess.style.display = 'block';
    authError.style.display = 'none';
  }

  function clearMessages() {
    authError.style.display = 'none';
    authSuccess.style.display = 'none';
  }

  // Load UI state
  async function refreshUI() {
    clearMessages();
    const stored = await chrome.storage.local.get([
      'userUid',
      'userEmail',
      'meeshoSyncKey',
      'subscriptionStatus'
    ]);

    // Check auth status
    if (stored.userUid && stored.userEmail) {
      loggedOutSection.style.display = 'none';
      loggedInSection.style.display = 'block';
      userEmailDisplay.textContent = stored.userEmail;
      syncKeyInput.value = stored.meeshoSyncKey || '';
    } else {
      loggedOutSection.style.display = 'block';
      loggedInSection.style.display = 'none';
    }

    // Request latest status from background
    let status = stored.subscriptionStatus;
    try {
      status = await chrome.runtime.sendMessage({ action: 'force_reverify' });
    } catch (e) {
      console.warn('Could not contact background service worker:', e);
    }

    const isPaused = !!stored.virtualQzPaused;
    const toggleQzBtn = document.getElementById('toggleQzBtn');
    const toggleQzIcon = document.getElementById('toggleQzIcon');
    const toggleQzText = document.getElementById('toggleQzText');

    if (isPaused) {
      toggleQzIcon.textContent = '▶️';
      toggleQzText.textContent = 'Resume Virtual QZ';
      toggleQzBtn.style.background = '#059669'; // Emerald
      toggleQzBtn.style.color = '#fff';
    } else {
      toggleQzIcon.textContent = '⏸️';
      toggleQzText.textContent = 'Pause Virtual QZ (Test Red Error)';
      toggleQzBtn.style.background = '#334155'; // Slate
      toggleQzBtn.style.color = '#f8fafc';
    }

    if (status && status.active) {
      subBadge.textContent = 'ACTIVE PLAN';
      subBadge.className = 'badge badge-active';
      subDetails.innerHTML = `
        <div style="color: #34d399; font-weight: 700;">Account Verified</div>
        <div>Quota: ${status.maxAccounts || 'Unlimited'} Store(s)</div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Validity: ${status.validTill || 'Active'}</div>
      `;
      renewBtn.style.display = 'none';

      if (isPaused) {
        myntraStatus.textContent = 'PAUSED ⏸️ (Original QZ)';
        myntraStatus.className = 'feature-status text-rose';
      } else {
        myntraStatus.textContent = 'Ready (Virtual QZ)';
        myntraStatus.className = 'feature-status text-emerald';
      }

      meeshoStatus.textContent = stored.meeshoSyncKey ? 'Active (Synced)' : 'Ready';
      meeshoStatus.className = 'feature-status text-emerald';
    } else {
      subBadge.textContent = 'EXPIRED / INACTIVE';
      subBadge.className = 'badge badge-expired';
      const msg = status?.message || 'Please log in with an active OrdersMunim account.';
      subDetails.innerHTML = `
        <div style="color: #f87171; font-weight: 700;">Access Restricted</div>
        <div style="margin-top: 2px;">${msg}</div>
      `;
      renewBtn.style.display = 'block';

      myntraStatus.textContent = 'Locked (Unpaid)';
      myntraStatus.className = 'feature-status text-rose';

      meeshoStatus.textContent = 'Inactive';
      meeshoStatus.className = 'feature-status text-muted';
    }
  }

  // Handle Pause / Resume Virtual QZ
  document.getElementById('toggleQzBtn')?.addEventListener('click', async () => {
    const current = await chrome.storage.local.get(['virtualQzPaused']);
    const newPaused = !current.virtualQzPaused;
    await chrome.storage.local.set({ virtualQzPaused: newPaused });
    
    // Notify active tabs
    try {
      const tabs = await chrome.tabs.query({ url: '*://*.myntrainfo.com/*' });
      for (const t of tabs) {
        chrome.tabs.sendMessage(t.id, { action: 'toggle_qz', paused: newPaused }).catch(() => {});
      }
    } catch {}

    await refreshUI();
  });


  // Handle Login via Firebase Auth REST API
  loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError('Please enter both email and password.');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Authenticating...';
    clearMessages();

    try {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Invalid email or password.');
      }

      await chrome.storage.local.set({
        userUid: data.localId,
        userEmail: data.email,
        idToken: data.idToken,
        refreshToken: data.refreshToken
      });

      showSuccess('Signed in successfully! Verifying plan...');
      passwordInput.value = '';

      // Force license reverification
      await chrome.runtime.sendMessage({ action: 'force_reverify' });
      await refreshUI();

    } catch (err) {
      let cleanMsg = err.message;
      if (cleanMsg.includes('EMAIL_NOT_FOUND')) cleanMsg = 'User not found. Register on ordermunim.web.app.';
      if (cleanMsg.includes('INVALID_PASSWORD')) cleanMsg = 'Incorrect password.';
      if (cleanMsg.includes('USER_DISABLED')) cleanMsg = 'Account has been disabled.';
      showError(cleanMsg);
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In to Activate';
    }
  });

  // Handle Save Sync Key
  saveKeyBtn.addEventListener('click', async () => {
    const key = syncKeyInput.value.trim().toUpperCase();
    await chrome.storage.local.set({ meeshoSyncKey: key });
    showSuccess('Account key updated successfully!');
    setTimeout(refreshUI, 600);
  });

  // Handle Sign Out
  logoutBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove([
      'userUid',
      'userEmail',
      'idToken',
      'refreshToken',
      'subscriptionStatus'
    ]);
    await refreshUI();
  });

  // Initial load
  await refreshUI();
});
