# ORDERMUNIM - OTP ARCHITECTURE MASTER SPECIFICATION
================================================================================
Document: OTP_ARCHITECTURE_MASTER.md
Target Platform: Android Native App (com.rrtraders.meeshootp) + Web Client
Last Updated: 2026-10-14
Status: ACTIVE & MANDATORY

This master specification defines the exact, non-negotiable architecture and
lifecycle of Meesho Return Delivery OTP monitoring in OrderMunim.
All future updates, refactors, and builds must strictly adhere to this document.

================================================================================
1. ADD STORE ACCESS CONTROL (MOBILE-APP EXCLUSIVE)
================================================================================
- "Add Meesho Store" action, floating action buttons (FAB), modals, and 
  credential input forms are strictly enabled ONLY inside the native Android 
  mobile application (checked via `isNativeMobile()`).
- Desktop browsers and Mobile Web (PWA/Chrome) are purely for viewing live OTPs 
  and Staff Mode sharing; they must never expose the "Add Store" modal.

================================================================================
2. REAL ACCOUNT VERIFICATION & INITIAL FETCH
================================================================================
- When a user submits Meesho credentials (email and password):
  1. The app executes an immediate headless authentication test against Meesho.
  2. If credentials fail (wrong password, account blocked, captcha, etc.):
     - The store is REJECTED immediately.
     - An explicit error message is displayed to the user.
     - No document or session is saved to Firestore or local storage.
  3. If authentication succeeds:
     - Automatically fetch Account Holder / Registered Supplier Name.
     - Automatically fetch active Delivery OTP (if any pending).
     - Automatically fetch Handover Packet Count.
     - Only upon successful verification, proceed to save the account.

================================================================================
3. TIME-BASED POLLING SCHEDULE (COURIER HOURS VS. OFF-HOURS)
================================================================================
- Polling intervals are strictly driven by Indian Standard Time (IST):
  * COURIER DELIVERY HOURS (10:00 AM to 06:00 PM IST):
    -> Scheduled polling interval: EXACTLY EVERY 5 MINUTES.
  * OFF-HOURS (06:00 PM to 10:00 AM IST):
    -> Scheduled polling interval: EXACTLY EVERY 60 MINUTES.
- Execution Mechanism:
  * Polling calls must NEVER run unanchored in RAM.
  * Calls are scheduled strictly through Android OS `AlarmManager` with 
    wake-lock protection (`setAlarmClock` / `setExactAndAllowWhileIdle`).
  * Alarms must wake the device and fire even when:
    - App is swiped away from Recent Apps / Task Switcher.
    - Phone screen is locked / phone is in deep Doze mode.
    - Phone has rebooted (via `BootReceiver`).

================================================================================
4. GOOGLE CHROME SESSION INTEGRATION & MIDNIGHT AUTO-RESET
================================================================================
- Chrome Browser Cookie Sync:
  * If valid Meesho session cookies exist in Google Chrome for the same account,
    capture and utilize them for fetching live OTPs and syncing to Firestore.
- Midnight Clean Slate (12:00 AM IST):
  * Every night at 12:00 AM sharp, all past OTPs and packet handover counts 
    are automatically wiped clean in Firestore and the app:
    - `currentOtp: "----"`
    - `courier: "No Return"`
    - `handoverCount: 0`
    - `otpList: []`
  * Each morning begins with a 100% clean, fresh return delivery state.

================================================================================
5. ENCRYPTED CREDENTIALS IN FIRESTORE (SURVIVES UPDATES & WIPES)
================================================================================
- Credentials (email and password) are stored in Firestore under the account 
  document in securely encrypted ciphertext (AES-256 / salted cipher).
- Plaintext passwords are never stored in unencrypted cloud fields.
- Post-Update / Restore Resilience:
  * When an APK update is installed, or the app is restored on a device:
    1. The app queries the user's accounts from Firestore.
    2. Decrypts the stored credentials in memory.
    3. Re-establishes background polling and alarm schedules automatically.
  * The merchant NEVER has to re-type passwords or re-add their store after 
    an update or device reboot.

================================================================================
6. NOTIFICATIONS & ALERTS
================================================================================
- High-priority Android notification channel (`meesho_otp_alert_channel`).
- Distinct chime sound, persistent vibration, and prominent "Copy OTP" action.
- Head-up banner showing:
  * Store Name
  * Courier Partner (Valmo, Shadowfax, Delhivery, Xpressbees, etc.)
  * Large OTP number
  * Packet handover count.
================================================================================
