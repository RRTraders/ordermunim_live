import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { directMeeshoLogin, directFetchDeliveryOTPs, isNativeMobile, syncBackgroundSessions, startBackgroundMonitoring, stopBackgroundMonitoring, requestBatteryOptimization, openAppSettings, downloadAndInstallApk, getAppVersionInfo } from './meeshoDirect';
import { 
  saveEncryptedStoreCredentials, 
  getDecryptedStoreCredentials, 
  findCredentialsForAccount, 
  removeEncryptedStoreCredentials, 
  clearVault 
} from './localVault';
import { 
  auth, 
  db 
} from './firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  Phone, 
  ShieldCheck, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  Package, 
  Truck, 
  Clock, 
  Users, 
  Settings, 
  LogOut, 
  Volume2, 
  VolumeX, 
  AlertCircle,
  Share2,
  Key,
  Crown,
  Mail,
  Lock,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
  PauseCircle,
  BellRing,
  X,
  User,
  MailCheck,
  ArrowLeft,
  CheckCircle2,
  Scissors,
  Printer,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  DownloadCloud,
  Rocket,
  AlertTriangle,
  Smartphone
} from 'lucide-react';
import LabelCropper from './LabelCropper';

const CURRENT_APP_VERSION_CODE = 14;
const CURRENT_APP_VERSION_NAME = "2.4";

const SUPER_ADMIN_EMAIL = "rrtradersofficials@gmail.com";
const ADMIN_PASS = "admin249"; // Default secret password for Admin panel

