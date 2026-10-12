import { Capacitor, registerPlugin } from '@capacitor/core';

// Native Android Plugin Bridge for direct Meesho API execution
const NativeMeesho = registerPlugin('MeeshoDirect');

export function isNativeMobile() {
  try {
    if (typeof Capacitor !== 'undefined') {
      if (typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) return true;
      if (typeof Capacitor.getPlatform === 'function' && Capacitor.getPlatform() === 'android') return true;
    }
    if (typeof window !== 'undefined') {
      if (window.Capacitor) {
        if (typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) return true;
        if (typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() === 'android') return true;
      }
      if (window.location && window.location.protocol === 'capacitor:') {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Native Direct Login to Meesho Supplier API from mobile device (1-2 SECONDS, NO SERVER)
 */
export async function directMeeshoLogin(email, password) {
  try {
    console.log('[Native Meesho] Calling native Android login...');
    const res = await NativeMeesho.login({ 
      email: email.trim(), 
      password: password 
    });
    console.log('[Native Meesho] Login result:', res);
    return res;
  } catch (err) {
    console.error('[Native Meesho] Exception:', err);
    return { success: false, error: err.message || 'Login failed' };
  }
}

/**
 * Native Direct OTP Fetch from Meesho Supplier API (500ms, NO SERVER)
 */
export async function directFetchDeliveryOTPs(identifier, cookies, supplierId) {
  try {
    const res = await NativeMeesho.fetchOtp({ 
      identifier: identifier || '', 
      supplierId: supplierId || 0,
      cookies: cookies || '' 
    });
    return res;
  } catch (err) {
    console.warn('[Native Meesho] OTP fetch error:', err);
    return {
      otp: '----',
      courier: 'No Return',
      handoverCount: 0,
      dateTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      otpList: [],
      error: err?.message || 'Fetch error'
    };
  }
}

/**
 * Sync active accounts to Android native background service for 24/7 background alerts
 */
export async function syncBackgroundSessions(sessionsObj, forceWipe = false, userId = '') {
  try {
    if (!isNativeMobile()) return;
    await NativeMeesho.syncSessions({ 
      sessions: sessionsObj, 
      forceWipe: Boolean(forceWipe),
      userId: userId || ''
    });
  } catch (err) {
    console.warn('[Native Meesho] syncSessions failed:', err);
  }
}

/**
 * Retrieve persistent sessions and credentials from Android native SharedPreferences
 */
export async function getNativeStoredSessions() {
  try {
    if (!isNativeMobile()) return {};
    const res = await NativeMeesho.getStoredSessions();
    return res && res.sessions ? res.sessions : {};
  } catch (err) {
    console.warn('[Native Meesho] getStoredSessions error:', err);
    return {};
  }
}

/**
 * Start native foreground monitoring service
 */
export async function startBackgroundMonitoring() {
  try {
    if (!isNativeMobile()) return;
    await NativeMeesho.startBackgroundService();
  } catch (err) {
    console.warn('[Native Meesho] startBackgroundService failed:', err);
  }
}

/**
 * Stop native foreground monitoring service & wipe background sessions
 */
export async function stopBackgroundMonitoring() {
  try {
    if (!isNativeMobile()) return;
    await NativeMeesho.stopBackgroundService();
  } catch (err) {
    console.warn('[Native Meesho] stopBackgroundService failed:', err);
  }
}

/**
 * Re-trigger battery optimization prompt or check exemption
 */
export async function requestBatteryOptimization() {
  try {
    if (!isNativeMobile()) return { isNative: false, isIgnoring: false };
    const res = await NativeMeesho.requestBatteryOptimization();
    return res || { success: true };
  } catch (err) {
    console.warn('[Native Meesho] requestBatteryOptimization failed:', err);
    throw err;
  }
}

/**
 * Check if Android Exact Alarm permission is granted (Android 12+ API 31+)
 */
export async function checkExactAlarmPermission() {
  try {
    if (!isNativeMobile()) return { isNative: false, canScheduleExactAlarms: true };
    const res = await NativeMeesho.checkExactAlarmPermission();
    return res || { canScheduleExactAlarms: true };
  } catch (err) {
    console.warn('[Native Meesho] checkExactAlarmPermission failed:', err);
    return { canScheduleExactAlarms: true };
  }
}

/**
 * Request Android Exact Alarm permission via system settings (Android 12+ API 31+)
 */
export async function requestExactAlarmPermission() {
  try {
    if (!isNativeMobile()) return { isNative: false };
    const res = await NativeMeesho.requestExactAlarmPermission();
    return res || { success: true };
  } catch (err) {
    console.warn('[Native Meesho] requestExactAlarmPermission failed:', err);
    throw err;
  }
}

/**
 * Open Android system App Info Settings
 */
export async function openAppSettings() {
  try {
    if (!isNativeMobile()) return { isNative: false };
    const res = await NativeMeesho.openAppSettings();
    return res || { success: true };
  } catch (err) {
    console.warn('[Native Meesho] openAppSettings failed:', err);
    throw err;
  }
}

/**
 * Open Android system Notification Settings for OrderMunim
 */
export async function openNotificationSettings() {
  try {
    if (!isNativeMobile()) return { isNative: false };
    const res = await NativeMeesho.openNotificationSettings();
    return res || { success: true };
  } catch (err) {
    console.warn('[Native Meesho] openNotificationSettings failed:', err);
    throw err;
  }
}

/**
 * In-App APK Downloader & Installer (Zero Browser, Direct Android Package Installer)
 */
export async function downloadAndInstallApk(url, onProgress) {
  if (!isNativeMobile()) {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Meesho_OTP.apk';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true, isNative: false };
  }

  let listenerHandle = null;
  try {
    if (typeof onProgress === 'function') {
      listenerHandle = await NativeMeesho.addListener('downloadProgress', (data) => {
        onProgress(data);
      });
    }

    const res = await NativeMeesho.downloadAndInstallUpdate({ url });
    return res;
  } catch (err) {
    console.error('[Native In-App Update] Error:', err);
    throw err;
  } finally {
    if (listenerHandle && typeof listenerHandle.remove === 'function') {
      try {
        await listenerHandle.remove();
      } catch {}
    }
  }
}

/**
 * Retrieve installed app version info from Android package manager (or fallback)
 */
export async function getAppVersionInfo() {
  const isNative = isNativeMobile();
  if (isNative) {
    try {
      const info = await NativeMeesho.getAppInfo();
      if (info && info.versionCode) {
        return {
          versionCode: Number(info.versionCode),
          versionName: String(info.versionName || '2.9'),
          packageName: String(info.packageName || 'com.rrtraders.meeshootp'),
          isNative: true,
          platform: 'android'
        };
      }
    } catch (err) {
      console.warn('[Native Meesho] getAppInfo error:', err);
    }
    return {
      versionCode: 23,
      versionName: '3.3',
      packageName: 'com.rrtraders.meeshootp',
      isNative: true,
      platform: 'android'
    };
  }
  return {
    versionCode: 23,
    versionName: '3.3',
    packageName: null,
    isNative: false,
    platform: 'web'
  };
}

/**
 * Cleanly exit the native Android application
 */
export async function exitApp() {
  if (isNativeMobile()) {
    try {
      await NativeMeesho.exitApp();
    } catch (err) {
      console.warn('[Native Meesho] exitApp error:', err);
    }
  }
}