// Persistent Device Identifier to enforce strict Single Active Login restriction
export const getDeviceId = () => {
  try {
    let dId = localStorage.getItem('om_unique_device_id');
    if (!dId) {
      dId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      localStorage.setItem('om_unique_device_id', dId);
    }
    return dId;
  } catch {
    return 'dev_' + Date.now();
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fancy Dialog & Toast Notifications state
  const [modalError, setModalError] = useState('');
  const [toast, setToast] = useState(null); // { id, message, type: 'success' | 'error' | 'info' | 'warning', title }
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, confirmText, onConfirm }

  const showToast = (message, type = 'info', title = '') => {
    const id = Date.now();
    setToast({ id, message, type, title });
    setTimeout(() => {
      setToast(current => (current?.id === id ? null : current));
    }, 4000);
  };
  
  // Auth state
  const [authTab, setAuthTab] = useState('customer'); // 'customer' | 'admin'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerConfirmPass, setCustomerConfirmPass] = useState('');
  const [emailNeedsVerification, setEmailNeedsVerification] = useState(false);

  // Super Admin Credentials
  const [adminEmail, setAdminEmail] = useState('rrtradersofficials@gmail.com');
  const [adminPassword, setAdminPassword] = useState('@rrt123');

  // Phone Auth state
  const [phone, setPhone] = useState('+91');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // User Profile & Account Data (Instant Cache)
  const [profile, setProfile] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_user_profile');
      return cached ? JSON.parse(cached) : { maxAccounts: 0, mobile: '', status: 'active' };
    } catch {
      return { maxAccounts: 0, mobile: '', status: 'active' };
    }
  });
  const [accounts, setAccounts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_user_accounts');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Modals & Views
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [meeshoEmail, setMeeshoEmail] = useState('');
  const [meeshoPass, setMeeshoPass] = useState('');
  const [syncingAccount, setSyncingAccount] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);
  const [connectStep, setConnectStep] = useState(1); // 1 = enter details, 2 = install extension
  const [generatedSyncKey, setGeneratedSyncKey] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'admin' | 'staff'
  const [staffShareKey, setStaffShareKey] = useState('');
  const [expandedStoreIds, setExpandedStoreIds] = useState({});

  const toggleStoreExpand = (storeId) => {
    setExpandedStoreIds((prev) => ({
      ...prev,
      [storeId]: !prev[storeId]
    }));
  };

  // Native Multi-Device Sessions & Reconnect State
  const [localSessions, setLocalSessions] = useState(() => {
    try {
      const raw = localStorage.getItem('native_meesho_sessions');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [reconnectAccount, setReconnectAccount] = useState(null);
  const [reconnectPass, setReconnectPass] = useState('');
  const [reconnectLoading, setReconnectLoading] = useState(false);
  const [reconnectError, setReconnectError] = useState('');

  // Admin Panel State
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminInputPass, setAdminInputPass] = useState('');
  const [allUsersList, setAllUsersList] = useState([]);
  const [allPlatformAccounts, setAllPlatformAccounts] = useState([]);
  const [adminUserTab, setAdminUserTab] = useState('activated'); // 'activated' | 'pending'
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminCurrentPage, setAdminCurrentPage] = useState(1);
  const ADMIN_PAGE_SIZE = 10;

  // In-App Update & Broadcast State
  const [installedVersionCode, setInstalledVersionCode] = useState(() => {
    const cached = localStorage.getItem('om_installed_version_code');
    return cached ? Number(cached) : CURRENT_APP_VERSION_CODE;
  });
  const [installedVersionName, setInstalledVersionName] = useState(() => {
    return localStorage.getItem('om_installed_version_name') || CURRENT_APP_VERSION_NAME;
  });

  useEffect(() => {
    getAppVersionInfo().then((info) => {
      if (info && info.versionCode) {
        setInstalledVersionCode(info.versionCode);
        setInstalledVersionName(info.versionName);
        localStorage.setItem('om_installed_version_code', String(info.versionCode));
        localStorage.setItem('om_installed_version_name', String(info.versionName));
      }
    });
  }, []);

  const [appUpdateConfig, setAppUpdateConfig] = useState(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [dismissedUpdateCode, setDismissedUpdateCode] = useState(() => {
    try {
      const v = localStorage.getItem('om_dismissed_update_code');
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  });

  const handleDismissUpdate = (targetCode) => {
    setUpdateDismissed(true);
    if (targetCode) {
      setDismissedUpdateCode(Number(targetCode));
      try {
        localStorage.setItem('om_dismissed_update_code', String(targetCode));
      } catch {}
    }
  };
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0); // 0 to 100
  const [updateStatusText, setUpdateStatusText] = useState('');

  // Admin Broadcast Controls
  const [broadcastActive, setBroadcastActive] = useState(false);
  const [broadcastVersionCode, setBroadcastVersionCode] = useState(2);
  const [broadcastVersionName, setBroadcastVersionName] = useState('1.1');
  const [broadcastTitle, setBroadcastTitle] = useState('New Update Available!');
  const [broadcastMessage, setBroadcastMessage] = useState('We redesigned the app with bottom navigation, mobile toolbar, and faster OTP syncing. Please update your app.');
  const [broadcastUrl, setBroadcastUrl] = useState('https://github.com/RRTraders/ordermunim_live/raw/main/meesho_otp.apk');
  const [broadcastMode, setBroadcastMode] = useState('grace_period'); // 'grace_period' | 'force_immediate' | 'optional'
  const [broadcastGraceDays, setBroadcastGraceDays] = useState(2);
  const [broadcastSaving, setBroadcastSaving] = useState(false);

  // Listen to remote App Update config in Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'app_update'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAppUpdateConfig(data);
        setBroadcastActive(Boolean(data.active));
        if (data.versionCode !== undefined) setBroadcastVersionCode(data.versionCode);
        if (data.versionName) setBroadcastVersionName(data.versionName);
        if (data.title) setBroadcastTitle(data.title);
        if (data.message) setBroadcastMessage(data.message);
        if (data.downloadUrl) setBroadcastUrl(data.downloadUrl);
        if (data.updateMode) setBroadcastMode(data.updateMode);
        if (data.graceDays !== undefined) setBroadcastGraceDays(data.graceDays);
      } else {
        setAppUpdateConfig(null);
      }
    });
    return () => unsub();
  }, []);

  const isSuperAdmin = Boolean(
    (user && (user.email === SUPER_ADMIN_EMAIL || user.uid === 'vJID6QrALTf4ybiDP5TuLvNkyN63')) ||
    profile?.role === 'super_admin' ||
    profile?.email === SUPER_ADMIN_EMAIL
  );

  // Backend Cloudflare Tunnel / Server config listener
  const [serverConfig, setServerConfig] = useState(null);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'server'), (snap) => {
      if (snap.exists()) {
        setServerConfig(snap.data());
      }
    });
    return () => unsub();
  }, []);

  const getBackendUrl = () => {
    const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
    // Only use local port 4000 when running in browser on desktop localhost
    if (!isNative && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:4000';
    }
    // Always prioritize local residential IP tunnel (Cloudflare) because Meesho blocks Render cloud IPs
    if (serverConfig?.tunnelUrl && serverConfig.tunnelUrl.includes('trycloudflare.com')) {
      return serverConfig.tunnelUrl;
    }
    if (serverConfig?.apiUrl && !serverConfig.apiUrl.includes('onrender.com')) {
      return serverConfig.apiUrl;
    }
    return serverConfig?.tunnelUrl || serverConfig?.apiUrl || 'https://converter-future-admission-beautiful.trycloudflare.com';
  };


  // Check URL params for Staff View mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const staffKey = params.get('staff');
    if (staffKey) {
      setStaffShareKey(staffKey);
      setActiveTab('staff');

      const unsubUser = onSnapshot(doc(db, 'users', staffKey), (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        }
      });

      const q = query(collection(db, 'accounts'), where('userId', '==', staffKey));
      const unsubAcc = onSnapshot(q, (snapshot) => {
        const accList = [];
        snapshot.forEach((d) => {
          accList.push({ id: d.id, ...d.data() });
        });
        setAccounts(accList);
      });

      return () => {
        unsubUser();
        unsubAcc();
      };
    }
  }, []);

  // Listen to Auth state (Instant Startup — No 5-second blocking waterfall!)
  useEffect(() => {
    let cleanupProfile = () => {};

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      cleanupProfile();

      if (!currentUser) {
        setUser(null);
        setEmailNeedsVerification(false);
        setLoading(false);
        setAccounts([]);
        setLocalSessions({});
        if (isNativeMobile()) {
          try {
            stopBackgroundMonitoring();
            syncBackgroundSessions({});
          } catch {}
        }
        try {
          localStorage.removeItem('om_active_user_uid');
          localStorage.removeItem('native_meesho_sessions');
          localStorage.removeItem('cached_user_accounts');
          localStorage.removeItem('cached_user_profile');
          clearVault();
        } catch {}
        return;
      }

      // Detect if user switched on this device:
      const prevActiveUid = localStorage.getItem('om_active_user_uid');
      if (prevActiveUid && prevActiveUid !== currentUser.uid) {
        try {
          localStorage.removeItem('native_meesho_sessions');
          localStorage.removeItem('cached_user_accounts');
          localStorage.removeItem('cached_user_profile');
          clearVault();
          if (isNativeMobile()) {
            syncBackgroundSessions({});
          }
        } catch {}
        setLocalSessions({});
        setAccounts([]);
      }
      try { localStorage.setItem('om_active_user_uid', currentUser.uid); } catch {}

      const isSuper = (currentUser.email && currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || currentUser.uid === 'vJID6QrALTf4ybiDP5TuLvNkyN63';
      const isLocallyVerified = Boolean(
        isSuper ||
        currentUser.emailVerified ||
        localStorage.getItem(`email_verified_${currentUser.uid}`) === 'true'
      );

      if (isLocallyVerified) {
        // FAST PATH: User is already verified! Show dashboard instantly (<50ms)!
        try { localStorage.setItem(`email_verified_${currentUser.uid}`, 'true'); } catch {}
        setUser(currentUser);
        setEmailNeedsVerification(false);
        setLoading(false); // <--- UNBLOCK UI IMMEDIATELY!

        // Stream profile and accounts in background
        cleanupProfile = loadUserProfile(currentUser.uid, currentUser.phoneNumber, currentUser.email);
        return;
      }

      // SLOW PATH (Only for newly registered accounts awaiting activation):
      setUser(currentUser);
      try {
        await currentUser.reload();
      } catch (e) {}

      let isFirestoreVerified = false;
      try {
        const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (uDoc.exists() && uDoc.data().emailVerified === true) {
          isFirestoreVerified = true;
        }
      } catch (e) {}

      const isVerified = currentUser.emailVerified || isFirestoreVerified;

      if (!isVerified) {
        setEmailNeedsVerification(true);
        setLoading(false);
        return;
      } else {
        try { localStorage.setItem(`email_verified_${currentUser.uid}`, 'true'); } catch {}
        await updateDoc(doc(db, 'users', currentUser.uid), {
          emailVerified: true
        }).catch(() => {});
      }

      setEmailNeedsVerification(false);
      setLoading(false);
      cleanupProfile = loadUserProfile(currentUser.uid, currentUser.phoneNumber, currentUser.email);
    });

    return () => {
      unsubscribe();
      cleanupProfile();
    };
  }, []);

  // Load user profile & realtime accounts listener (Zero blocking, Realtime Sync)
  const loadUserProfile = (uid, userPhone, userEmail) => {
    const isSuper = (userEmail && userEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || uid === 'vJID6QrALTf4ybiDP5TuLvNkyN63';
    const userRef = doc(db, 'users', uid);

    // 1. Realtime listener on user doc
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const profData = snap.data();
        setProfile(profData);
        try { localStorage.setItem('cached_user_profile', JSON.stringify(profData)); } catch {}
        if (isSuper || profData.role === 'super_admin') {
          setAdminAuthenticated(true);
          setActiveTab('admin');
        }
      } else {
        const currentDeviceId = getDeviceId();
        const initialProf = {
          mobile: userPhone || '',
          email: userEmail || '',
          maxAccounts: isSuper ? 999 : 0,
          role: isSuper ? 'super_admin' : 'seller',
          status: 'active',
          activeDeviceId: currentDeviceId,
          activeDeviceAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        setDoc(userRef, initialProf).catch(() => {});
        setProfile(initialProf);
      }
    });

    // 2. Subscribe to accounts:
    // STRICT CLIENT ISOLATION: Always load ONLY this user's accounts!
    // Platform-wide management for super admin is handled separately in Admin console.
    const q = query(collection(db, 'accounts'), where('userId', '==', uid));

    const unsubAcc = onSnapshot(q, (snapshot) => {
      const accList = [];
      snapshot.forEach((d) => {
        accList.push({ id: d.id, ...d.data() });
      });
      setAccounts(accList);
      try { localStorage.setItem('cached_user_accounts', JSON.stringify(accList)); } catch {}
    });

    return () => {
      unsubUser();
      unsubAcc();
    };
  };

  // Staff Live Listener if accessed via staff key
  useEffect(() => {
    if (activeTab === 'staff' && staffShareKey) {
      const q = query(collection(db, 'accounts'), where('userId', '==', staffShareKey));
      const unsub = onSnapshot(q, (snapshot) => {
        const accList = [];
        snapshot.forEach((d) => {
          accList.push({ id: d.id, ...d.data() });
        });
        setAccounts(accList);
      });
      return () => unsub();
    }
  }, [activeTab, staffShareKey]);

  // Play audio chime ONLY when a genuine new OTP arrives (never on blank, error, initial load, or same OTP)
  const lastChimedOtpsRef = useRef({});
  const initialLoadDoneRef = useRef(false);
  const accountsRef = useRef(accounts);
  const lastSyncedDocRef = useRef({});

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  useEffect(() => {
    if (!accounts || accounts.length === 0) return;

    if (!initialLoadDoneRef.current) {
      // First load: seed all current OTPs so app startup never beeps
      for (const acc of accounts) {
        if (acc.userId && user?.uid && acc.userId !== user.uid) continue;
        if (acc.currentOtp && acc.currentOtp !== '----') {
          lastChimedOtpsRef.current[acc.id] = acc.currentOtp;
        }
      }
      initialLoadDoneRef.current = true;
      return;
    }

    let hasNewOtp = false;

    for (const acc of accounts) {
      if (acc.userId && user?.uid && acc.userId !== user.uid) continue;
      const otp = acc.currentOtp;
      if (otp && otp !== '----') {
        const lastChimed = lastChimedOtpsRef.current[acc.id];
        if (lastChimed !== otp) {
          // Brand new OTP received that has never been chimed for this account
          hasNewOtp = true;
          lastChimedOtpsRef.current[acc.id] = otp;
        }
      }
    }

    if (hasNewOtp && soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (e) {}
    }
  }, [accounts, soundEnabled]);

  // 1. Multi-Device Session Hydration (Firestore -> Phone localStorage & Background Service)
  useEffect(() => {
    if (!isNativeMobile() || !user) return;
    try {
      const rawSessions = localStorage.getItem('native_meesho_sessions');
      const cur = rawSessions ? JSON.parse(rawSessions) : {};
      let changed = false;

      // Filter accounts strictly by the current logged-in user's UID
      const myAccounts = accounts.filter(acc => acc.userId === user.uid);
      const validKeys = new Set();
      myAccounts.forEach(acc => {
        if (acc.id) validKeys.add(acc.id);
        if (acc.syncKey) validKeys.add(acc.syncKey);
      });

      // STRICT PURGE: Remove any session keys that do NOT belong to this user's current stores
      for (const k of Object.keys(cur)) {
        if (!validKeys.has(k)) {
          delete cur[k];
          changed = true;
        }
      }

      for (const acc of myAccounts) {
        const key = acc.syncKey || acc.id;
        const existing = cur[key] || (acc.id ? cur[acc.id] : null) || (acc.syncKey ? cur[acc.syncKey] : null);
        const vaultCred = findCredentialsForAccount(acc, user.uid);
        const restoredPassword = (existing && existing.password) ? existing.password : (vaultCred?.password || '');
        const restoredEmail = (existing && existing.email) ? existing.email : (acc.email || vaultCred?.email || '');

        if (!existing && acc.cookies) {
          const newSess = {
            email: restoredEmail,
            password: restoredPassword,
            identifier: acc.identifier || (vaultCred?.identifier || ''),
            supplierId: acc.supplierId || (vaultCred?.supplierId || 0),
            storeName: acc.storeName || (vaultCred?.storeName || ''),
            cookies: acc.cookies || '',
            expired: false
          };
          cur[key] = newSess;
          if (acc.id) cur[acc.id] = newSess;
          if (acc.syncKey) cur[acc.syncKey] = newSess;
          changed = true;
        } else if (existing) {
          if (!existing.password && restoredPassword) {
            existing.password = restoredPassword;
            changed = true;
          }
          if (!existing.email && restoredEmail) {
            existing.email = restoredEmail;
            changed = true;
          }
          if (acc.cookies && existing.cookies !== acc.cookies) {
            existing.cookies = acc.cookies;
            changed = true;
          }
          if (acc.id && !cur[acc.id]) {
            cur[acc.id] = existing;
            changed = true;
          }
          if (acc.syncKey && !cur[acc.syncKey]) {
            cur[acc.syncKey] = existing;
            changed = true;
          }
        }
      }

      if (changed || myAccounts.length === 0) {
        localStorage.setItem('native_meesho_sessions', JSON.stringify(cur));
        setLocalSessions(cur);
        syncBackgroundSessions(cur);
      }
    } catch (e) {}
  }, [accounts, user]);

  // 2. Multi-Device Cloud Backup: Only sync identifiers & cookies, NEVER passwords to ensure 100% privacy
  useEffect(() => {
    if (!user || accounts.length === 0) return;
    try {
      const rawSessions = localStorage.getItem('native_meesho_sessions');
      if (!rawSessions) return;
      const cur = JSON.parse(rawSessions);

      for (const acc of accounts) {
        const sess = cur[acc.syncKey] || cur[acc.id];
        if (sess && !acc.cookies) {
          updateDoc(doc(db, 'accounts', acc.id), {
            cookies: sess.cookies || '',
            identifier: sess.identifier || acc.identifier || '',
            supplierId: sess.supplierId || acc.supplierId || 0,
            email: sess.email || acc.email || ''
          }).catch(() => {});
        }
      }
    } catch (e) {}
  }, [accounts, user]);

  // On Native Mobile App: Poll Meesho OTP API directly on phone & keep 24/7 background service synced
  useEffect(() => {
    if (!isNativeMobile()) return;

    try {
      const rawSessions = localStorage.getItem('native_meesho_sessions');
      if (rawSessions) {
        const sessions = JSON.parse(rawSessions);
        syncBackgroundSessions(sessions);
      }
      startBackgroundMonitoring();
    } catch (e) {}

    const interval = setInterval(async () => {
      try {
        const rawSessions = localStorage.getItem('native_meesho_sessions');
        if (!rawSessions) return;
        let sessions = {};
        try {
          sessions = JSON.parse(rawSessions);
        } catch {
          return;
        }

        const polledIdentifiers = new Set();
        for (const [key, sess] of Object.entries(sessions)) {
          if (!sess.identifier && !sess.email) continue;
          const dedupKey = sess.identifier || (sess.supplierId ? `sup_${sess.supplierId}` : (sess.email || key));
          if (polledIdentifiers.has(dedupKey)) continue;
          polledIdentifiers.add(dedupKey);

          // Restore credentials from encrypted local vault if missing
          if (!sess.password) {
            const vaultCred = findCredentialsForAccount({ id: key, syncKey: key, ...sess });
            if (vaultCred?.password) {
              sess.password = vaultCred.password;
              if (!sess.email && vaultCred.email) sess.email = vaultCred.email;
            }
          }

          // If cookies missing but credentials exist, attempt initial login
          if (!sess.cookies && sess.email && sess.password) {
            const fresh = await directMeeshoLogin(sess.email, sess.password);
            if (fresh.success) {
              sessions[key].cookies = fresh.cookies;
              sessions[key].identifier = fresh.identifier;
              sessions[key].supplierId = fresh.supplierId;
              sessions[key].storeName = fresh.storeName;
              localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
              setLocalSessions(sessions);
              await updateDoc(doc(db, 'accounts', key), {
                cookies: fresh.cookies,
                identifier: fresh.identifier,
                supplierId: fresh.supplierId,
                lastUpdated: new Date().toISOString()
              }).catch(() => {});
            }
          }

          if (!sess.cookies) continue;

          let otpRes = await directFetchDeliveryOTPs(sess.identifier, sess.cookies, sess.supplierId);
          if (otpRes.error || otpRes.expired || otpRes.error === 'HTTP 403' || otpRes.error === 'HTTP 401') {
            // Auto re-login silently using encrypted local credentials whenever session expires
            const vaultCred = findCredentialsForAccount({ id: key, syncKey: key, ...sess });
            const loginEmail = sess.email || vaultCred?.email;
            const loginPass = sess.password || vaultCred?.password;

            if (loginEmail && loginPass) {
              const fresh = await directMeeshoLogin(loginEmail, loginPass);
              if (fresh.success) {
                const freshIdent = fresh.identifier || sess.identifier || '';
                const freshSupId = fresh.supplierId || sess.supplierId || 0;
                sessions[key].cookies = fresh.cookies;
                sessions[key].identifier = freshIdent;
                sessions[key].supplierId = freshSupId;
                sessions[key].storeName = fresh.storeName || sess.storeName;
                sessions[key].email = loginEmail;
                sessions[key].password = loginPass;
                sessions[key].expired = false;
                try {
                  localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
                  setLocalSessions({ ...sessions });
                  syncBackgroundSessions(sessions);
                } catch {}
                await updateDoc(doc(db, 'accounts', key), {
                  cookies: fresh.cookies,
                  identifier: freshIdent,
                  supplierId: freshSupId,
                  lastUpdated: new Date().toISOString()
                }).catch(() => {});
                otpRes = await directFetchDeliveryOTPs(freshIdent, fresh.cookies, freshSupId);
              }
            }
          }

          // Guard: Never overwrite Firestore if fetch encountered a network error
          if (otpRes.error || otpRes.expired) {
            console.warn(`[Native OTP Poll] Skipping Firestore update for ${key} due to:`, otpRes.error || 'expired');
            continue;
          } else {
            if (sessions[key] && sessions[key].expired) {
              sessions[key].expired = false;
              try {
                localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
                setLocalSessions({ ...sessions });
              } catch {}
            }
          }

          const newOtp = otpRes.otp || '----';
          const newCourier = otpRes.courier || 'No Return';
          const newCount = otpRes.handoverCount || 0;
          const newOtpListJson = JSON.stringify(otpRes.otpList || []);

          // Check if data is already identical in Firestore or in our last synced cache
          const existingAcc = accountsRef.current?.find(a => a.id === key || a.syncKey === key);
          const prevSynced = lastSyncedDocRef.current[key];

          const isSameAsExisting = existingAcc && (
            (existingAcc.currentOtp || '----') === newOtp &&
            (existingAcc.courier || 'No Return') === newCourier &&
            (existingAcc.handoverCount || 0) === newCount &&
            JSON.stringify(existingAcc.otpList || []) === newOtpListJson
          );

          const isSameAsPrev = prevSynced && (
            prevSynced.currentOtp === newOtp &&
            prevSynced.courier === newCourier &&
            prevSynced.handoverCount === newCount &&
            prevSynced.otpListJson === newOtpListJson
          );

          if (isSameAsExisting || isSameAsPrev) {
            // ZERO CHANGE in OTP or Return counts.
            // SKIP FIRESTORE WRITE COMPLETELY!
            // This prevents hundreds of unnecessary writes & reads!
            lastSyncedDocRef.current[key] = {
              currentOtp: newOtp,
              courier: newCourier,
              handoverCount: newCount,
              otpListJson: newOtpListJson
            };
            continue;
          }

          // Data has ACTUALLY changed (new OTP arrived or delivery completed)
          lastSyncedDocRef.current[key] = {
            currentOtp: newOtp,
            courier: newCourier,
            handoverCount: newCount,
            otpListJson: newOtpListJson
          };

          // Update Firestore so UI and other devices reflect current OTP & all active OTPs
          await updateDoc(doc(db, 'accounts', key), {
            currentOtp: newOtp,
            courier: newCourier,
            handoverCount: newCount,
            dateTime: otpRes.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            otpList: otpRes.otpList || [],
            lastUpdated: new Date().toISOString()
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('Native OTP poll error:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Setup reCAPTCHA for Phone Auth (Real SMS OTP)
  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {}
      window.recaptchaVerifier = null;
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {}
    });
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setAuthError('');

    let cleanPhone = phone.trim().replace(/[\s-]/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.length === 10) {
        cleanPhone = '+91' + cleanPhone;
      } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
        cleanPhone = '+91' + cleanPhone.substring(1);
      } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = '+' + cleanPhone;
      } else {
        cleanPhone = '+91' + cleanPhone;
      }
    }

    if (cleanPhone.length < 12) {
      setAuthError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setAuthLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, cleanPhone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-phone-number') {
        setAuthError('Invalid phone number format. Please enter a valid 10-digit mobile number.');
      } else if (err.code === 'auth/too-many-requests') {
        setAuthError('Too many SMS requests sent. Please wait a few minutes before trying again.');
      } else {
        setAuthError(err.message || 'Failed to send SMS OTP. Please check the mobile number.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const cred = await confirmationResult.confirm(verificationCode);
      if (cred && cred.user) {
        const currentDeviceId = getDeviceId();
        await updateDoc(doc(db, 'users', cred.user.uid), {
          activeDeviceId: currentDeviceId,
          activeDeviceAt: new Date().toISOString()
        }).catch(async () => {
          await setDoc(doc(db, 'users', cred.user.uid), {
            activeDeviceId: currentDeviceId,
            activeDeviceAt: new Date().toISOString()
          }, { merge: true }).catch(() => {});
        });
      }
    } catch (err) {
      console.error(err);
      setAuthError('Invalid OTP code. Please enter the correct code.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Customer Email Sign In
  const handleCustomerLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, customerEmail.trim(), customerPassword);
      const currentUser = cred.user;
      const isSuper = (currentUser.email && currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || currentUser.uid === 'vJID6QrALTf4ybiDP5TuLvNkyN63';
      
      if (!isSuper) {
        // Force reload from server to get accurate real-time emailVerified flag
        await currentUser.reload();

        let isFirestoreVerified = false;
        try {
          const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (uDoc.exists() && uDoc.data().emailVerified === true) {
            isFirestoreVerified = true;
          }
        } catch (e) {}

        const isVerified = currentUser.emailVerified || isFirestoreVerified;

        if (!isVerified) {
          // Re-send verification link automatically so they have the freshest link
          await sendEmailVerification(currentUser).catch(() => {});
          // Immediately sign out to block unauthorized access to dashboard!
          await signOut(auth);
          setUser(null);
          setAuthError('Account not activated! Please click the activation link sent to your email (' + customerEmail.trim() + ') before signing in. Also check your Spam/Junk folder.');
          return;
        }

        // If verified, update Firestore so admin console reflects it and claim this device session
        const currentDeviceId = getDeviceId();
        await updateDoc(doc(db, 'users', currentUser.uid), {
          emailVerified: true,
          activeDeviceId: currentDeviceId,
          activeDeviceAt: new Date().toISOString()
        }).catch(async () => {
          await setDoc(doc(db, 'users', currentUser.uid), {
            emailVerified: true,
            activeDeviceId: currentDeviceId,
            activeDeviceAt: new Date().toISOString()
          }, { merge: true }).catch(() => {});
        });
      } else {
        const currentDeviceId = getDeviceId();
        await updateDoc(doc(db, 'users', currentUser.uid), {
          activeDeviceId: currentDeviceId,
          activeDeviceAt: new Date().toISOString()
        }).catch(() => {});
      }

      setEmailNeedsVerification(false);
      setUser(currentUser);
      await loadUserProfile(currentUser.uid, currentUser.phoneNumber, currentUser.email);
    } catch (err) {
      console.error("Customer login error:", err);
      // Fallback matching Super Admin credentials
      if (customerEmail.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && customerPassword === '@rrt123') {
        const localAdmin = {
          uid: 'vJID6QrALTf4ybiDP5TuLvNkyN63',
          email: 'rrtradersofficials@gmail.com',
          displayName: 'Super Admin'
        };
        setUser(localAdmin);
        await loadUserProfile(localAdmin.uid, '', localAdmin.email);
        return;
      }
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError('Invalid email or password. If you do not have an account, click "Sign Up" below.');
      } else {
        setAuthError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Customer Email Sign Up (Requires Full Name, Email, Password + Mandatory Email Verification)
  const handleCustomerSignup = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!customerName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }
    if (customerPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }
    if (customerPassword !== customerConfirmPass) {
      setAuthError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setAuthLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, customerEmail.trim(), customerPassword);
      const newUser = cred.user;

      // Set display name in Firebase Auth
      await updateProfile(newUser, { displayName: customerName.trim() }).catch(() => {});

      // Send official email verification link (100% Free)
      await sendEmailVerification(newUser);

      // Create seller document in Firestore
      await setDoc(doc(db, 'users', newUser.uid), {
        name: customerName.trim(),
        email: customerEmail.trim().toLowerCase(),
        role: 'seller',
        maxAccounts: 0, // 0 stores quota by default
        status: 'active',
        emailVerified: false,
        activeDeviceId: getDeviceId(),
        activeDeviceAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      setUser(newUser);
      setEmailNeedsVerification(true);
      showToast('Account created! A verification link has been sent to your email.', 'success');
    } catch (err) {
      console.error("Signup error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setAuthError('An account with this email already exists. Please sign in instead.');
      } else {
        setAuthError(err.message || 'Signup failed. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Check if User clicked verification link in their email or admin manually activated
  const handleCheckVerified = async () => {
    if (!auth.currentUser) return;
    setAuthLoading(true);
    try {
      await auth.currentUser.reload();
      let isFirestoreVerified = false;
      try {
        const uDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (uDoc.exists() && uDoc.data().emailVerified === true) {
          isFirestoreVerified = true;
        }
      } catch (e) {}

      if (auth.currentUser.emailVerified || isFirestoreVerified) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          emailVerified: true
        }).catch(() => {});
        setEmailNeedsVerification(false);
        setUser(auth.currentUser);
        await loadUserProfile(auth.currentUser.uid, auth.currentUser.phoneNumber, auth.currentUser.email);
        showToast('Email verified successfully! Welcome to Meesho OTP Hub.', 'success');
      } else {
        showToast('Email not verified yet. Please check your inbox and click the link.', 'warning');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  // Super Admin: Manually activate unverified seller email
  const handleAdminManualActivate = async (uid, userEmail) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        emailVerified: true
      });
      showToast(`Activated ${userEmail || 'user'} successfully!`, 'success');
    } catch (err) {
      showToast(`Error activating user: ${err.message}`, 'error');
    }
  };

  // Resend verification email
  const handleResendVerificationEmail = async () => {
    if (!auth.currentUser) return;
    setAuthLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      showToast('New verification email sent! Check your inbox and spam folder.', 'success');
    } catch (err) {
      showToast(`Failed to resend: ${err.message}`, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  // Forgot Password handler
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!customerEmail.trim()) {
      setAuthError('Please enter your registered email address.');
      return;
    }
    setAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, customerEmail.trim());
      showToast('Password reset link sent to your email inbox!', 'success');
      setAuthMode('login');
    } catch (err) {
      setAuthError(err.message || 'Failed to send password reset email.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Super Admin Email & Password login
  const handleAdminEmailLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
      setUser(userCred.user);
      await loadUserProfile(userCred.user.uid, '', userCred.user.email);
    } catch (err) {
      console.error("Firebase admin login error:", err);
      // Fallback matching credentials
      if (adminEmail.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && adminPassword === '@rrt123') {
        const localAdmin = {
          uid: 'vJID6QrALTf4ybiDP5TuLvNkyN63',
          email: 'rrtradersofficials@gmail.com',
          displayName: 'Super Admin'
        };
        setUser(localAdmin);
        await loadUserProfile(localAdmin.uid, '', localAdmin.email);
      } else {
        setAuthError(err.message || 'Invalid super admin email or password.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isNativeMobile()) {
      try {
        await stopBackgroundMonitoring();
        await syncBackgroundSessions({});
      } catch {}
    }
    try {
      localStorage.removeItem('native_meesho_sessions');
      localStorage.removeItem('cached_user_profile');
      localStorage.removeItem('cached_user_accounts');
      clearVault();
    } catch {}
    setLocalSessions({});
    await signOut(auth);
    setUser(null);
    setEmailNeedsVerification(false);
    setProfile({ maxAccounts: 0, mobile: '', status: 'active' });
    setAccounts([]);
    setAdminAuthenticated(false);
    setActiveTab('dashboard');
  };

  // Manual Trigger to refresh store OTP from Meesho
  const handleManualRefresh = async (syncKey, storeName) => {
    setRefreshingId(syncKey);
    try {
      const targetAcc = accounts.find(a => a.syncKey === syncKey || a.id === syncKey);
      if (isNativeMobile()) {
        const raw = localStorage.getItem('native_meesho_sessions');
        let sessions = {};
        try {
          sessions = raw ? JSON.parse(raw) : {};
        } catch {}
        let sess = sessions[syncKey] || (targetAcc ? sessions[targetAcc.id] : null);

        // 1. If session not local, try hydrating cookies from Firestore doc
        if (!sess && targetAcc && targetAcc.cookies) {
          sess = {
            email: targetAcc.email || '',
            password: '',
            identifier: targetAcc.identifier || '',
            supplierId: targetAcc.supplierId || 0,
            storeName: targetAcc.storeName || storeName,
            cookies: targetAcc.cookies || ''
          };
          sessions[syncKey] = sess;
          try {
            localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
            setLocalSessions(sessions);
            syncBackgroundSessions(sessions);
          } catch {}
        }

        // 2. If we have session / credentials, fetch directly
        const vaultCred = findCredentialsForAccount(targetAcc || { id: syncKey, syncKey });
        if (sess) {
          if (!sess.password && vaultCred?.password) sess.password = vaultCred.password;
          if (!sess.email && vaultCred?.email) sess.email = vaultCred.email;

          const loginEmail = sess.email || targetAcc?.email || vaultCred?.email || '';
          const loginPass = sess.password || vaultCred?.password || '';

          if (!sess.cookies && loginEmail && loginPass) {
            const fresh = await directMeeshoLogin(loginEmail, loginPass);
            if (fresh.success) {
              sess.cookies = fresh.cookies;
              sess.identifier = fresh.identifier || sess.identifier || targetAcc?.identifier || '';
              sess.supplierId = fresh.supplierId || sess.supplierId || targetAcc?.supplierId || 0;
              sess.email = loginEmail;
              sess.password = loginPass;
              sessions[syncKey] = sess;
              try {
                localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
                setLocalSessions(sessions);
                syncBackgroundSessions(sessions);
              } catch {}
              await updateDoc(doc(db, 'accounts', targetAcc?.id || syncKey), {
                cookies: fresh.cookies,
                identifier: sess.identifier,
                supplierId: sess.supplierId,
                lastUpdated: new Date().toISOString()
              }).catch(() => {});
            }
          }

          if (sess.cookies) {
            let otpRes = await directFetchDeliveryOTPs(sess.identifier, sess.cookies, sess.supplierId);

            // AUTO RE-LOGIN if cookie expired (HTTP 403 / 401) using local vault password
            if ((otpRes.expired || otpRes.error === 'HTTP 403' || otpRes.error === 'HTTP 401') && loginEmail && loginPass) {
              const fresh = await directMeeshoLogin(loginEmail, loginPass);
              if (fresh.success) {
                const freshIdent = fresh.identifier || sess.identifier || targetAcc?.identifier || '';
                const freshSupId = fresh.supplierId || sess.supplierId || targetAcc?.supplierId || 0;
                sessions[syncKey].cookies = fresh.cookies;
                sessions[syncKey].identifier = freshIdent;
                sessions[syncKey].supplierId = freshSupId;
                sessions[syncKey].storeName = fresh.storeName || sess.storeName;
                sessions[syncKey].password = loginPass;
                sessions[syncKey].email = loginEmail;
                sessions[syncKey].expired = false;
                try {
                  localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
                  setLocalSessions(sessions);
                  syncBackgroundSessions(sessions);
                } catch {}
                await updateDoc(doc(db, 'accounts', targetAcc?.id || syncKey), {
                  cookies: fresh.cookies,
                  identifier: freshIdent,
                  supplierId: freshSupId,
                  lastUpdated: new Date().toISOString()
                }).catch(() => {});
                otpRes = await directFetchDeliveryOTPs(freshIdent, fresh.cookies, freshSupId);
              }
            }

            // If local session failed with 401/403, check if another device updated cookies in Firestore
            if ((otpRes.error || otpRes.expired) && (otpRes.expired || otpRes.error === 'HTTP 403' || otpRes.error === 'HTTP 401')) {
              if (targetAcc?.cookies && targetAcc.cookies !== sess.cookies) {
                const cloudRes = await directFetchDeliveryOTPs(targetAcc.identifier || sess.identifier, targetAcc.cookies, targetAcc.supplierId || sess.supplierId);
                if (!cloudRes.error && !cloudRes.expired) {
                  otpRes = cloudRes;
                  sess.cookies = targetAcc.cookies;
                  sessions[syncKey] = sess;
                  try {
                    localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
                    setLocalSessions({ ...sessions });
                  } catch {}
                }
              }
            }

            if (otpRes.error || otpRes.expired) {
              if (otpRes.expired || otpRes.error === 'HTTP 403' || otpRes.error === 'HTTP 401') {
                const sKey = targetAcc?.syncKey || syncKey;
                const aId = targetAcc?.id || syncKey;
                if (sessions[sKey]) sessions[sKey].expired = true;
                if (sessions[aId]) sessions[aId].expired = true;
                try {
                  localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
                  setLocalSessions({ ...sessions });
                } catch {}
                // Only open reconnect modal if password is NOT present in local database
                if (!loginPass) {
                  const hasActiveOtp = targetAcc?.currentOtp && targetAcc.currentOtp !== '----';
                  if (targetAcc && !hasActiveOtp) {
                    setReconnectAccount(targetAcc);
                    setReconnectPass('');
                    setReconnectError(`Session expired (${otpRes.error || 'HTTP 403'}). Please enter password to reconnect.`);
                    setShowReconnectModal(true);
                  }
                }
              }
              showToast(`Could not refresh ${storeName}: ${otpRes.error || 'Session expired'}`, 'error');
              return;
            }

            const sKey = targetAcc?.syncKey || syncKey;
            const aId = targetAcc?.id || syncKey;
            if (sessions[sKey]) sessions[sKey].expired = false;
            if (sessions[aId]) sessions[aId].expired = false;
            try {
              localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
              setLocalSessions({ ...sessions });
            } catch {}

            const newOtp = otpRes.otp || '----';
            const newCourier = otpRes.courier || 'No Return';
            const newCount = otpRes.handoverCount || 0;
            const newOtpListJson = JSON.stringify(otpRes.otpList || []);

            const currentAcc = accountsRef.current?.find(a => a.id === (targetAcc?.id || syncKey) || a.syncKey === syncKey);
            const isSame = currentAcc && (
              (currentAcc.currentOtp || '----') === newOtp &&
              (currentAcc.courier || 'No Return') === newCourier &&
              (currentAcc.handoverCount || 0) === newCount &&
              JSON.stringify(currentAcc.otpList || []) === newOtpListJson
            );

            if (!isSame) {
              await updateDoc(doc(db, 'accounts', targetAcc?.id || syncKey), {
                currentOtp: newOtp,
                courier: newCourier,
                handoverCount: newCount,
                dateTime: otpRes.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                otpList: otpRes.otpList || [],
                lastUpdated: new Date().toISOString()
              }).catch(() => {});
            }

            if (otpRes.otp && otpRes.otp !== '----') {
              showToast(`Return OTP for ${storeName}: ${otpRes.otp} (${otpRes.courier || 'Courier'})`, 'success');
            } else {
              showToast(`Checked ${storeName}: No return courier right now.`, 'info');
            }
            return;
          }
        }

        // 3. If session is missing on this phone, attempt auto-login from vault before asking for password:
        if (targetAcc) {
          if (vaultCred?.password && (vaultCred.email || targetAcc.email)) {
            const loginEmail = vaultCred.email || targetAcc.email;
            const fresh = await directMeeshoLogin(loginEmail, vaultCred.password);
            if (fresh.success) {
              const freshIdent = fresh.identifier || targetAcc.identifier || '';
              const freshSupId = fresh.supplierId || targetAcc.supplierId || 0;
              const newSess = {
                email: loginEmail,
                password: vaultCred.password,
                identifier: freshIdent,
                supplierId: freshSupId,
                storeName: targetAcc.storeName || fresh.storeName,
                cookies: fresh.cookies,
                expired: false
              };
              const raw = localStorage.getItem('native_meesho_sessions');
              const curSess = raw ? JSON.parse(raw) : {};
              curSess[syncKey] = newSess;
              if (targetAcc.id) curSess[targetAcc.id] = newSess;
              localStorage.setItem('native_meesho_sessions', JSON.stringify(curSess));
              setLocalSessions(curSess);
              syncBackgroundSessions(curSess);
              await updateDoc(doc(db, 'accounts', targetAcc.id), {
                cookies: fresh.cookies,
                identifier: freshIdent,
                supplierId: freshSupId,
                lastUpdated: new Date().toISOString()
              }).catch(() => {});
              const otpRes = await directFetchDeliveryOTPs(freshIdent, fresh.cookies, freshSupId);
              if (otpRes.otp && otpRes.otp !== '----') {
                showToast(`Return OTP for ${storeName}: ${otpRes.otp} (${otpRes.courier || 'Courier'})`, 'success');
              } else {
                showToast(`Checked ${storeName}: No return courier right now.`, 'info');
              }
              return;
            }
          }
          setReconnectAccount(targetAcc);
          setReconnectPass('');
          setReconnectError('');
          setShowReconnectModal(true);
          return;
        }
      }

      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/meesho/refresh/${syncKey}`, { method: 'POST' });
      let data = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {}
      if (res.ok && data.success) {
        showToast(`Checked latest returns for ${storeName}`, 'success');
      } else {
        showToast(`Auto-sync active for ${storeName}`, 'info');
      }
    } catch (err) {
      showToast(`Auto-sync active for ${storeName}`, 'info');
    } finally {
      setRefreshingId(null);
    }
  };

  // Re-authenticate / Connect account on this mobile device
  const handleReconnectSubmit = async (e) => {
    e.preventDefault();
    if (!reconnectAccount || !reconnectPass) return;
    setReconnectLoading(true);
    setReconnectError('');

    try {
      const email = reconnectAccount.email;
      const res = await directMeeshoLogin(email, reconnectPass);
      if (!res.success) {
        setReconnectError(res.error || 'Login failed. Please check your Meesho password.');
        return;
      }

      // 1. Update local sessions & save encrypted credentials into local database
      saveEncryptedStoreCredentials(reconnectAccount.id, {
        email: email.trim(),
        password: reconnectPass,
        identifier: res.identifier || reconnectAccount.identifier || '',
        supplierId: res.supplierId || reconnectAccount.supplierId || 0,
        storeName: res.storeName || reconnectAccount.storeName
      });
      if (reconnectAccount.syncKey) {
        saveEncryptedStoreCredentials(reconnectAccount.syncKey, {
          email: email.trim(),
          password: reconnectPass,
          identifier: res.identifier || reconnectAccount.identifier || '',
          supplierId: res.supplierId || reconnectAccount.supplierId || 0,
          storeName: res.storeName || reconnectAccount.storeName
        });
      }

      const raw = localStorage.getItem('native_meesho_sessions');
      const curSessions = raw ? JSON.parse(raw) : {};
      const key = reconnectAccount.syncKey || reconnectAccount.id;
      const sessData = {
        email: email.trim(),
        password: reconnectPass,
        identifier: res.identifier || reconnectAccount.identifier || '',
        supplierId: res.supplierId || reconnectAccount.supplierId || 0,
        storeName: res.storeName || reconnectAccount.storeName,
        cookies: res.cookies,
        expired: false
      };
      curSessions[key] = sessData;
      if (reconnectAccount.id) curSessions[reconnectAccount.id] = sessData;
      if (reconnectAccount.syncKey) curSessions[reconnectAccount.syncKey] = sessData;
      localStorage.setItem('native_meesho_sessions', JSON.stringify(curSessions));
      setLocalSessions({ ...curSessions });
      syncBackgroundSessions(curSessions);

      // 2. Update Firestore so all devices get live status & cookies (NEVER password)
      await updateDoc(doc(db, 'accounts', reconnectAccount.id), {
        cookies: res.cookies,
        identifier: res.identifier || reconnectAccount.identifier || '',
        supplierId: res.supplierId || reconnectAccount.supplierId || 0,
        currentOtp: res.otp || '----',
        courier: res.courier || 'No Return',
        handoverCount: res.handoverCount || 0,
        dateTime: res.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        otpList: res.otpList || [],
        status: 'live',
        lastUpdated: new Date().toISOString()
      });

      setShowReconnectModal(false);
      setReconnectAccount(null);
      setReconnectPass('');
      showToast(`Store "${reconnectAccount.storeName}" connected & synced live OTP!`, 'success');
    } catch (err) {
      setReconnectError(err.message || 'Connection failed.');
    } finally {
      setReconnectLoading(false);
    }
  };

  // Add a new Meesho Account slot — calls local/Indian-IP backend
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setModalError('');

    if (accounts.length >= (Number(profile.maxAccounts) || 1)) {
      setModalError(`Plan Limit Reached! Your plan allows ${profile.maxAccounts || 1} store(s). Contact admin to add slots.`);
      return;
    }

    const cleanEmail = meeshoEmail.trim().toLowerCase();
    const isSuper = (user?.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || user?.uid === 'vJID6QrALTf4ybiDP5TuLvNkyN63';
    if (cleanEmail) {
      const existing = accounts.find(a =>
        a.email && a.email.trim().toLowerCase() === cleanEmail
      );
      if (existing) {
        setModalError(`Account already added! "${existing.storeName || meeshoEmail}" is already connected.`);
        return;
      }

      // Cross-Account Duplicate Check by Email
      if (!isSuper) {
        try {
          const qEmail = query(collection(db, 'accounts'), where('email', '==', cleanEmail));
          const snapEmail = await getDocs(qEmail);
          for (const d of snapEmail.docs) {
            const accData = d.data();
            if (accData.userId && accData.userId !== user.uid) {
              setModalError(`Access Restricted: This Meesho account (${cleanEmail}) is already connected to another OrderMunim user. Meesho enforces a strict 1-login policy and returns HTTP 403 Session Expired if multiple accounts access it. To share access across multiple devices, please use Staff Mode.`);
              return;
            }
          }
        } catch (e) {}
      }
    }

    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const syncKey = `MSH-${user.uid.slice(0, 4).toUpperCase()}-${randomSuffix}`;
    const autoStoreName = newStoreName.trim() || (meeshoEmail ? meeshoEmail.split('@')[0] : 'My Meesho Store');

    setSyncingAccount(true);
    try {
      let data = null;

      // 1. On Native Mobile (APK), login directly from phone (NO PC / NO SERVER NEEDED!)
      if (isNativeMobile()) {
        const directRes = await directMeeshoLogin(meeshoEmail, meeshoPass);
        if (!directRes.success) {
          setModalError(directRes.error || 'Meesho login failed. Please check your credentials.');
          return;
        }
        data = {
          success: true,
          storeName: directRes.storeName,
          identifier: directRes.identifier,
          supplierId: directRes.supplierId,
          cookies: directRes.cookies,
          otp: directRes.otp,
          courier: directRes.courier,
          handoverCount: directRes.handoverCount,
          dateTime: directRes.dateTime,
          otpList: directRes.otpList || []
        };
      } else {
        // 2. On Web, fallback to backend automation server/tunnel
        let backendUrl = getBackendUrl();
        if (!backendUrl || backendUrl.includes('localhost')) {
          try {
            const sDoc = await getDoc(doc(db, 'config', 'server'));
            if (sDoc.exists()) {
              const sData = sDoc.data();
              backendUrl = sData.tunnelUrl || sData.apiUrl || backendUrl;
            }
          } catch (e) {}
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 40000);

        try {
          const response = await fetch(`${backendUrl}/api/meesho/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              userId: user.uid,
              syncKey,
              storeName: newStoreName.trim(),
              email: meeshoEmail.trim(),
              password: meeshoPass
            })
          });
          clearTimeout(timeoutId);

          try {
            const resText = await response.text();
            data = resText ? JSON.parse(resText) : {};
          } catch {
            data = { success: false, error: 'Server returned empty or non-JSON response' };
          }

          if (!response.ok || !data.success) {
            setModalError(data.error || 'Meesho login failed. Please check your credentials.');
            return;
          }
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          if (fetchErr.name === 'AbortError') {
            setModalError('Login timed out after 40 seconds. Please check your credentials and internet.');
          } else {
            setModalError(`Cannot reach automation server (${fetchErr.message}).`);
          }
          return;
        }
      }

      // Cross-Account Duplicate Check by supplierId & identifier
      if (!isSuper) {
        let conflictAcc = null;

        if (data?.supplierId) {
          try {
            const qSup = query(collection(db, 'accounts'), where('supplierId', '==', Number(data.supplierId)));
            const snapSup = await getDocs(qSup);
            for (const d of snapSup.docs) {
              const item = d.data();
              if (item.userId && item.userId !== user.uid) {
                conflictAcc = item;
                break;
              }
            }
          } catch (e) {}
        }

        if (!conflictAcc && data?.identifier) {
          try {
            const qIdent = query(collection(db, 'accounts'), where('identifier', '==', data.identifier));
            const snapIdent = await getDocs(qIdent);
            for (const d of snapIdent.docs) {
              const item = d.data();
              if (item.userId && item.userId !== user.uid) {
                conflictAcc = item;
                break;
              }
            }
          } catch (e) {}
        }

        if (conflictAcc) {
          setModalError(
            `Access Restricted: This Meesho store ("${conflictAcc.storeName || cleanEmail}") is already connected to another OrderMunim account. Meesho permits only 1 active session at a time and revokes access (HTTP 403) on concurrent logins. To share live OTPs with your team across multiple phones, please use the owner's Staff Mode link.`
          );
          return;
        }
      }

      // Only merge if the EXACT SAME email is already added by THIS user
      const existingStore = accounts.find(a =>
        a.userId === user.uid && a.email && cleanEmail && a.email.trim().toLowerCase() === cleanEmail
      );

      const targetSyncKey = existingStore ? existingStore.id : syncKey;
      const finalStoreName = newStoreName.trim() || data.storeName || autoStoreName;
      const targetAccRef = doc(db, 'accounts', targetSyncKey);

      await setDoc(targetAccRef, {
        userId: user.uid,
        storeName: finalStoreName,
        identifier: data.identifier || '',
        supplierId: data.supplierId || 0,
        email: cleanEmail || '',
        syncKey: targetSyncKey,
        currentOtp: data.otp || '----',
        courier: data.courier || 'No Return',
        handoverCount: data.handoverCount || 0,
        dateTime: data.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        otpList: data.otpList || [],
        status: 'live',
        cookies: (data && data.cookies) ? data.cookies : (existingStore?.cookies || ''),
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      // Save credentials encrypted in local database on this device (isolated to user.uid)
      try {
        saveEncryptedStoreCredentials(targetSyncKey, {
          email: cleanEmail,
          password: meeshoPass,
          identifier: data?.identifier || existingStore?.identifier || '',
          supplierId: data?.supplierId || existingStore?.supplierId || 0,
          storeName: finalStoreName
        }, user.uid);
      } catch (e) {}

      if (isNativeMobile()) {
        try {
          const raw = localStorage.getItem('native_meesho_sessions');
          const sessions = raw ? JSON.parse(raw) : {};
          const sessObj = {
            email: cleanEmail,
            password: meeshoPass,
            identifier: data?.identifier || existingStore?.identifier || '',
            supplierId: data?.supplierId || existingStore?.supplierId || 0,
            storeName: finalStoreName,
            cookies: (data && data.cookies) ? data.cookies : (existingStore?.cookies || ''),
            expired: false
          };
          if (syncKey !== targetSyncKey && sessions[syncKey]) {
            delete sessions[syncKey];
          }
          sessions[targetSyncKey] = sessObj;
          localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
          setLocalSessions({ ...sessions });
          syncBackgroundSessions(sessions);
        } catch (e) {}
      }

      setNewStoreName('');
      setMeeshoEmail('');
      setMeeshoPass('');
      setShowAddModal(false);
      setConnectStep(1);
      showToast(`Store "${finalStoreName}" connected successfully!`, 'success');
    } catch (err) {
      console.error(err);
      setModalError(`Cannot reach automation server: ${err.message}. Please verify the automation server/tunnel is active.`);
    } finally {
      setSyncingAccount(false);
    }
  };

  const handleCloseConnectModal = () => {
    setShowAddModal(false);
    setSyncingAccount(false);
    setConnectStep(1);
    setGeneratedSyncKey('');
    setModalError('');
    setMeeshoEmail('');
    setMeeshoPass('');
    setNewStoreName('');
  };

  const handleOpenAddModal = () => {
    if (!isNativeMobile()) {
      showToast('To connect a Meesho store, please add it inside the OrderMunim Android App on your phone.', 'info', 'Mobile App Required');
      return;
    }
    setSyncingAccount(false);
    setModalError('');
    setConnectStep(1);
    setGeneratedSyncKey('');
    setMeeshoEmail('');
    setMeeshoPass('');
    setNewStoreName('');
    setShowAddModal(true);
  };


  // Delete an account with fancy confirmation dialog
  const handleDeleteAccount = (accId, storeName) => {
    setConfirmDialog({
      title: 'Remove Store',
      message: `Are you sure you want to remove ${storeName ? `"${storeName}"` : 'this store'} from your dashboard?`,
      confirmText: 'Remove Store',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'accounts', accId));
          if (isNativeMobile()) {
            try {
              const raw = localStorage.getItem('native_meesho_sessions');
              if (raw) {
                const sessions = JSON.parse(raw);
                delete sessions[accId];
                localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
                syncBackgroundSessions(sessions);
              }
            } catch {}
          }
          removeEncryptedStoreCredentials(accId);
          showToast('Store removed successfully', 'success');
        } catch (err) {
          showToast(`Error removing store: ${err.message}`, 'error');
        }
      }
    });
  };

  // Prompt Sign Out with confirmation dialog
  const handlePromptLogout = () => {
    setConfirmDialog({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out from your account?',
      confirmText: 'Sign Out',
      icon: 'logout',
      onConfirm: async () => {
        await handleLogout();
        showToast('Signed out successfully', 'info');
      }
    });
  };

  // Prompt Delete Account with confirmation dialog
  const handlePromptDeleteAccount = () => {
    setConfirmDialog({
      title: 'Delete Your Account',
      message: 'Are you sure you want to delete your account? All your linked stores and OTP data will be permanently removed. This action cannot be undone.',
      confirmText: 'Delete Account',
      icon: 'delete',
      onConfirm: async () => {
        try {
          if (!user) return;
          const uid = user.uid;

          // 1. Delete all stores linked to this user
          const userStores = accounts.filter(a => a.userId === uid);
          for (const s of userStores) {
            await deleteDoc(doc(db, 'accounts', s.id)).catch(() => {});
          }

          // 2. Clear mobile sessions if on mobile
          if (isNativeMobile()) {
            try {
              localStorage.removeItem('native_meesho_sessions');
            } catch {}
          }

          // 3. Delete user doc in Firestore
          await deleteDoc(doc(db, 'users', uid)).catch(() => {});

          // 4. Delete Firebase Auth account
          const currentUser = auth.currentUser;
          if (currentUser) {
            await currentUser.delete().catch((err) => {
              console.warn("Auth user delete:", err);
            });
          }

          await handleLogout();
          showToast('Your account has been deleted successfully.', 'info');
        } catch (err) {
          console.error("Delete account error:", err);
          showToast(`Error deleting account: ${err.message}`, 'error');
        }
      }
    });
  };

  // Handle Save / Toggle App Update Broadcast (Admin)
  const handleSaveAppUpdateBroadcast = async (activateState) => {
    setBroadcastSaving(true);
    try {
      const graceDaysNum = Number(broadcastGraceDays) || 2;
      const publishedDate = new Date();
      const deadlineDate = new Date(Date.now() + graceDaysNum * 24 * 60 * 60 * 1000);

      const updateData = {
        active: activateState,
        versionCode: Number(broadcastVersionCode) || 2,
        versionName: broadcastVersionName.trim() || '1.1',
        title: broadcastTitle.trim() || 'New Update Available!',
        message: broadcastMessage.trim(),
        downloadUrl: broadcastUrl.trim() || 'https://github.com/RRTraders/ordermunim_live/raw/main/meesho_otp.apk',
        updateMode: broadcastMode,
        graceDays: graceDaysNum,
        publishedAt: (appUpdateConfig?.publishedAt && !activateState) ? appUpdateConfig.publishedAt : publishedDate.toISOString(),
        deadlineAt: broadcastMode === 'grace_period' ? deadlineDate.toISOString() : null,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'config', 'app_update'), updateData, { merge: true });
      setBroadcastActive(activateState);
      showToast(
        activateState
          ? `Broadcast published! Users have ${graceDaysNum} days grace period before force update.`
          : 'Update broadcast deactivated.',
        'success'
      );
    } catch (err) {
      console.error("Save broadcast error:", err);
      showToast(`Failed to update broadcast: ${err.message}`, 'error');
    } finally {
      setBroadcastSaving(false);
    }
  };

  // Compute In-App Update Status for Current User
  const getAppUpdateStatus = () => {
    // Only prompt for APK update on native Android mobile app!
    // On web / desktop browsers, the app is already live from Firebase Hosting.
    if (!isNativeMobile()) {
      return { shouldPrompt: false };
    }

    if (!appUpdateConfig || !appUpdateConfig.active) {
      return { shouldPrompt: false };
    }

    const targetVersion = Number(appUpdateConfig.versionCode) || 1;
    const isOlder = installedVersionCode < targetVersion;
    if (!isOlder) {
      return { shouldPrompt: false };
    }

    const mode = appUpdateConfig.updateMode || 'grace_period';
    const downloadUrl = appUpdateConfig.downloadUrl || 'https://github.com/RRTraders/ordermunim_live/raw/main/meesho_otp.apk';
    const versionName = appUpdateConfig.versionName || `v${targetVersion}`;

    if (mode === 'force_immediate') {
      return {
        shouldPrompt: true,
        isForce: true,
        downloadUrl,
        title: appUpdateConfig.title || 'Mandatory App Update',
        message: appUpdateConfig.message || 'A required update is available. You must update to continue using Meesho OTP.',
        versionName
      };
    }

    if (mode === 'optional') {
      if (updateDismissed || (dismissedUpdateCode && dismissedUpdateCode >= targetVersion)) {
        return { shouldPrompt: false };
      }
      return {
        shouldPrompt: true,
        isForce: false,
        isGrace: false,
        downloadUrl,
        title: appUpdateConfig.title || 'New Update Available',
        message: appUpdateConfig.message || 'A new update is available for Meesho OTP.',
        versionName
      };
    }

    // mode === 'grace_period'
    const deadline = appUpdateConfig.deadlineAt ? new Date(appUpdateConfig.deadlineAt).getTime() : 0;
    const now = Date.now();
    const isExpired = deadline > 0 && now >= deadline;

    if (isExpired) {
      return {
        shouldPrompt: true,
        isForce: true,
        downloadUrl,
        title: 'Update Required to Continue',
        message: appUpdateConfig.message || `Your ${appUpdateConfig.graceDays || 2}-day grace period has expired. You must update to version ${versionName} to continue using Meesho OTP.`,
        versionName
      };
    }

    if (updateDismissed || (dismissedUpdateCode && dismissedUpdateCode >= targetVersion)) {
      return { shouldPrompt: false };
    }

    const diffMs = Math.max(0, deadline - now);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;

    let remainingText = '';
    if (diffDays > 0) {
      remainingText = `${diffDays}d ${remHours}h left`;
    } else {
      remainingText = `${diffHours}h left`;
    }

    return {
      shouldPrompt: true,
      isForce: false,
      isGrace: true,
      remainingText,
      downloadUrl,
      title: appUpdateConfig.title || 'New Update Available',
      message: appUpdateConfig.message || 'Please update your app to access the latest features and bug fixes.',
      versionName
    };
  };

  // Trigger In-App APK Download & Direct Android Install
  const handleInstallAppUpdate = async (url) => {
    const targetUrl = url || 'https://github.com/RRTraders/ordermunim_live/raw/main/meesho_otp.apk';
    setUpdateDownloading(true);
    setDownloadProgress(0);
    setUpdateStatusText('Connecting to update server...');

    try {
      await downloadAndInstallApk(targetUrl, (progress) => {
        if (progress.status === 'downloading') {
          setDownloadProgress(progress.percent || 0);
          setUpdateStatusText(`Downloading update... ${progress.percent}%`);
        } else if (progress.status === 'installing') {
          setDownloadProgress(100);
          setUpdateStatusText('Download complete! Launching package installer...');
          const newCode = Number(appUpdateConfig?.versionCode) || CURRENT_APP_VERSION_CODE;
          const newName = String(appUpdateConfig?.versionName || CURRENT_APP_VERSION_NAME);
          localStorage.setItem('om_installed_version_code', String(newCode));
          localStorage.setItem('om_installed_version_name', String(newName));
          setInstalledVersionCode(newCode);
          setInstalledVersionName(newName);
          handleDismissUpdate(newCode);
        } else if (progress.status === 'connecting') {
          setUpdateStatusText('Connecting to update server...');
        }
      });

      setTimeout(() => {
        setUpdateDownloading(false);
      }, 4000);
    } catch (err) {
      console.error("Install update error:", err);
      showToast(`Update error: ${err.message || err}`, 'error');
      setUpdateDownloading(false);
    }
  };

  // Copy to clipboard with toast
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Fix / Re-Request Battery Optimization Exemption
  const handleFixBatteryOptimization = async () => {
    if (isNativeMobile()) {
      showToast('Checking battery optimization status...', 'info');
      try {
        const res = await requestBatteryOptimization();
        if (res.isIgnoring) {
          showToast('✓ Battery optimization is already disabled! App runs 24/7 in background.', 'success');
        } else {
          showToast('Prompt requested. Please tap "Allow" so OTPs sync 24/7.', 'info');
        }
      } catch {
        showToast('Opening system app settings...', 'info');
        await openAppSettings();
      }
    } else {
      showToast('On Android mobile, open App Settings > Battery > select "Unrestricted" so Meesho OTP is never stopped by Android.', 'info');
    }
  };

  // Handle Open App Info Settings
  const handleOpenSystemAppSettings = async () => {
    if (isNativeMobile()) {
      try {
        await openAppSettings();
        showToast('Opening App Settings... Enable Notifications & set Battery to Unrestricted.', 'info');
      } catch (err) {
        showToast(`Could not open settings: ${err.message}`, 'error');
      }
    } else {
      showToast('Web browser does not require system battery optimization.', 'info');
    }
  };

  // Admin: load all users and all platform stores only when Admin tab is active & unlocked
  useEffect(() => {
    if (activeTab !== 'admin' || !adminAuthenticated) return;
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const uList = [];
      snapshot.forEach((d) => {
        uList.push({ id: d.id, ...d.data() });
      });
      setAllUsersList(uList);
    });

    const unsubAllAccounts = onSnapshot(collection(db, 'accounts'), (snapshot) => {
      const accList = [];
      snapshot.forEach((d) => {
        accList.push({ id: d.id, ...d.data() });
      });
      setAllPlatformAccounts(accList);
    });

    return () => {
      unsubUsers();
      unsubAllAccounts();
    };
  }, [activeTab, adminAuthenticated]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (adminInputPass === ADMIN_PASS || adminInputPass === '@rrt123') {
      setAdminAuthenticated(true);
      showToast('Admin Console Unlocked', 'success');
    } else {
      showToast('Incorrect admin secret password', 'error');
    }
  };

  // Admin: Update user quota limit
  const handleUpdateUserQuota = async (targetUid, newLimit) => {
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        maxAccounts: parseInt(newLimit, 10)
      });
      showToast(`Store quota updated to ${newLimit}`, 'success');
    } catch (err) {
      showToast(`Error updating quota: ${err.message}`, 'error');
    }
  };

  // Admin: Toggle On Hold status
  const handleToggleUserStatus = async (targetUid, currentStatus) => {
    const newStatus = currentStatus === 'on_hold' ? 'active' : 'on_hold';
    try {
      await updateDoc(doc(db, 'users', targetUid), { status: newStatus });
      showToast(newStatus === 'on_hold' ? 'Account placed on hold' : 'Account activated', 'info');
    } catch (err) {
      showToast(`Error updating status: ${err.message}`, 'error');
    }
  };

  // Admin: Send or toggle payment alert notification
  const handleTogglePaymentAlert = async (targetUid, currentAlert, slots) => {
    const newAlert = !currentAlert;
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        paymentAlert: newAlert,
        paymentAmount: (slots || 1) * 249
      });
      showToast(newAlert ? 'Payment alert sent to client' : 'Payment alert cancelled', 'info');
    } catch (err) {
      showToast(`Error updating payment alert: ${err.message}`, 'error');
    }
  };

  // Admin: Delete main user account and all their stores with fancy confirmation dialog
  const handleDeleteUserAccount = (targetUid, userIdentifier) => {
    setConfirmDialog({
      title: 'Delete Client Account',
      message: `Permanently delete client (${userIdentifier || targetUid}) and all associated stores? This action cannot be undone.`,
      confirmText: 'Delete Permanently',
      onConfirm: async () => {
        try {
          const userStores = allPlatformAccounts.filter(a => a.userId === targetUid);
          for (const s of userStores) {
            await deleteDoc(doc(db, 'accounts', s.id));
          }
          await deleteDoc(doc(db, 'users', targetUid));
          showToast('Client account and stores deleted successfully', 'success');
        } catch (err) {
          showToast(`Error deleting account: ${err.message}`, 'error');
        }
      }
    });
  };

  const renderUpdateProgressModal = () => {
    if (!updateDownloading) return null;
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl shadow-cyan-950/70 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-cyan-950/50">
            <DownloadCloud className="w-8 h-8 animate-bounce" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white">Updating OrdersMunim</h3>
            <p className="text-xs text-slate-300">
              {updateStatusText || 'Downloading update package...'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-300 shadow-md shadow-cyan-500/50"
                style={{ width: `${Math.max(5, downloadProgress)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span className="text-cyan-400 font-bold">{downloadProgress}%</span>
              <span>In-App Auto Install</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            Please wait. Your settings, stores, and OTP history will be preserved.
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const updateStatus = getAppUpdateStatus();

  // If Force Update is active (grace period expired or immediate), lock out all non-super-admin users
  if (!isSuperAdmin && updateStatus.isForce && updateStatus.shouldPrompt) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 text-white">
        <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl shadow-rose-950/60 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center shadow-lg shadow-rose-950/50">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-widest inline-block">
              {appUpdateConfig?.updateMode === 'force_immediate' ? 'Mandatory Update' : 'Grace Period Expired'}
            </span>
            <h3 className="text-lg font-bold text-white">Update Required to Continue</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {updateStatus.message}
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs text-left space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Installed Version</span>
              <span className="font-mono text-slate-400">v{installedVersionName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Required Version</span>
              <span className="font-mono font-bold text-cyan-400">{updateStatus.versionName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Access Status</span>
              <span className="font-bold text-rose-400">Locked</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleInstallAppUpdate(updateStatus.downloadUrl)}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Rocket className="w-5 h-5" />
              Install Latest Update Now
            </button>
            <p className="text-[11px] text-slate-500 mt-2">
              Tap above to download the APK. Your existing login and stores will remain intact.
            </p>
          </div>
        </div>
        {renderUpdateProgressModal()}
      </div>
    );
  }

  // ===================== STAFF VIEW ONLY (WAREHOUSE DISPLAY) =====================
  if (activeTab === 'staff') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-cyan-400">
                <Truck className="w-6 h-6 text-cyan-400" />
                Warehouse Return OTPs
              </h1>
              <p className="text-xs text-slate-400 mt-1">Live Feed • Ready for Courier Delivery Partners</p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Sync
            </div>
          </div>

          <div className="space-y-4">
            {accounts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                No active return OTPs at this moment. Waiting for logistics delivery...
              </div>
            ) : (
              accounts.map((acc) => {
                const isOnHold = profile?.status === 'on_hold';
                const activeOtps = (Array.isArray(acc.otpList) && acc.otpList.length > 0)
                  ? acc.otpList
                  : (acc.currentOtp && acc.currentOtp !== '----'
                      ? [{ courier: acc.courier || 'Courier', otp: acc.currentOtp, handoverCount: acc.handoverCount || 0, dateTime: acc.dateTime }]
                      : []);

                const isExpanded = Boolean(expandedStoreIds[acc.id]);
                return (
                  <div key={acc.id} className={`bg-slate-900 border ${isOnHold ? 'border-rose-500/40 bg-slate-950/80 shadow-rose-950/20' : isExpanded ? 'border-cyan-500/40 shadow-lg shadow-cyan-950/20' : 'border-slate-800 hover:border-slate-700/80'} rounded-2xl p-4 transition-all shadow-md relative overflow-hidden`}>
                    <div className={`transition-all duration-300 ${isOnHold ? 'filter blur-md opacity-30 select-none pointer-events-none' : ''}`}>
                      {/* Clickable Header Bar (Tap to Expand/Collapse) */}
                      <div 
                        onClick={() => toggleStoreExpand(acc.id)}
                        className="flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            activeOtps.length > 0 
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            <Package className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-base text-white truncate hover:text-cyan-300 transition-colors">
                                {acc.storeName}
                              </span>
                              {activeOtps.length > 0 ? (
                                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  {activeOtps.length} {activeOtps.length === 1 ? 'OTP' : 'OTPs'}
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 font-medium">
                                  No Return
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="p-1 text-slate-400">
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-cyan-400' : ''}`} />
                        </div>
                      </div>

                      {/* Expanded Section: Single Row OTPs */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 animate-in fade-in duration-150">
                          {activeOtps.length > 0 ? (
                            activeOtps.map((item, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center justify-between gap-2 p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl"
                              >
                                {/* 1. Courier Name */}
                                <div className="flex items-center gap-1.5 min-w-[90px] shrink-0">
                                  <Truck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span className="font-bold text-xs text-white truncate max-w-[120px]">
                                    {item.courier || 'Courier'}
                                  </span>
                                </div>

                                {/* 2. Parcel Count */}
                                <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                                  <Package className="w-3 h-3 text-slate-500" />
                                  <span>{item.handoverCount || 0} {item.handoverCount === 1 ? 'Parcel' : 'Parcels'}</span>
                                </div>

                                {/* 3. OTP Code */}
                                <div className="font-mono font-black text-base md:text-lg text-amber-400 tracking-wider shrink-0 px-2.5 py-0.5 bg-amber-500/10 rounded-lg border border-amber-500/25">
                                  {item.otp || '----'}
                                </div>

                                {/* 4. Copy Icon Button */}
                                {item.otp && item.otp !== '----' ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopy(item.otp, `${acc.id}-${idx}`);
                                    }}
                                    className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 border border-amber-500/30 transition-all shrink-0 cursor-pointer"
                                    title="Copy OTP"
                                  >
                                    {copiedId === `${acc.id}-${idx}` ? (
                                      <Check className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </button>
                                ) : (
                                  <div className="w-7 h-7" />
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800/50 rounded-xl text-xs text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                No active return courier right now
                              </span>
                              <span className="font-mono text-slate-500 font-bold">----</span>
                            </div>
                          )}

                          {/* Footer Details */}
                          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                            <span>Checked: {acc.dateTime || 'Just now'}</span>
                            <span>Total: {acc.handoverCount || 0} parcels</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {isOnHold && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px] text-center select-none">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-2 shadow-xl shadow-rose-950/50">
                          <PauseCircle className="w-6 h-6 animate-pulse" />
                        </div>
                        <span className="text-sm font-bold text-white tracking-wider uppercase">
                          Account On Hold
                        </span>
                        <span className="text-xs text-rose-300 mt-0.5">
                          OTP service paused
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===================== EMAIL VERIFICATION REQUIRED SCREEN =====================
  if (user && emailNeedsVerification) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <MailCheck className="w-8 h-8 text-white" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Verify Your Email</h2>
            <p className="text-xs text-slate-400 mt-1.5">
              We have sent an official verification link to:
            </p>
            <span className="inline-block mt-2 font-mono text-sm font-bold text-cyan-400 bg-cyan-950/70 border border-cyan-800/80 px-3.5 py-1.5 rounded-xl">
              {user.email}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-300 text-left space-y-2.5">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
              <span>Open your email inbox (also check Spam/Junk folder if not in Inbox).</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
              <span>Click the <strong>verification link</strong> sent by Firebase.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
              <span>Come back here and click <strong>"I Have Verified (Continue)"</strong> below.</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleCheckVerified}
              disabled={authLoading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {authLoading ? 'Verifying status...' : 'I Have Verified (Continue)'}
            </button>

            <button
              onClick={handleResendVerificationEmail}
              disabled={authLoading}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              Resend Verification Link
            </button>

            <button
              onClick={handleLogout}
              className="w-full text-xs text-slate-500 hover:text-rose-400 transition-colors pt-2 block"
            >
              Log out / Use different account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== AUTH SCREEN (CUSTOMER & SUPER ADMIN) =====================
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-3 overflow-hidden bg-white p-1 border border-slate-700">
              <img src="/logo.png" alt="OrdersMunim" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">OrdersMunim</h1>
            <p className="text-xs text-slate-400 mt-1">Smart Multi-Account Return Handover &amp; OTP Hub</p>
          </div>

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl text-xs flex items-center gap-2 mb-5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Unified Authentication (Sign In / Sign Up) */}
          <div>
            {/* Mode Tabs (Sign In vs Create Account) */}
              {authMode !== 'forgot' && (
                <div className="flex items-center justify-center gap-6 border-b border-slate-800 pb-3 mb-5">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    className={`text-sm font-bold pb-2 transition-all relative ${
                      authMode === 'login' 
                        ? 'text-cyan-400 border-b-2 border-cyan-400' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                    className={`text-sm font-bold pb-2 transition-all relative ${
                      authMode === 'signup' 
                        ? 'text-cyan-400 border-b-2 border-cyan-400' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {/* 1. CUSTOMER SIGN IN FORM */}
              {authMode === 'login' && (
                <form onSubmit={handleCustomerLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="seller@example.com"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => { setAuthMode('forgot'); setAuthError(''); }}
                        className="text-[11px] text-cyan-400 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="password"
                        value={customerPassword}
                        onChange={(e) => setCustomerPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
                  >
                    {authLoading ? 'Signing In...' : 'Sign In to Dashboard'}
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-400">
                      New to Meesho OTP Hub?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                        className="text-cyan-400 font-bold hover:underline"
                      >
                        Sign Up
                      </button>
                    </span>
                  </div>
                </form>
              )}

              {/* 2. CUSTOMER SIGN UP FORM (NAME + EMAIL + PASSWORD + EMAIL VERIFICATION) */}
              {authMode === 'signup' && (
                <form onSubmit={handleCustomerSignup} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Rajesh Kumar"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="seller@example.com"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Create Password (Min 6 Characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="password"
                        value={customerPassword}
                        onChange={(e) => setCustomerPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="password"
                        value={customerConfirmPass}
                        onChange={(e) => setCustomerConfirmPass(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 p-2.5 rounded-xl">
                    📧 An official verification link will be sent to your email. You must verify your email before accessing the dashboard.
                  </p>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
                  >
                    {authLoading ? 'Creating Account...' : 'Sign Up & Send Verification Link'}
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-400">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthMode('login'); setAuthError(''); }}
                        className="text-cyan-400 font-bold hover:underline"
                      >
                        Sign In
                      </button>
                    </span>
                  </div>
                </form>
              )}

              {/* 3. FORGOT PASSWORD FORM */}
              {authMode === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="text-center mb-3">
                    <h3 className="font-bold text-white text-base">Reset Your Password</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Enter your email address and we will send you a password reset link.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="seller@example.com"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
                  >
                    {authLoading ? 'Sending link...' : 'Send Password Reset Link'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    className="w-full text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 pt-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </button>
                </form>
              )}
            </div>

        </div>
      </div>
    );
  }

  // ===================== LOGGED IN SELLER DASHBOARD =====================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation / Mobile Toolbar */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Left: Mobile App Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white shadow-md border border-slate-700/60 flex items-center justify-center p-0.5">
              <img src="/logo.png" alt="OrdersMunim" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-bold text-white hidden sm:inline-block">OrdersMunim</span>
          </div>

          {/* Center: Welcome User's Name */}
          <div className="flex-1 text-center px-1 truncate">
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate block">
              Welcome, <span className="text-cyan-400">{profile?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Seller')}</span>
            </span>
            {isSuperAdmin && (
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                Super Admin
              </span>
            )}
          </div>

          {/* Right: Sound Icon */}
          <div className="flex items-center gap-2 shrink-0">
            {!isSuperAdmin && (
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Mute OTP Audio" : "Enable OTP Audio"}
                className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 pb-28 space-y-6">
        {activeTab === 'profile' ? (
          <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
            {/* 1. Round Profile Picture */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-cyan-500/25 border-4 border-slate-800 uppercase">
                {(profile?.name || user?.displayName || user?.email || 'U')[0]}
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">
                  {profile?.name || user?.displayName || 'Seller User'}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {user?.email || profile?.email || user?.phoneNumber || ''}
                </p>
                <div className="mt-2.5 flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider">
                    {profile.maxAccounts !== undefined ? `${profile.maxAccounts} Store Slots` : '0 Store Slots'}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    {accounts.length} Linked Stores
                  </span>
                  {isSuperAdmin && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase tracking-wider">
                      Super Admin
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Connected Stores Quota Box */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm text-white">Connected Stores</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {accounts.length} / {profile.maxAccounts ?? 0} Slots Used
                </span>
                {accounts.length >= (profile.maxAccounts ?? 0) && (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                    Limit Reached
                  </span>
                )}
              </div>
            </div>

            {/* Account Details Box */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>Account Role</span>
                <strong className="text-white capitalize">{profile?.role || 'Seller'}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Email Status</span>
                <strong className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </strong>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>App Version</span>
                <div className="flex items-center gap-2">
                  <strong className="text-white font-mono">v{installedVersionName}</strong>
                  {installedVersionCode >= (Number(appUpdateConfig?.versionCode) || CURRENT_APP_VERSION_CODE) ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" /> Up to date
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      Update Available
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* App Update Broadcast Section (Super Admin Only) */}
            {isSuperAdmin && (
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Rocket className="w-4 h-4 text-cyan-400" />
                    App Update Broadcast
                  </span>
                  {broadcastActive ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      Live v{broadcastVersionName}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Manage app releases, push in-app update notices, configure direct APK download link, and set force-lock deadlines for all clients.
                </p>
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(true)}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-cyan-300 border border-cyan-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                  App Update Broadcast
                  {broadcastActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Broadcast Active"></span>
                  )}
                </button>
              </div>
            )}

            {/* Background Sync & Battery Optimization Card */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Background Sync & Permissions
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Android 24/7
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                If background OTP alerts stop or you previously denied battery permissions, tap below to grant exemption and keep syncing 24/7.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleFixBatteryOptimization}
                  className="w-full py-2.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  Fix Battery Optimization
                </button>
                <button
                  type="button"
                  onClick={handleOpenSystemAppSettings}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  App Settings / Permissions
                </button>
              </div>
            </div>

            {/* Actions Section */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              {/* 2. Sign Out button with icon (triggers confirmation dialog first) */}
              <button
                type="button"
                onClick={handlePromptLogout}
                className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <LogOut className="w-4 h-4 text-cyan-400" />
                Sign Out
              </button>

              {/* 3. Delete this account in red font small letters (triggers confirmation dialog first) */}
              {!isSuperAdmin && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handlePromptDeleteAccount}
                    className="text-xs text-rose-500 hover:text-rose-400 hover:underline transition-colors lowercase font-medium"
                  >
                    delete this account
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'cropper' ? (
          <LabelCropper showToast={showToast} />
        ) : (
          <>
            {/* ================= ADMIN VIEW (SUPER ADMIN ONLY - ZERO OTPs) ================= */}
            {isSuperAdmin ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-6">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  Admin Management Console
                </h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  <span>Clients: <strong className="text-white">{allUsersList.filter(u => u.role !== 'super_admin').length}</strong></span>
                  <span>•</span>
                  <span>Total Stores: <strong className="text-cyan-400">{allPlatformAccounts.length}</strong></span>
                  <span>•</span>
                  <span>Monthly Revenue: <strong className="text-amber-400 font-mono">₹{(allPlatformAccounts.length * 249).toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
            </div>

            {/* User Tab Switcher: Activated vs Pending Activation with Search & Pagination */}
            {(() => {
              const clientUsers = allUsersList.filter(u => u.role !== 'super_admin');
              const activatedUsers = clientUsers.filter(u => u.emailVerified !== false);
              const pendingUsers = clientUsers.filter(u => u.emailVerified === false);

              const currentList = adminUserTab === 'activated' ? activatedUsers : pendingUsers;

              // Search Filter
              const filteredUsers = currentList.filter(u => {
                if (!adminSearchQuery.trim()) return true;
                const q = adminSearchQuery.trim().toLowerCase();
                const emailMatch = (u.email || '').toLowerCase().includes(q);
                const nameMatch = (u.name || '').toLowerCase().includes(q);
                const mobileMatch = (u.mobile || '').toLowerCase().includes(q);
                const idMatch = (u.id || '').toLowerCase().includes(q);
                const userStores = allPlatformAccounts.filter(a => a.userId === u.id);
                const storeMatch = userStores.some(s => 
                  (s.storeName || '').toLowerCase().includes(q) || 
                  (s.syncKey || '').toLowerCase().includes(q)
                );
                return emailMatch || nameMatch || mobileMatch || idMatch || storeMatch;
              });

              // Pagination calculations (10 per page)
              const totalUsersCount = filteredUsers.length;
              const totalPages = Math.max(1, Math.ceil(totalUsersCount / ADMIN_PAGE_SIZE));
              const safePage = Math.min(Math.max(1, adminCurrentPage), totalPages);
              const startIndex = (safePage - 1) * ADMIN_PAGE_SIZE;
              const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ADMIN_PAGE_SIZE);

              return (
                <>
                  {/* Top Bar: Tabs & Search Input */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    {/* Tabs */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => { setAdminUserTab('activated'); setAdminCurrentPage(1); }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                          adminUserTab === 'activated'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-transparent'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Activated Accounts ({activatedUsers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAdminUserTab('pending'); setAdminCurrentPage(1); }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
                          adminUserTab === 'pending'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-transparent'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Pending Activation ({pendingUsers.length})
                        {pendingUsers.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        )}
                      </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-80">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={adminSearchQuery}
                        onChange={(e) => {
                          setAdminSearchQuery(e.target.value);
                          setAdminCurrentPage(1);
                        }}
                        placeholder="Search email, name, UID, store..."
                        className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                      {adminSearchQuery && (
                        <button
                          onClick={() => {
                            setAdminSearchQuery('');
                            setAdminCurrentPage(1);
                          }}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* TAB 1: ACTIVATED ACCOUNTS */}
                  {adminUserTab === 'activated' && (
                    <div className="space-y-4">
                      {totalUsersCount === 0 ? (
                        adminSearchQuery ? (
                          <div className="py-12 text-center text-xs text-slate-500 space-y-2 bg-slate-950/60 rounded-2xl border border-slate-800/60">
                            <Search className="w-8 h-8 text-slate-600 mx-auto mb-1" />
                            <p className="font-semibold text-slate-300">No activated users match "{adminSearchQuery}"</p>
                            <p className="text-slate-500">Try searching by email, name, UID, or linked store name.</p>
                            <button
                              onClick={() => { setAdminSearchQuery(''); setAdminCurrentPage(1); }}
                              className="text-cyan-400 hover:underline pt-1 text-xs font-semibold"
                            >
                              Clear Search Filter
                            </button>
                          </div>
                        ) : (
                          <div className="py-8 text-center text-xs text-slate-500">
                            No activated client sellers yet.
                          </div>
                        )
                      ) : (
                        paginatedUsers.map((u, idx) => {
                          const userStores = allPlatformAccounts.filter(a => a.userId === u.id);
                          const quota = u.maxAccounts !== undefined ? u.maxAccounts : 0;
                          const sequenceNum = startIndex + idx + 1;

                          return (
                            <div key={u.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
                              {/* Top: Client Info & Actions */}
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Sequence Number Badge */}
                                    <span className="px-2 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-sm" title={`Account #${sequenceNum}`}>
                                      #{sequenceNum}
                                    </span>
                                    <span className="font-bold text-white text-base">
                                      📱 {u.mobile || u.email || 'Client User'}
                                    </span>
                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Activated
                                    </span>
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                      u.status === 'on_hold' 
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                    }`}>
                                      {u.status === 'on_hold' ? 'On Hold' : 'Active'}
                                    </span>
                                    {u.paymentAlert && (
                                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                                        <BellRing className="w-2.5 h-2.5" /> Payment Alert Sent
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-3 flex-wrap">
                                    <span>UID: {u.id}</span>
                                    {u.name && <span className="text-slate-400 font-sans">Name: <strong>{u.name}</strong></span>}
                                    {u.createdAt && (
                                      <span>Joined: {new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    )}
                                  </div>
                                </div>

                                {/* Quick Admin Action Buttons */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Toggle On Hold */}
                                  <button
                                    onClick={() => handleToggleUserStatus(u.id, u.status)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                                      u.status === 'on_hold'
                                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow'
                                        : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                    }`}
                                  >
                                    <PauseCircle className="w-3.5 h-3.5" />
                                    {u.status === 'on_hold' ? 'Activate Account' : 'Put On Hold'}
                                  </button>

                                  {/* Send Payment Alert */}
                                  <button
                                    onClick={() => handleTogglePaymentAlert(u.id, u.paymentAlert, quota)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                                      u.paymentAlert
                                        ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                    }`}
                                  >
                                    <BellRing className="w-3.5 h-3.5" />
                                    {u.paymentAlert ? 'Cancel Payment Alert' : 'Send Payment Alert'}
                                  </button>

                                  {/* Delete Main Account */}
                                  <button
                                    onClick={() => handleDeleteUserAccount(u.id, u.mobile || u.email)}
                                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1.5"
                                    title="Delete client account and stores"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Account
                                  </button>
                                </div>
                              </div>

                              {/* Middle: Store Slot Management */}
                              <div className="bg-slate-900/80 p-3.5 rounded-xl flex items-center justify-between gap-3 border border-slate-800">
                                <div>
                                  <span className="text-xs text-slate-400 font-medium block">
                                    Store Quota
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-sm font-bold text-white font-mono">
                                      {quota} {quota === 1 ? 'Store Slot' : 'Store Slots'}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      ({userStores.length} Used)
                                    </span>
                                  </div>
                                </div>

                                {/* Plus / Minus Buttons for Store Quota */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleUpdateUserQuota(u.id, Math.max(0, quota - 1))}
                                    disabled={quota <= 0}
                                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-bold flex items-center justify-center text-sm transition-colors"
                                    title="Decrease slot limit"
                                  >
                                    -
                                  </button>
                                  <span className="text-sm font-bold text-white px-2 font-mono">
                                    {quota}
                                  </span>
                                  <button
                                    onClick={() => handleUpdateUserQuota(u.id, quota + 1)}
                                    className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all shadow-md shadow-cyan-500/20"
                                    title="Add store slot (+1)"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Store Slot (+1)
                                  </button>
                                </div>
                              </div>

                              {/* Bottom: Linked Stores List (NO OTP SHOWN) */}
                              <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                                  Linked Stores ({userStores.length})
                                </span>
                                {userStores.length === 0 ? (
                                  <span className="text-xs text-slate-500 italic block">
                                    No Meesho stores linked yet.
                                  </span>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {userStores.map(store => (
                                      <div key={store.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                                        <div>
                                          <span className="font-bold text-white block">📦 {store.storeName}</span>
                                          <span className="text-[11px] text-slate-400 font-mono">Sync: {store.syncKey} {store.email ? `• ${store.email}` : ''}</span>
                                        </div>
                                        <button
                                          onClick={() => handleDeleteAccount(store.id, store.storeName)}
                                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                                          title="Delete store"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* TAB 2: PENDING ACTIVATION ACCOUNTS */}
                  {adminUserTab === 'pending' && (
                    <div className="space-y-4">
                      {totalUsersCount === 0 ? (
                        adminSearchQuery ? (
                          <div className="py-12 text-center text-xs text-slate-500 space-y-2 bg-slate-950/60 rounded-2xl border border-slate-800/60">
                            <Search className="w-8 h-8 text-slate-600 mx-auto mb-1" />
                            <p className="font-semibold text-slate-300">No pending users match "{adminSearchQuery}"</p>
                            <p className="text-slate-500">Try searching by email, name, or UID.</p>
                            <button
                              onClick={() => { setAdminSearchQuery(''); setAdminCurrentPage(1); }}
                              className="text-cyan-400 hover:underline pt-1 text-xs font-semibold"
                            >
                              Clear Search Filter
                            </button>
                          </div>
                        ) : (
                          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400/50 mx-auto" />
                            <p className="font-semibold text-slate-300">All registered accounts are activated!</p>
                            <p>No client registrations are currently waiting for email verification.</p>
                          </div>
                        )
                      ) : (
                        paginatedUsers.map((u, idx) => {
                          const sequenceNum = startIndex + idx + 1;

                          return (
                            <div key={u.id} className="bg-slate-950 border border-amber-500/30 rounded-2xl p-5 space-y-3 shadow-md">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Sequence Number Badge */}
                                    <span className="px-2 py-0.5 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-sm" title={`Pending #${sequenceNum}`}>
                                      #{sequenceNum}
                                    </span>
                                    <span className="font-bold text-white text-base">
                                      ✉️ {u.email || u.mobile || 'Client User'}
                                    </span>
                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" /> Pending Activation
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                                    {u.name && <span>Name: <strong className="text-slate-200">{u.name}</strong></span>}
                                    <span className="font-mono text-slate-500">UID: {u.id}</span>
                                    {u.createdAt && (
                                      <span>Registered: {new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    )}
                                  </div>
                                </div>

                                {/* Admin Actions */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Manually Activate Email Button */}
                                  <button
                                    onClick={() => handleAdminManualActivate(u.id, u.email)}
                                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                                    title="Manually verify email and activate user immediately"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Manually Activate Email
                                  </button>

                                  {/* Delete Pending User */}
                                  <button
                                    onClick={() => handleDeleteUserAccount(u.id, u.email)}
                                    className="px-3 py-2 text-xs font-bold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1.5"
                                    title="Delete this pending registration"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                </div>
                              </div>

                              <p className="text-xs text-slate-400">
                                This user registered but hasn't clicked the verification link sent to their email. Click <strong>"Manually Activate Email"</strong> to activate their account immediately without requiring email confirmation.
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Pagination Controls Bar */}
                  {totalUsersCount > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
                      <div>
                        Showing <strong className="text-white">{startIndex + 1}</strong> to <strong className="text-white">{Math.min(startIndex + ADMIN_PAGE_SIZE, totalUsersCount)}</strong> of <strong className="text-cyan-400 font-mono">{totalUsersCount}</strong> {adminUserTab === 'activated' ? 'activated' : 'pending'} accounts
                        {adminSearchQuery && <span className="text-slate-500 ml-1.5">(matching "{adminSearchQuery}")</span>}
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center gap-1.5 self-center sm:self-auto">
                          <button
                            type="button"
                            disabled={safePage <= 1}
                            onClick={() => setAdminCurrentPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold flex items-center gap-1 transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" /> Prev
                          </button>

                          {/* Page Number Buttons */}
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                              if (
                                totalPages > 7 &&
                                pageNum !== 1 &&
                                pageNum !== totalPages &&
                                Math.abs(pageNum - safePage) > 1
                              ) {
                                if (pageNum === 2 || pageNum === totalPages - 1) {
                                  return <span key={pageNum} className="text-slate-600 px-1 font-mono">...</span>;
                                }
                                return null;
                              }

                              return (
                                <button
                                  key={pageNum}
                                  type="button"
                                  onClick={() => setAdminCurrentPage(pageNum)}
                                  className={`w-7 h-7 rounded-lg font-mono font-bold text-xs transition-colors ${
                                    safePage === pageNum
                                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                                      : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            disabled={safePage >= totalPages}
                            onClick={() => setAdminCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold flex items-center gap-1 transition-colors"
                          >
                            Next <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          /* ================= MAIN DASHBOARD TAB ================= */
          <>
            {/* Account Status Alerts */}
            {profile.status === 'on_hold' && (
              <div className="bg-rose-500/10 border-2 border-rose-500/40 text-rose-200 p-4 rounded-2xl flex items-center gap-3.5 shadow-lg">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm text-white">Account On Hold</h3>
                  <p className="text-xs text-rose-300 mt-0.5">
                    Your account is currently on hold. Please contact admin to activate your service.
                  </p>
                </div>
              </div>
            )}

            {profile.paymentAlert && profile.status !== 'on_hold' && (
              <div className="bg-amber-500/10 border-2 border-amber-500/40 text-amber-200 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <BellRing className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs text-white">Subscription Payment Due Alert</h4>
                    <p className="text-xs text-amber-300 mt-0.5">
                      Your payment of ₹{profile.paymentAmount || ((profile.maxAccounts || 1) * 249)} is due. Please pay to keep your stores active.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Account Quota & Controls Bar (Desktop Only; on mobile/app it is shifted to Profile) */}
            <div className="hidden md:flex bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 items-center justify-between shadow-lg">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base md:text-lg font-bold text-white">Connected Stores</h2>
                <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {accounts.length} / {profile.maxAccounts ?? 0} Slots Used
                </span>
                {accounts.length >= (profile.maxAccounts ?? 0) && (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                    Limit Reached
                  </span>
                )}
              </div>

              {/* Action Button: Visible on Android App; on Web browser guides to Mobile App */}
              <div className="flex items-center gap-2.5">
                {!isNativeMobile() ? (
                  <div className="flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-800/40 px-3 py-1.5 rounded-xl text-cyan-300 text-xs font-medium">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    <span>Add Store via Android App</span>
                  </div>
                ) : accounts.length < (profile.maxAccounts ?? 0) && profile.status !== 'on_hold' ? (
                  <button
                    onClick={handleOpenAddModal}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Store
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl">
                    {profile.status === 'on_hold' ? 'Account On Hold' : 'Store Limit Reached'}
                  </span>
                )}
              </div>
            </div>

            {/* List of Store OTP Cards */}
            {accounts.length === 0 ? (
              <div className="bg-slate-900 border border-dashed border-slate-800 rounded-3xl p-10 text-center">
                <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">No Meesho Accounts Linked Yet</h3>
                {!isNativeMobile() ? (
                  <div className="mt-4 p-5 bg-cyan-950/30 border border-cyan-800/40 rounded-2xl max-w-md mx-auto text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-white">Connect Store from Mobile App</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Meesho accounts must be connected inside the <strong>OrderMunim Android App</strong> on your phone to store credentials safely on your device and enable 24/7 background OTP sync.
                    </p>
                    <p className="text-[11px] text-cyan-400 font-medium">Once added on your phone, live delivery OTPs will sync to this screen automatically!</p>
                    <div className="pt-1">
                      <a
                        href={broadcastUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                      >
                        <DownloadCloud className="w-4 h-4" />
                        Download Android App
                      </a>
                    </div>
                  </div>
                ) : accounts.length < (profile.maxAccounts ?? 0) && profile.status !== 'on_hold' ? (
                  <button
                    onClick={handleOpenAddModal}
                    className="mt-4 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl"
                  >
                    + Add Your First Store
                  </button>
                ) : (
                  <p className="text-xs text-slate-400 mt-2">Contact admin to add store slots.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.map((acc) => {
                  const isLive = acc.status === 'live';
                  const isOnHold = profile.status === 'on_hold';
                  const isExpanded = Boolean(expandedStoreIds[acc.id]);
                  const activeOtps = (Array.isArray(acc.otpList) && acc.otpList.length > 0)
                    ? acc.otpList
                    : (acc.currentOtp && acc.currentOtp !== '----'
                        ? [{ courier: acc.courier || 'Courier', otp: acc.currentOtp, handoverCount: acc.handoverCount || 0, dateTime: acc.dateTime }]
                        : []);

                  return (
                    <div 
                      key={acc.id} 
                      className={`bg-slate-900 border ${
                        isOnHold 
                          ? 'border-rose-500/40 bg-slate-950/80 shadow-rose-950/20' 
                          : isExpanded 
                          ? 'border-cyan-500/40 shadow-lg shadow-cyan-950/20' 
                          : 'border-slate-800 hover:border-slate-700/80'
                      } rounded-2xl p-4 transition-all shadow-md`}
                    >
                      {/* Inner Card Content (Blurred when on hold) */}
                      <div className={`transition-all duration-300 ${isOnHold ? 'filter blur-md opacity-25 select-none pointer-events-none' : ''}`}>
                        {/* Clickable Header Bar (Tap Holder Name to Show/Hide OTP) */}
                        <div 
                          onClick={() => toggleStoreExpand(acc.id)}
                          className="flex items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              activeOtps.length > 0 
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              <Package className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-base text-white truncate hover:text-cyan-300 transition-colors">
                                  {acc.storeName}
                                </span>
                                {activeOtps.length > 0 ? (
                                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    {activeOtps.length} {activeOtps.length === 1 ? 'OTP' : 'OTPs'}
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 font-medium">
                                    No Return
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions & Chevron */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleManualRefresh(acc.syncKey, acc.storeName);
                              }}
                              disabled={refreshingId === acc.syncKey}
                              className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-50"
                              title="Check for live OTP now"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === acc.syncKey ? 'animate-spin text-cyan-400' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAccount(acc.id, acc.storeName);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Remove store"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="p-1 text-slate-400">
                              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-cyan-400' : ''}`} />
                            </div>
                          </div>
                        </div>

                        {/* Expanded Section: Single Row OTPs */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 animate-in fade-in duration-150">
                            {activeOtps.length > 0 ? (
                              activeOtps.map((item, idx) => (
                                <div 
                                  key={idx} 
                                  className="flex items-center justify-between gap-2 p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl"
                                >
                                  {/* 1. Courier Name */}
                                  <div className="flex items-center gap-1.5 min-w-[90px] shrink-0">
                                    <Truck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                    <span className="font-bold text-xs text-white truncate max-w-[120px]">
                                      {item.courier || 'Courier'}
                                    </span>
                                  </div>

                                  {/* 2. Parcel Count */}
                                  <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                                    <Package className="w-3 h-3 text-slate-500" />
                                    <span>{item.handoverCount || 0} {item.handoverCount === 1 ? 'Parcel' : 'Parcels'}</span>
                                  </div>

                                  {/* 3. OTP Code */}
                                  <div className="font-mono font-black text-base md:text-lg text-amber-400 tracking-wider shrink-0 px-2.5 py-0.5 bg-amber-500/10 rounded-lg border border-amber-500/25">
                                    {item.otp || '----'}
                                  </div>

                                  {/* 4. Copy Icon Button */}
                                  {item.otp && item.otp !== '----' ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(item.otp, `${acc.id}-${idx}`);
                                      }}
                                      className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 border border-amber-500/30 transition-all shrink-0 cursor-pointer"
                                      title="Copy OTP"
                                    >
                                      {copiedId === `${acc.id}-${idx}` ? (
                                        <Check className="w-4 h-4 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </button>
                                  ) : (
                                    <div className="w-7 h-7" />
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800/50 rounded-xl text-xs text-slate-500">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                  No active return courier right now
                                </span>
                                <span className="font-mono text-slate-500 font-bold">----</span>
                              </div>
                            )}

                            {/* Footer Details */}
                            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                              <span>Checked: {acc.dateTime || 'Just now'}</span>
                              {(() => {
                                const localSess = localSessions[acc.syncKey] || localSessions[acc.id];
                                const isExpired = localSess?.expired || acc.status === 'expired';
                                const hasSess = Boolean(localSess || acc.cookies);

                                const vaultCred = findCredentialsForAccount(acc);
                                const isReady = Boolean(localSess || acc.cookies || vaultCred?.password);

                                if (isReady) {
                                  return (
                                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                      Auto-Sync Active
                                    </span>
                                  );
                                }
                                return (
                                  <span className="flex items-center gap-1 text-slate-400 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    Connected
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* On Hold Overlay Badge */}
                      {isOnHold && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px] text-center select-none">
                          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-2 shadow-xl shadow-rose-950/50">
                            <PauseCircle className="w-6 h-6 animate-pulse" />
                          </div>
                          <span className="text-sm font-bold text-white tracking-wider uppercase">
                            Account On Hold
                          </span>
                          <span className="text-xs text-rose-300 mt-0.5">
                            OTP service paused
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
          </>
        )}
      </main>


      {/* ================= ADD STORE MODAL (CREDENTIALS) ================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-400" />
                {connectStep === 1 ? 'Add Meesho Store' : 'Install Chrome Extension'}
              </h3>
              <button type="button" onClick={handleCloseConnectModal}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner */}
            {modalError && (
              <div className="bg-rose-500/15 border border-rose-500/40 text-rose-200 p-3.5 rounded-2xl text-xs flex items-start justify-between gap-2.5 animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{modalError}</span>
                </div>
                <button type="button" onClick={() => setModalError('')} className="text-rose-400 hover:text-white p-0.5 rounded transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ── STEP 1: Enter credentials ── */}
            {connectStep === 1 && (
              <form onSubmit={handleCreateAccount} className="space-y-4">

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Meesho Registered Email or Mobile
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="seller@example.com or 9876543210"
                    value={meeshoEmail}
                    onChange={(e) => { setMeeshoEmail(e.target.value); if (modalError) setModalError(''); }}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Meesho Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={meeshoPass}
                    onChange={(e) => { setMeeshoPass(e.target.value); if (modalError) setModalError(''); }}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Store Nickname <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kaanchan Export (leave empty to auto-detect)"
                    value={newStoreName}
                    onChange={(e) => { setNewStoreName(e.target.value); if (modalError) setModalError(''); }}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button type="button" onClick={handleCloseConnectModal}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={syncingAccount}
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all">
                    {syncingAccount ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
                        <span>Verifying Store (~15s)...</span>
                      </span>
                    ) : (
                      'Connect Meesho Account'
                    )}
                  </button>
                </div>
                {syncingAccount && (
                  <p className="text-[11px] text-cyan-400/80 text-center animate-pulse pt-1">
                    Verifying credentials and fetching return OTPs from Meesho. Please wait ~15 seconds...
                  </p>
                )}
              </form>
            )}


            {/* ── STEP 2: Extension instructions ── */}
            {connectStep === 2 && (
              <div className="space-y-4">
                {/* Sync key display */}
                <div className="bg-slate-950 border border-cyan-500/40 rounded-2xl p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">Your Sync Key</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl font-mono font-bold text-cyan-400 tracking-widest">{generatedSyncKey}</span>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(generatedSyncKey); showToast('Sync key copied!', 'success'); }}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">You'll enter this in the extension</p>
                </div>

                {/* Steps */}
                <div className="space-y-2.5">
                  {[
                    { n: 1, text: 'Download & install the Chrome Extension from the link below' },
                    { n: 2, text: 'Click the extension icon → enter your Sync Key above' },
                    { n: 3, text: `Open supplier.meesho.com and log in to your Meesho account` },
                    { n: 4, text: 'Go to Returns page — OTP will sync to this dashboard automatically!' },
                  ].map(step => (
                    <div key={step.n} className="flex items-start gap-3 bg-slate-800/50 rounded-xl p-3">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0">{step.n}</span>
                      <span className="text-xs text-slate-300 leading-relaxed">{step.text}</span>
                    </div>
                  ))}
                </div>

                {/* Download button */}
                <a
                  href="https://github.com/RRTraders/meesho-otp/raw/main/extension/meesho-otp-extension.zip"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Download Chrome Extension
                </a>

                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-2">Already installed the extension?</p>
                  <button
                    type="button"
                    onClick={handleCloseConnectModal}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Done — Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= RECONNECT STORE MODAL (MULTI-DEVICE) ================= */}
      {showReconnectModal && reconnectAccount && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-cyan-400" />
                Connect Store on this Phone
              </h3>
              <button
                type="button"
                onClick={() => { setShowReconnectModal(false); setReconnectAccount(null); }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reconnectError && (
              <div className="bg-rose-500/15 border border-rose-500/40 text-rose-200 p-3.5 rounded-2xl text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{reconnectError}</span>
              </div>
            )}

            <form onSubmit={handleReconnectSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Store Name
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={reconnectAccount.storeName || 'Meesho Store'}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-300 text-sm font-semibold opacity-80"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Meesho Registered Email or Mobile
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={reconnectAccount.email || ''}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-300 text-sm opacity-80 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Enter Meesho Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={reconnectPass}
                  onChange={(e) => { setReconnectPass(e.target.value); setReconnectError(''); }}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Enter once to activate direct live OTP monitoring & 24/7 background alerts on this phone.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowReconnectModal(false); setReconnectAccount(null); }}
                  className="w-1/2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reconnectLoading || !reconnectPass}
                  className="w-1/2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {reconnectLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect & Fetch OTP'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ================= FANCY TOAST NOTIFICATION ================= */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-full animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 ${
            toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-rose-950/50'
              : toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-950/50'
                : toast.type === 'warning'
                  ? 'bg-amber-950/90 border-amber-500/50 text-amber-200 shadow-amber-950/50'
                  : 'bg-slate-900/95 border-cyan-500/40 text-cyan-200 shadow-cyan-950/50'
          }`}>
            <div className="flex items-center gap-3">
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              {toast.type === 'success' && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
              {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />}
              {toast.type === 'info' && <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />}
              <div>
                {toast.title && <div className="font-bold text-xs uppercase tracking-wider mb-0.5">{toast.title}</div>}
                <div className="text-xs font-medium leading-relaxed">{toast.message}</div>
              </div>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= BOTTOM NAVIGATION BAR (3 TABS) ================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-2 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {/* Tab 1: OTP */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
              activeTab !== 'cropper' && activeTab !== 'profile'
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${
              activeTab !== 'cropper' && activeTab !== 'profile'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400'
            }`}>
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[11px] tracking-tight">OTP</span>
          </button>

          {/* Tab 2: Label Cropper (NO free text) */}
          <button
            type="button"
            onClick={() => setActiveTab('cropper')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
              activeTab === 'cropper'
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${
              activeTab === 'cropper'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400'
            }`}>
              <Scissors className="w-5 h-5" />
            </div>
            <span className="text-[11px] tracking-tight">Label Cropper</span>
          </button>

          {/* Tab 3: Profile */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${
              activeTab === 'profile'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400'
            }`}>
              <User className="w-5 h-5" />
            </div>
            <span className="text-[11px] tracking-tight">Profile</span>
          </button>
        </div>
      </nav>

      {/* ================= MOBILE APP FLOATING ACTION BUTTON (FAB) ================= */}
      {/* Positioned at right bottom above navigation bar, visible strictly on Android native app */}
      {isNativeMobile() && activeTab === 'dashboard' && (
        <button
          type="button"
          onClick={() => {
            if (profile?.status === 'on_hold') {
              showToast('Account is on hold. Please clear payment to add stores.', 'error');
              return;
            }
            if (accounts.length >= (profile.maxAccounts ?? 0)) {
              showToast(`Store limit reached (${accounts.length}/${profile.maxAccounts ?? 0} slots used). Contact admin to add slots.`, 'info');
              return;
            }
            handleOpenAddModal();
          }}
          aria-label="Add Meesho Store"
          title="Add Meesho Store"
          className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-90 text-white shadow-2xl shadow-cyan-500/50 flex items-center justify-center border-2 border-cyan-300/40 transition-transform duration-200 md:hidden cursor-pointer"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      )}

      {/* ================= FANCY CONFIRMATION DIALOG ================= */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              confirmDialog.icon === 'logout'
                ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
            }`}>
              {confirmDialog.icon === 'logout' ? <LogOut className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">{confirmDialog.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  action();
                }}
                className={`flex-1 py-2.5 text-white font-bold text-xs rounded-xl shadow-lg transition-all ${
                  confirmDialog.icon === 'logout'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/25'
                    : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/25'
                }`}
              >
                {confirmDialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= IN-APP UPDATE FLOATING SNACKBAR (GRACE PERIOD / OPTIONAL) ================= */}
      {!isSuperAdmin && !updateStatus.isForce && updateStatus.shouldPrompt && !updateDismissed && (
        <div className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/50 shadow-2xl shadow-cyan-950/60 rounded-2xl p-4 text-white space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-cyan-500/20">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-white">{updateStatus.title}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {updateStatus.versionName}
                    </span>
                    {updateStatus.isGrace && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> Mandatory in {updateStatus.remainingText}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {updateStatus.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDismissUpdate(Number(appUpdateConfig?.versionCode))}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                title="Dismiss for now"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => handleDismissUpdate(Number(appUpdateConfig?.versionCode))}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Remind Me Later
              </button>
              <button
                type="button"
                onClick={() => handleInstallAppUpdate(updateStatus.downloadUrl)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4" />
                Install Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= APP UPDATE BROADCAST MODAL (SUPER ADMIN) ================= */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-5 md:p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Rocket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">App Update Broadcast</h3>
                  <p className="text-[11px] text-slate-400">Deploy in-app updates and notices to all client apps</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Status Header Card */}
            <div className={`p-4 rounded-2xl border transition-all ${
              broadcastActive
                ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/40 shadow-xl shadow-emerald-950/20'
                : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    broadcastActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">Broadcast Status:</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                        broadcastActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${broadcastActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
                        {broadcastActive ? 'LIVE TO ALL CLIENTS' : 'INACTIVE / STOPPED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {broadcastActive
                        ? `Targeting v${broadcastVersionName} (Code ${broadcastVersionCode}) • ${broadcastMode === 'grace_period' ? `${broadcastGraceDays} days grace` : broadcastMode === 'force_immediate' ? 'Immediate Force' : 'Optional notice'}`
                        : 'No active update notification currently visible to clients.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {broadcastActive ? (
                    <button
                      type="button"
                      disabled={broadcastSaving}
                      onClick={() => handleSaveAppUpdateBroadcast(false)}
                      className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    >
                      Stop Broadcast
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={broadcastSaving}
                      onClick={() => handleSaveAppUpdateBroadcast(true)}
                      className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      Start Broadcast
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Broadcast Settings Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Target Version Code */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Target Version Code (Integer)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={broadcastVersionCode}
                    onChange={(e) => setBroadcastVersionCode(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. 2"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Clients with lower version code will see the update.</span>
                </div>

                {/* Target Version Name */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Display Version Name
                  </label>
                  <input
                    type="text"
                    value={broadcastVersionName}
                    onChange={(e) => setBroadcastVersionName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. 1.1 or 2.0"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Shown in user badges (e.g. "v1.1").</span>
                </div>
              </div>

              {/* Notice Title */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Snackbar Title
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. New Update Available!"
                />
              </div>

              {/* Notice Message */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Notice Text / Changelog
                </label>
                <textarea
                  rows={2}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 leading-relaxed"
                  placeholder="Explain what's new in this release..."
                />
              </div>

              {/* APK Download URL */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Direct APK Download URL
                </label>
                <input
                  type="text"
                  value={broadcastUrl}
                  onChange={(e) => setBroadcastUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  placeholder="https://github.com/RRTraders/ordermunim_live/raw/main/meesho_otp.apk"
                />
              </div>

              {/* Update Mode Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Update Mode & Grace Period Enforcement
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div
                    onClick={() => setBroadcastMode('grace_period')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      broadcastMode === 'grace_period'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="updateModeModal"
                        checked={broadcastMode === 'grace_period'}
                        onChange={() => setBroadcastMode('grace_period')}
                        className="accent-amber-500"
                      />
                      <span className="font-bold text-xs text-white">Grace Period</span>
                    </div>
                    <p className="text-[10px] mt-1 leading-relaxed text-slate-400">
                      Dismissible for {broadcastGraceDays} days, then locks.
                    </p>
                  </div>

                  <div
                    onClick={() => setBroadcastMode('force_immediate')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      broadcastMode === 'force_immediate'
                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="updateModeModal"
                        checked={broadcastMode === 'force_immediate'}
                        onChange={() => setBroadcastMode('force_immediate')}
                        className="accent-rose-500"
                      />
                      <span className="font-bold text-xs text-white">Immediate Force</span>
                    </div>
                    <p className="text-[10px] mt-1 leading-relaxed text-slate-400">
                      Locks immediately until updated.
                    </p>
                  </div>

                  <div
                    onClick={() => setBroadcastMode('optional')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      broadcastMode === 'optional'
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="updateModeModal"
                        checked={broadcastMode === 'optional'}
                        onChange={() => setBroadcastMode('optional')}
                        className="accent-cyan-500"
                      />
                      <span className="font-bold text-xs text-white">Optional Notice</span>
                    </div>
                    <p className="text-[10px] mt-1 leading-relaxed text-slate-400">
                      Informs user, dismissible anytime.
                    </p>
                  </div>
                </div>

                {broadcastMode === 'grace_period' && (
                  <div className="pt-1.5 flex items-center gap-2">
                    <span className="text-[11px] text-slate-300 font-semibold">Grace Period Duration:</span>
                    <select
                      value={broadcastGraceDays}
                      onChange={(e) => setBroadcastGraceDays(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value={1}>1 Day (24 Hours)</option>
                      <option value={2}>2 Days (48 Hours)</option>
                      <option value={3}>3 Days (72 Hours)</option>
                      <option value={5}>5 Days</option>
                      <option value={7}>7 Days</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                disabled={broadcastSaving}
                onClick={async () => {
                  await handleSaveAppUpdateBroadcast(true);
                  setShowBroadcastModal(false);
                }}
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                {broadcastSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
                ) : (
                  <Rocket className="w-4 h-4" />
                )}
                {broadcastActive ? 'Update & Save' : 'Publish & Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Downloading & Auto-Install Modal */}
      {renderUpdateProgressModal()}
    </div>
  );
}
