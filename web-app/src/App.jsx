import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Capacitor } from '@capacitor/core';
import { directMeeshoLogin, directFetchDeliveryOTPs, isNativeMobile, syncBackgroundSessions, getNativeStoredSessions, startBackgroundMonitoring, stopBackgroundMonitoring, requestBatteryOptimization, checkExactAlarmPermission, requestExactAlarmPermission, openAppSettings, openNotificationSettings, downloadAndInstallApk, getAppVersionInfo, exitApp } from './meeshoDirect';
import { 
  saveEncryptedStoreCredentials, 
  getDecryptedStoreCredentials, 
  findCredentialsForAccount, 
  removeEncryptedStoreCredentials, 
  clearVault,
  encryptSecret,
  decryptSecret 
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
  Edit2,
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
  Smartphone,
  Globe,
  QrCode,
  Store,
  Edit3,
  Calendar,
  Home,
  ShoppingBag,
  Video,
  FileText,
  Info
} from 'lucide-react';
const LabelCropper = lazy(() => import('./LabelCropper'));
const PdfToolsSuite = lazy(() => import('./PdfTools/PdfToolsSuite'));

class CropperErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("CropperErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-center max-w-lg mx-auto my-6 space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Label Cropper Encountered an Issue</h3>
            <p className="text-xs text-slate-400 mt-1">
              {this.state.error?.message || "An unexpected error occurred while loading the workspace."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem('om_selected_marketplace');
              } catch (e) {}
              this.setState({ hasError: false, error: null });
            }}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Reset &amp; Reload Cropper
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const CURRENT_APP_VERSION_CODE = 46;
const CURRENT_APP_VERSION_NAME = "5.6";

export const sanitizeStaleAccountOtp = (acc, persistFirestore = false) => {
  if (!acc) return acc;
  const rawFirestoreOtp = acc.currentOtp;
  const rawFirestoreCourier = acc.courier;
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const todayIST = `${nowIST.getFullYear()}-${nowIST.getMonth()}-${nowIST.getDate()}`;
  let isStaleDay = false;
  if (acc.lastUpdated) {
    const updatedIST = new Date(new Date(acc.lastUpdated).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const updatedDay = `${updatedIST.getFullYear()}-${updatedIST.getMonth()}-${updatedIST.getDate()}`;
    if (updatedDay !== todayIST) {
      isStaleDay = true;
    }
  }
  const hasEmptyOtpListWithStaleOtp = Array.isArray(acc.otpList) && acc.otpList.length === 0 && acc.currentOtp && acc.currentOtp !== '----';
  const hasFalseExpiredStatus = acc.status === 'session_expired' || acc.courier === 'Session Expired';

  if (hasFalseExpiredStatus && persistFirestore && acc.id) {
    updateDoc(doc(db, 'accounts', acc.id), {
      status: 'live',
      courier: acc.courier === 'Session Expired' ? 'No Return' : (acc.courier || 'No Return')
    }).catch(() => {});
  }

  if (isStaleDay || hasEmptyOtpListWithStaleOtp) {
    if (persistFirestore && acc.id && ((acc.currentOtp && acc.currentOtp !== '----') || (Array.isArray(acc.otpList) && acc.otpList.length > 0))) {
      updateDoc(doc(db, 'accounts', acc.id), {
        currentOtp: '----',
        courier: 'No Return',
        handoverCount: 0,
        otpList: []
      }).catch(() => {});
    }
    return { ...acc, rawFirestoreOtp, rawFirestoreCourier, currentOtp: '----', courier: 'No Return', handoverCount: 0, otpList: [], status: 'live' };
  }

  if (hasFalseExpiredStatus) {
    return { ...acc, rawFirestoreOtp, rawFirestoreCourier, courier: acc.courier === 'Session Expired' ? 'No Return' : acc.courier, status: 'live' };
  }

  return { ...acc, rawFirestoreOtp, rawFirestoreCourier };
};

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

// Persistent Auth Session Backup — guarantees user stays logged in across updates & webview refreshes
export const savePersistentAuth = (email, password, role = 'customer') => {
  try {
    if (!email || !password) return;
    const payload = JSON.stringify({ email: email.trim(), password, role, savedAt: Date.now() });
    const encoded = btoa(encodeURIComponent(payload));
    localStorage.setItem('om_persistent_auth_token', encoded);
    if (typeof document !== 'undefined') {
      document.cookie = `om_persistent_auth_token=${encoded}; max-age=31536000; path=/; SameSite=Lax`;
    }
  } catch (err) {
    console.warn('[Persistent Auth] Save error:', err);
  }
};

export const getPersistentAuth = () => {
  try {
    let encoded = localStorage.getItem('om_persistent_auth_token');
    if (!encoded && typeof document !== 'undefined') {
      const match = document.cookie.match(/om_persistent_auth_token=([^;]+)/);
      if (match) {
        encoded = match[1];
        try { localStorage.setItem('om_persistent_auth_token', encoded); } catch {}
      }
    }
    if (!encoded) return null;
    const jsonStr = decodeURIComponent(atob(encoded));
    const data = JSON.parse(jsonStr);
    if (data && data.email && data.password) {
      return data;
    }
    return null;
  } catch (err) {
    return null;
  }
};

export const clearPersistentAuth = () => {
  try {
    localStorage.removeItem('om_persistent_auth_token');
    if (typeof document !== 'undefined') {
      document.cookie = 'om_persistent_auth_token=; max-age=0; path=/; SameSite=Lax';
    }
  } catch {}
};

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_auth_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_auth_user');
      // If user session is already stored locally, unblock UI immediately (0ms wait)
      if (cached) return false;
    } catch {}
    return true;
  });
  const authRestoringRef = useRef(false);

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
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      // Clear OTP fields if they are from a previous calendar day (IST) to prevent stale OTP display
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const todayIST = `${nowIST.getFullYear()}-${nowIST.getMonth()}-${nowIST.getDate()}`;
      return parsed.map(acc => {
        if (!acc.lastUpdated) return { ...acc, currentOtp: '----', courier: '', handoverCount: 0 };
        const updatedIST = new Date(new Date(acc.lastUpdated).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const updatedDay = `${updatedIST.getFullYear()}-${updatedIST.getMonth()}-${updatedIST.getDate()}`;
        if (updatedDay !== todayIST) {
          // OTP is from a previous day — display blank until Firestore/poll brings fresh data
          return { ...acc, currentOtp: '----', courier: '', handoverCount: 0, otpList: [] };
        }
        return acc;
      });
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

  const [activeTab, setActiveTab] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.replace('#', '').trim().toLowerCase();
        if (['dashboard', 'otp', 'cropper', 'profile', 'admin', 'staff', 'pdf-tools'].includes(hash)) {
          return hash;
        }
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam && ['dashboard', 'otp', 'cropper', 'profile', 'admin', 'staff', 'pdf-tools'].includes(tabParam)) {
          return tabParam;
        }
        const saved = localStorage.getItem('om_active_tab');
        if (saved && ['dashboard', 'otp', 'cropper', 'profile', 'admin', 'staff', 'pdf-tools'].includes(saved)) {
          return saved;
        }
      }
    } catch {}
    return isNativeMobile() ? 'otp' : 'dashboard';
  });

  // Keep active tab in localStorage & URL hash so page refresh stays on current page
  useEffect(() => {
    try {
      if (activeTab) {
        localStorage.setItem('om_active_tab', activeTab);
        if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
          const newHash = activeTab === 'dashboard' ? '' : `#${activeTab}`;
          const currentUrl = window.location.pathname + window.location.search + newHash;
          window.history.replaceState(null, '', currentUrl);
        }
      }
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      try {
        const hash = window.location.hash.replace('#', '').trim().toLowerCase();
        if (hash && ['dashboard', 'otp', 'cropper', 'profile', 'admin', 'staff', 'pdf-tools'].includes(hash)) {
          setActiveTab(hash);
        }
      } catch {}
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const [activeCropperMarketplace, setActiveCropperMarketplace] = useState(() => {
    return localStorage.getItem('om_selected_marketplace') || 'meesho';
  });
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showPdfComingSoonModal, setShowPdfComingSoonModal] = useState(false);
  const [ecomDropdownOpen, setEcomDropdownOpen] = useState(false);
  const ecomDropdownRef = useRef(null);

  useEffect(() => {
    if (!ecomDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (ecomDropdownRef.current && !ecomDropdownRef.current.contains(e.target)) {
        setEcomDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ecomDropdownOpen]);

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

  // Follow Us Store Profile Links State (Defaults to 5 free profiles for all sellers)
  const getMaxFollowStoresAllowed = (prof) => {
    if (typeof prof?.maxFollowStores === 'number') return prof.maxFollowStores;
    return Math.max(5, typeof prof?.maxAccounts === 'number' ? prof.maxAccounts : 5);
  };

  const [newFollowStoreName, setNewFollowStoreName] = useState('');
  const [newFollowStoreUrl, setNewFollowStoreUrl] = useState('');
  const [addingFollowStore, setAddingFollowStore] = useState(false);

  const handleAddFollowStore = async (e) => {
    e.preventDefault();
    if (!newFollowStoreName.trim()) {
      showToast('Please enter a Store Name', 'error');
      return;
    }
    if (!newFollowStoreUrl.trim()) {
      showToast('Please enter a Store / Profile URL', 'error');
      return;
    }

    const currentList = Array.isArray(profile?.followStores) ? profile.followStores : [];
    const maxPermitted = getMaxFollowStoresAllowed(profile);

    if (currentList.length >= maxPermitted) {
      showToast(`Store profile limit reached (${maxPermitted} store profile${maxPermitted === 1 ? '' : 's'} permitted). Contact admin to add more stores.`, 'error');
      return;
    }

    setAddingFollowStore(true);
    try {
      const updatedList = [
        ...currentList,
        {
          id: Date.now().toString(),
          name: newFollowStoreName.trim(),
          url: newFollowStoreUrl.trim()
        }
      ];

      await updateDoc(doc(db, 'users', user.uid), {
        followStores: updatedList
      });

      setProfile(prev => ({ ...prev, followStores: updatedList }));
      try {
        localStorage.setItem('cached_user_profile', JSON.stringify({ ...profile, followStores: updatedList }));
        localStorage.setItem('om_follow_stores', JSON.stringify(updatedList));
      } catch {}

      setNewFollowStoreName('');
      setNewFollowStoreUrl('');
      showToast('Store profile added successfully!', 'success');
    } catch (err) {
      showToast(`Error adding store: ${err.message}`, 'error');
    } finally {
      setAddingFollowStore(false);
    }
  };

  const handleDeleteFollowStore = async (storeId) => {
    const currentList = Array.isArray(profile?.followStores) ? profile.followStores : [];
    const updatedList = currentList.filter(s => s.id !== storeId);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        followStores: updatedList
      });
      setProfile(prev => ({ ...prev, followStores: updatedList }));
      try {
        localStorage.setItem('cached_user_profile', JSON.stringify({ ...profile, followStores: updatedList }));
        localStorage.setItem('om_follow_stores', JSON.stringify(updatedList));
      } catch {}
      showToast('Store profile removed', 'info');
    } catch (err) {
      showToast(`Error deleting store: ${err.message}`, 'error');
    }
  };


  // Admin Panel State
  const [adminAuthenticated, setAdminAuthenticated] = useState(() => {
    try {
      const cachedProfile = localStorage.getItem('cached_user_profile');
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        if (parsed?.role === 'super_admin' || parsed?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
          return true;
        }
      }
    } catch {}
    return false;
  });
  const [adminInputPass, setAdminInputPass] = useState('');
  const [allUsersList, setAllUsersList] = useState([]);
  const [allPlatformAccounts, setAllPlatformAccounts] = useState([]);
  const [adminUserTab, setAdminUserTab] = useState('activated'); // 'activated' | 'pending'
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminCurrentPage, setAdminCurrentPage] = useState(1);
  const [expandedAdminUserIds, setExpandedAdminUserIds] = useState({});
  const [adminSettingsUser, setAdminSettingsUser] = useState(null);

  const toggleAdminUserExpand = (uid) => {
    setExpandedAdminUserIds(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }));
  };
  const ADMIN_PAGE_SIZE = 10;

  // In-App Update, Platform Detection & Broadcast State
  const [isMobileApp, setIsMobileApp] = useState(() => isNativeMobile());
  const [installedVersionCode, setInstalledVersionCode] = useState(() => {
    try {
      const stored = localStorage.getItem('om_installed_version_code');
      if (stored && Number(stored) < 45) {
        localStorage.removeItem('om_installed_version_code');
        localStorage.removeItem('om_installed_version_name');
        return null;
      }
      return stored ? Number(stored) : null;
    } catch { return null; }
  });
  const [installedVersionName, setInstalledVersionName] = useState(() => {
    try {
      const stored = localStorage.getItem('om_installed_version_name');
      if (stored && (stored === '3.3' || stored === '2.9' || stored === '2.6')) {
        localStorage.removeItem('om_installed_version_name');
        return null;
      }
      return stored || null;
    } catch { return null; }
  });
  const [appPlatformInfo, setAppPlatformInfo] = useState(() => ({
    isNative: isNativeMobile(),
    platform: isNativeMobile() ? 'android' : 'web',
    versionCode: null,
    versionName: null,
    packageName: isNativeMobile() ? 'com.rrtraders.meeshootp' : null
  }));
  const [liveCheckedTimes, setLiveCheckedTimes] = useState({});

  // ================= ANDROID HARDWARE / GESTURE BACK BUTTON INTERCEPTOR =================
  const backButtonHandlerRef = useRef(null);
  backButtonHandlerRef.current = () => {
    // 1. If Exit/Logout/Delete confirmation dialog is open, close it
    if (confirmDialog) {
      setConfirmDialog(null);
      return 'handled';
    }

    // 2. If Profile Drawer is open, close it and return to active app screen
    if (isProfileDrawerOpen) {
      setIsProfileDrawerOpen(false);
      return 'handled';
    }

    // 3. If any modal is open, close it
    if (adminSettingsUser) {
      setAdminSettingsUser(null);
      return 'handled';
    }
    if (showAddModal) {
      setShowAddModal(false);
      return 'handled';
    }
    if (showReconnectModal) {
      setShowReconnectModal(false);
      return 'handled';
    }
    if (showAboutModal) {
      setShowAboutModal(false);
      return 'handled';
    }
    if (showContactModal) {
      setShowContactModal(false);
      return 'handled';
    }
    if (showBroadcastModal) {
      setShowBroadcastModal(false);
      return 'handled';
    }
    if (showPdfComingSoonModal) {
      setShowPdfComingSoonModal(false);
      return 'handled';
    }

    // 4. If on secondary tab (cropper, admin, staff), navigate back to main OTP tab
    if (activeTab !== 'dashboard' && activeTab !== 'otp') {
      setActiveTab(isNativeMobile() ? 'otp' : 'dashboard');
      return 'handled';
    }

    // 5. At the root screen: show confirmation dialog "Are you sure you want to exit app?"
    setConfirmDialog({
      title: 'Exit App',
      message: 'Are you sure you want to exit OrderMunim?',
      confirmText: 'Exit App',
      icon: 'exit',
      onConfirm: async () => {
        await exitApp();
      }
    });
    return 'handled';
  };

  useEffect(() => {
    window.handleAndroidBackButton = () => {
      if (backButtonHandlerRef.current) {
        return backButtonHandlerRef.current();
      }
      return 'default';
    };
    return () => {
      delete window.handleAndroidBackButton;
    };
  }, []);

  useEffect(() => {
    getAppVersionInfo().then((info) => {
      if (info) {
        setIsMobileApp(Boolean(info.isNative));
        setAppPlatformInfo(info);
        if (info.isNative && info.versionCode) {
          setInstalledVersionCode(info.versionCode);
          setInstalledVersionName(info.versionName);
          localStorage.setItem('om_installed_version_code', String(info.versionCode));
          localStorage.setItem('om_installed_version_name', String(info.versionName));
        }
      }
    });
  }, []);

  // Exact Alarm Permission (Android 12+ / API 31+) for 10-12s Fast Refresh
  const [canScheduleExactAlarms, setCanScheduleExactAlarms] = useState(true);

  const checkAlarmPermission = async () => {
    if (isNativeMobile()) {
      try {
        const res = await checkExactAlarmPermission();
        if (res && typeof res.canScheduleExactAlarms === 'boolean') {
          setCanScheduleExactAlarms(res.canScheduleExactAlarms);
        }
      } catch (err) {
        console.warn('Check exact alarm permission failed:', err);
      }
    }
  };

  useEffect(() => {
    checkAlarmPermission();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAlarmPermission();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', checkAlarmPermission);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', checkAlarmPermission);
    };
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
  const [broadcastVersionCode, setBroadcastVersionCode] = useState(22);
  const [broadcastVersionName, setBroadcastVersionName] = useState('3.2');
  const [broadcastTitle, setBroadcastTitle] = useState('New Update Available (v3.2)!');
  const [broadcastMessage, setBroadcastMessage] = useState('Version 3.2 completely silences background sync with 0% notification bar presence while keeping instant high-priority return OTP alerts.');
  const [broadcastUrl, setBroadcastUrl] = useState(`https://meesho-otp-app.web.app/ordermunim_v${CURRENT_APP_VERSION_NAME}.apk`);
  const [broadcastMode, setBroadcastMode] = useState('optional'); // 'grace_period' | 'force_immediate' | 'optional'
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
          accList.push(sanitizeStaleAccountOtp({ id: d.id, ...d.data() }, true));
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
        // If we have saved credentials, restore session in BACKGROUND without blocking or showing spinner
        const savedAuth = getPersistentAuth();
        if (savedAuth && savedAuth.email && savedAuth.password && !authRestoringRef.current) {
          authRestoringRef.current = true;
          signInWithEmailAndPassword(auth, savedAuth.email, savedAuth.password)
            .then(() => {
              authRestoringRef.current = false;
            })
            .catch((autoErr) => {
              authRestoringRef.current = false;
              if (autoErr.code === 'auth/wrong-password' || autoErr.code === 'auth/user-not-found') {
                clearPersistentAuth();
                try { localStorage.removeItem('cached_auth_user'); } catch {}
                setUser(null);
                setLoading(false);
              }
            });
          return;
        }

        try { localStorage.removeItem('cached_auth_user'); } catch {}
        setUser(null);
        setEmailNeedsVerification(false);
        setLoading(false);
        setAccounts([]);
        if (isNativeMobile()) {
          try {
            stopBackgroundMonitoring();
          } catch {}
        }
        return;
      }

      // We have active authenticated user
      authRestoringRef.current = false;

      // Detect if user switched on this device:
      const prevActiveUid = localStorage.getItem('om_active_user_uid');
      if (prevActiveUid && prevActiveUid !== currentUser.uid) {
        try {
          localStorage.removeItem('cached_auth_user');
          localStorage.removeItem('native_meesho_sessions');
          localStorage.removeItem('cached_user_accounts');
          localStorage.removeItem('cached_user_profile');
          clearVault();
          if (isNativeMobile()) {
            syncBackgroundSessions({}, true, '');
          }
        } catch {}
        setLocalSessions({});
        setAccounts([]);
      }
      try { localStorage.setItem('om_active_user_uid', currentUser.uid); } catch {}

      // Cache serializable user for instant 0ms startup
      try {
        const serializableUser = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          phoneNumber: currentUser.phoneNumber || '',
          displayName: currentUser.displayName || '',
          emailVerified: currentUser.emailVerified || false
        };
        localStorage.setItem('cached_auth_user', JSON.stringify(serializableUser));
      } catch {}

      // INSTANT ZERO DELAY: Unblock UI immediately, no network waterfalls!
      setUser(currentUser);
      setLoading(false);

      // Stream user profile and accounts in background via Firestore onSnapshot
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
        if (profData.emailVerified === false && !isSuper && profData.role !== 'super_admin') {
          setEmailNeedsVerification(true);
        } else {
          setEmailNeedsVerification(false);
        }
        if (isSuper || profData.role === 'super_admin') {
          setAdminAuthenticated(true);
          // Preserve user's current selected tab on refresh
          setActiveTab(prev => {
            if (prev && ['dashboard', 'otp', 'cropper', 'profile', 'admin', 'staff'].includes(prev)) {
              return prev;
            }
            return 'admin';
          });
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
        accList.push(sanitizeStaleAccountOtp({ id: d.id, ...d.data() }, true));
      });
      setAccounts(accList);
      try { localStorage.setItem('cached_user_accounts', JSON.stringify(accList)); } catch {}

      // Auto-restore encrypted credentials from Firestore on boot (Master Spec Feature 5)
      // On native mobile: if any account has encryptedEmail/encryptedPassword but no local session,
      // sync those credentials to the native background service via syncSessions.
      // The Android side will AES-decrypt them via getPasswordFromPermanentVault.
      // This fires after every accounts snapshot but is safe — syncBackgroundSessions is idempotent.
      if (isNativeMobile() && accList.length > 0) {
        try {
          const rawSessions = localStorage.getItem('native_meesho_sessions');
          const currentSessions = rawSessions ? JSON.parse(rawSessions) : {};
          let needsSync = false;
          for (const acc of accList) {
            if (!acc.id) continue;
            const key = acc.syncKey || acc.id;
            const hasLocal = currentSessions[key] || currentSessions[acc.id] || currentSessions[acc.syncKey];
            if (!hasLocal && (acc.email || acc.encryptedEmail)) {
              // Restore session from Firestore account data (credentials will be fetched from native vault)
              currentSessions[key] = {
                docId: acc.id,
                userId: uid,
                email: acc.email || '',
                password: '', // Will be restored from AES vault by Android side
                identifier: acc.identifier || '',
                supplierId: acc.supplierId || 0,
                storeName: acc.storeName || '',
                cookies: acc.cookies || '',
                expired: false
              };
              needsSync = true;
            }
          }
          if (needsSync) {
            try { localStorage.setItem('native_meesho_sessions', JSON.stringify(currentSessions)); } catch {}
            syncBackgroundSessions(currentSessions, false, uid);
          }
        } catch (e) { console.warn('[CredRestore] Error:', e); }
      }
    }, (err) => {
      console.error('[Firestore] Accounts listener error:', err.code, err.message);
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
          accList.push(sanitizeStaleAccountOtp({ id: d.id, ...d.data() }, true));
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
  const isPollingRef = useRef(false);
  const userRef = useRef(user);
  const pollAllNativeSessionsRef = useRef(null);
  const hasInitialPolledAfterAccountsRef = useRef(false);
  const pendingForcePollRef = useRef(false);

  const resolveRealIdentifier = (accOrSess) => {
    if (!accOrSess) return '';
    if (accOrSess.fulfillmentId && String(accOrSess.fulfillmentId).trim().length <= 8) {
      return String(accOrSess.fulfillmentId).trim();
    }
    const cookies = accOrSess.cookies || '';
    if (cookies) {
      const mAz = cookies.match(/(?:^|;\s*)current_az_identifier=([^;\s]+)/i);
      if (mAz && mAz[1]) return mAz[1].trim();
      const mMp = cookies.match(/mixpanel=([^;]+)/i);
      if (mMp && mMp[1]) {
        try {
          const mpObj = JSON.parse(decodeURIComponent(mMp[1]));
          if (mpObj.Supplier_tag && mpObj.Supplier_tag !== 'Direct') return String(mpObj.Supplier_tag).trim();
          if (mpObj.distinct_id && mpObj.distinct_id !== 'Direct' && String(mpObj.distinct_id).length <= 8) return String(mpObj.distinct_id).trim();
        } catch {}
      }
    }
    return String(accOrSess.identifier || '').trim();
  };

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

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
    if (!isNativeMobile() || !user || !accounts || accounts.length === 0) return;
    try {
      const rawSessions = localStorage.getItem('native_meesho_sessions');
      const cur = rawSessions ? JSON.parse(rawSessions) : {};
      let changed = false;

      // Filter accounts strictly by the current logged-in user's UID
      const myAccounts = accounts.filter(acc => acc.userId === user.uid);
      if (myAccounts.length === 0) return;

      const activeDocKeys = new Set();
      myAccounts.forEach(acc => {
        if (acc.id) activeDocKeys.add(acc.id);
        if (acc.syncKey) activeDocKeys.add(acc.syncKey);
      });

      for (const acc of myAccounts) {
        const key = acc.syncKey || acc.id;
        const realIdent = resolveRealIdentifier(acc);
        const existing = cur[key] || (acc.id ? cur[acc.id] : null) || (acc.syncKey ? cur[acc.syncKey] : null) || (realIdent ? cur[realIdent] : null) || (acc.identifier ? cur[acc.identifier] : null) || Object.values(cur).find(s => (s.email && acc.email && s.email.toLowerCase() === acc.email.toLowerCase()) || (s.identifier && (s.identifier === realIdent || s.identifier === acc.identifier)) || (s.supplierId && acc.supplierId && Number(s.supplierId) === Number(acc.supplierId)));
        const vaultCred = findCredentialsForAccount(acc, user.uid);
        const restoredPassword = (existing && existing.password) ? existing.password : (vaultCred?.password || '');
        const restoredEmail = (existing && existing.email) ? existing.email : (acc.email || vaultCred?.email || '');

        if (!existing && (acc.cookies || restoredPassword || restoredEmail || acc.email)) {
          const newSess = {
            docId: acc.id || '',
            userId: user.uid,
            email: restoredEmail,
            password: restoredPassword,
            identifier: realIdent || acc.identifier || (vaultCred?.identifier || ''),
            supplierId: acc.supplierId || (vaultCred?.supplierId || 0),
            storeName: acc.storeName || (vaultCred?.storeName || ''),
            cookies: acc.cookies || '',
            expired: false
          };
          cur[key] = newSess;
          if (acc.id) cur[acc.id] = newSess;
          if (acc.syncKey) cur[acc.syncKey] = newSess;
          if (restoredPassword) {
            saveEncryptedStoreCredentials(key, newSess, user.uid);
          }
          changed = true;
        } else if (existing) {
          if (user.uid) existing.userId = user.uid;
          if (acc.id) existing.docId = acc.id;
          if (realIdent && existing.identifier !== realIdent) {
            existing.identifier = realIdent;
            changed = true;
          }
          if (!existing.password && restoredPassword) {
            existing.password = restoredPassword;
            changed = true;
          }
          if (existing.password) {
            saveEncryptedStoreCredentials(key, existing, user.uid);
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

        // Auto-heal any stale session_expired status back to live
        if (acc.status === 'session_expired') {
          updateDoc(doc(db, 'accounts', acc.id), { status: 'live' }).catch(() => {});
        }

        // Auto re-login silently on behalf of the client if cookies missing
        if ((acc.status === 'session_expired' || !acc.cookies) && restoredEmail && restoredPassword) {
          directMeeshoLogin(restoredEmail, restoredPassword).then(async (fresh) => {
            if (fresh && fresh.success) {
              const freshIdent = resolveRealIdentifier(fresh) || realIdent || acc.identifier || '';
              const freshSupId = fresh.supplierId || acc.supplierId || 0;
              const updatedSess = {
                ...(cur[key] || {}),
                docId: acc.id,
                userId: user.uid,
                email: restoredEmail,
                password: restoredPassword,
                identifier: freshIdent,
                supplierId: freshSupId,
                storeName: fresh.storeName || acc.storeName || '',
                cookies: fresh.cookies,
                expired: false
              };
              cur[key] = updatedSess;
              if (acc.id) cur[acc.id] = updatedSess;
              if (acc.syncKey) cur[acc.syncKey] = updatedSess;
              try {
                localStorage.setItem('native_meesho_sessions', JSON.stringify(cur));
                setLocalSessions({ ...cur });
                syncBackgroundSessions(cur, false, user.uid);
                saveEncryptedStoreCredentials(key, updatedSess, user.uid);
              } catch {}

              const freshOtp = fresh.otp || '----';
              const freshCourier = fresh.courier || 'No Return';
              const freshCount = fresh.handoverCount || 0;
              const freshOtpList = Array.isArray(fresh.otpList) ? fresh.otpList : [];
              const freshTime = fresh.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              await updateDoc(doc(db, 'accounts', acc.id), {
                status: 'live',
                cookies: fresh.cookies,
                identifier: freshIdent,
                supplierId: freshSupId,
                currentOtp: freshOtp,
                courier: freshCourier,
                handoverCount: freshCount,
                otpList: freshOtpList,
                dateTime: freshTime,
                lastUpdated: new Date().toISOString()
              }).catch(() => {});
            }
          }).catch(() => {});
        }
      }

      // STRICT PURGE: Remove any ghost/deleted session keys not belonging to active accounts
      if (activeDocKeys.size > 0) {
        for (const k of Object.keys(cur)) {
          if (!activeDocKeys.has(k)) {
            delete cur[k];
            changed = true;
          }
        }
      }

      if (changed) {
        localStorage.setItem('native_meesho_sessions', JSON.stringify(cur));
        setLocalSessions(cur);
        syncBackgroundSessions(cur, false, user.uid);
      }

      // INSTANT OTP ON APP OPEN: As soon as accounts hydrate on startup, trigger immediate live OTP fetch!
      if (!hasInitialPolledAfterAccountsRef.current && pollAllNativeSessionsRef.current) {
        hasInitialPolledAfterAccountsRef.current = true;
        pollAllNativeSessionsRef.current(true);
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
            identifier: resolveRealIdentifier(sess) || resolveRealIdentifier(acc) || '',
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

    const pollAllNativeSessions = async (forceInstant = false) => {
      if (isPollingRef.current) {
        if (forceInstant) {
          pendingForcePollRef.current = true;
        }
        return;
      }
      isPollingRef.current = true;
      try {
        const rawSessions = localStorage.getItem('native_meesho_sessions');
        let sessions = {};
        try {
          sessions = rawSessions ? JSON.parse(rawSessions) : {};
        } catch {}

        // Fallback: Populate missing accounts from current accounts list so phone polls them directly
        if (accountsRef.current && Array.isArray(accountsRef.current)) {
          for (const acc of accountsRef.current) {
            const key = acc.syncKey || acc.id;
            const realIdent = resolveRealIdentifier(acc);
            if (key && !sessions[key]) {
              const vaultCred = findCredentialsForAccount(acc, userRef.current?.uid);
              sessions[key] = {
                docId: acc.id || key,
                email: acc.email || vaultCred?.email || '',
                password: vaultCred?.password || '',
                identifier: realIdent || acc.identifier || '',
                supplierId: acc.supplierId || 0,
                storeName: acc.storeName || '',
                cookies: acc.cookies || '',
                expired: false
              };
            } else if (key && sessions[key] && realIdent && sessions[key].identifier !== realIdent) {
              sessions[key].identifier = realIdent;
            }
          }
        }

        const polledIdentifiers = new Set();
        for (const [key, sess] of Object.entries(sessions)) {
          const targetAcc = accountsRef.current?.find(a => a.id === key || a.syncKey === key || (a.email && sess.email && a.email.toLowerCase() === sess.email.toLowerCase()) || (a.identifier && sess.identifier && a.identifier === sess.identifier) || (a.supplierId && sess.supplierId && Number(a.supplierId) === Number(sess.supplierId)));
          if (accountsRef.current && accountsRef.current.length > 0 && !targetAcc) {
            continue;
          }
          const targetDocId = targetAcc?.id || sess.docId || key;
          if (!targetDocId || !String(targetDocId).startsWith('MSH-')) continue;

          const effectiveIdent = resolveRealIdentifier(targetAcc) || resolveRealIdentifier(sess) || sess.identifier || '';
          const effectiveSupId = targetAcc?.supplierId || sess.supplierId || 0;
          if (!effectiveIdent && !sess.email && !effectiveSupId) continue;

          const dedupKey = targetDocId;
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
              const freshIdent = resolveRealIdentifier(fresh) || effectiveIdent;
              const freshSupId = fresh.supplierId || effectiveSupId;
              sessions[key].cookies = fresh.cookies;
              sessions[key].identifier = freshIdent;
              sessions[key].supplierId = freshSupId;
              sessions[key].storeName = fresh.storeName;
              localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
              setLocalSessions(sessions);
              await updateDoc(doc(db, 'accounts', targetDocId), {
                status: 'live',
                cookies: fresh.cookies,
                identifier: freshIdent,
                supplierId: freshSupId,
                currentOtp: fresh.otp || '----',
                courier: fresh.courier || 'No Return',
                handoverCount: fresh.handoverCount || 0,
                otpList: Array.isArray(fresh.otpList) ? fresh.otpList : [],
                dateTime: fresh.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                lastUpdated: new Date().toISOString()
              }).catch(() => {});
            }
          }

          if (!sess.cookies && targetAcc?.cookies) {
            sess.cookies = targetAcc.cookies;
          }
          if (effectiveIdent) sess.identifier = effectiveIdent;
          if (effectiveSupId) sess.supplierId = effectiveSupId;

          if (!sess.cookies) continue;

          let otpRes = await directFetchDeliveryOTPs(sess.identifier, sess.cookies, sess.supplierId);
          if (otpRes.error || otpRes.expired || otpRes.error === 'HTTP 403' || otpRes.error === 'HTTP 401') {
            // Auto re-login silently on behalf of the client using stored credentials
            const vaultCred = findCredentialsForAccount(targetAcc || { id: key, syncKey: key, ...sess }, userRef.current?.uid || user?.uid);
            const loginEmail = sess.email || targetAcc?.email || vaultCred?.email;
            const loginPass = sess.password || vaultCred?.password;

            if (loginEmail && loginPass) {
              console.log(`[Auto Re-login] Meesho session expired for ${loginEmail}. Re-authenticating automatically on client behalf...`);
              const fresh = await directMeeshoLogin(loginEmail, loginPass);
              if (fresh.success) {
                const freshIdent = resolveRealIdentifier(fresh) || effectiveIdent || sess.identifier || targetAcc?.identifier || '';
                const freshSupId = fresh.supplierId || effectiveSupId || sess.supplierId || targetAcc?.supplierId || 0;
                sessions[key].cookies = fresh.cookies;
                sessions[key].identifier = freshIdent;
                sessions[key].supplierId = freshSupId;
                sessions[key].storeName = fresh.storeName || sess.storeName || targetAcc?.storeName;
                sessions[key].email = loginEmail;
                sessions[key].password = loginPass;
                sessions[key].expired = false;
                try {
                  localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
                  setLocalSessions({ ...sessions });
                  syncBackgroundSessions(sessions, false, user?.uid);
                } catch {}
                await updateDoc(doc(db, 'accounts', targetDocId), {
                  status: 'live',
                  cookies: fresh.cookies,
                  identifier: freshIdent,
                  supplierId: freshSupId,
                  currentOtp: fresh.otp || '----',
                  courier: fresh.courier || 'No Return',
                  handoverCount: fresh.handoverCount || 0,
                  otpList: Array.isArray(fresh.otpList) ? fresh.otpList : [],
                  dateTime: fresh.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  lastUpdated: new Date().toISOString()
                }).catch(() => {});
                otpRes = await directFetchDeliveryOTPs(freshIdent, fresh.cookies, freshSupId);
              }
            }
          }

          // Guard: If error or temporary auth glitch, do NOT overwrite Firestore with session_expired so website is never disrupted.
          // The native mobile app keeps retrying silently in the background with stored credentials.
          if (otpRes.error || otpRes.expired) {
            console.warn(`[Native OTP Poll] Auto-sync retry scheduled for ${key}:`, otpRes.error || 'expired');
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
          const currentTimeStr = otpRes.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          // Instantly update live timestamp on this device
          setLiveCheckedTimes(prev => ({
            ...prev,
            [key]: currentTimeStr,
            [targetDocId]: currentTimeStr,
            ...(targetAcc?.syncKey ? { [targetAcc.syncKey]: currentTimeStr } : {}),
            ...(targetAcc?.id ? { [targetAcc.id]: currentTimeStr } : {})
          }));

          // Compare against raw unmasked Firestore value so if Firestore still holds a stale OTP, we always send updateDoc to erase it
          const existingAcc = accountsRef.current?.find(a => a.id === key || a.syncKey === key || a.id === targetDocId);
          const prevSynced = lastSyncedDocRef.current[key];
          const rawDbOtp = existingAcc ? (existingAcc.rawFirestoreOtp ?? existingAcc.currentOtp ?? '----') : '----';
          const rawDbCourier = existingAcc ? (existingAcc.rawFirestoreCourier ?? existingAcc.courier ?? 'No Return') : 'No Return';

          const isSameAsExisting = existingAcc && (
            rawDbOtp === newOtp &&
            rawDbCourier === newCourier &&
            (existingAcc.handoverCount || 0) === newCount &&
            JSON.stringify(existingAcc.otpList || []) === newOtpListJson
          );

          // Sync fresh timestamp to Firestore on every 120s poll (or immediately when user opens/resumes app!)
          const lastSyncedAt = prevSynced?.syncedAt || (existingAcc?.lastUpdated ? new Date(existingAcc.lastUpdated).getTime() : 0);
          const timeSinceLastSyncMs = Date.now() - lastSyncedAt;
          const isStaleTimestamp = forceInstant || !lastSyncedAt || timeSinceLastSyncMs >= 100 * 1000;

          if (isSameAsExisting && !isStaleTimestamp && existingAcc?.status === 'live') {
            continue;
          }

          lastSyncedDocRef.current[key] = {
            currentOtp: newOtp,
            courier: newCourier,
            handoverCount: newCount,
            otpListJson: newOtpListJson,
            syncedAt: Date.now()
          };

          // Update Firestore immediately so UI and all devices reflect current OTP (or erase to '----' if no OTP) and fresh timestamp
          await updateDoc(doc(db, 'accounts', targetDocId), {
            currentOtp: newOtp,
            courier: newCourier,
            handoverCount: newCount,
            dateTime: currentTimeStr,
            otpList: otpRes.otpList || [],
            identifier: sess.identifier || existingAcc?.identifier || '',
            status: 'live',
            lastUpdated: new Date().toISOString()
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('Native OTP poll error:', err);
      } finally {
        isPollingRef.current = false;
        if (pendingForcePollRef.current) {
          pendingForcePollRef.current = false;
          setTimeout(() => pollAllNativeSessions(true), 150);
        }
      }
    };

    pollAllNativeSessionsRef.current = pollAllNativeSessions;

    // Immediately restore sessions from Android Native SharedPreferences, then trigger instant OTP poll!
    (async () => {
      try {
        const nativeStored = await getNativeStoredSessions();
        if (nativeStored && typeof nativeStored === 'object' && Object.keys(nativeStored).length > 0) {
          const rawLocal = localStorage.getItem('native_meesho_sessions');
          let merged = rawLocal ? JSON.parse(rawLocal) : {};
          let hasUpdates = false;

          for (const [k, v] of Object.entries(nativeStored)) {
            if (!v) continue;
            if (user && v.userId && v.userId !== user.uid) continue;
            if (v.password) {
              saveEncryptedStoreCredentials(k, v, user?.uid);
            }
            // If accounts are already loaded, skip merging deleted MSH- ghost keys
            if (accountsRef.current && accountsRef.current.length > 0) {
              const isKnownActive = accountsRef.current.some(a => a.id === k || a.syncKey === k);
              if (!isKnownActive) continue;
            }
            if (!merged[k]) {
              merged[k] = v;
              hasUpdates = true;
            } else {
              if (!merged[k].password && v.password) {
                merged[k].password = v.password;
                hasUpdates = true;
              }
              if (!merged[k].email && v.email) {
                merged[k].email = v.email;
                hasUpdates = true;
              }
              if (!merged[k].cookies && v.cookies) {
                merged[k].cookies = v.cookies;
                hasUpdates = true;
              }
            }
          }

          if (hasUpdates || !rawLocal) {
            localStorage.setItem('native_meesho_sessions', JSON.stringify(merged));
            setLocalSessions(merged);
          }
        }
      } catch (err) {
        console.warn('[Native App] getNativeStoredSessions restoration error:', err);
      }

      try {
        const rawSessions = localStorage.getItem('native_meesho_sessions');
        if (rawSessions) {
          const sessions = JSON.parse(rawSessions);
          syncBackgroundSessions(sessions, false, user?.uid);
        }
        startBackgroundMonitoring();
      } catch (e) {}

      // 1. Instant zero-delay poll immediately after native session restoration
      pollAllNativeSessions(true);
    })();

    // 2. Dynamic polling schedule:
    // Courier time (08:00 AM to 09:00 PM): every 120 seconds (2 minutes)
    // Non-courier time (09:00 PM to 08:00 AM): every 60 minutes (3600 seconds)
    const getPollIntervalMs = () => {
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 8 && hour < 21) {
        return 120 * 1000; // 120 seconds (2 minutes) during courier hours
      }
      return 60 * 60 * 1000; // 60 minutes (1 hour) during non-courier hours
    };

    let pollTimerId = null;
    const scheduleNextForegroundPoll = () => {
      const delay = getPollIntervalMs();
      pollTimerId = setTimeout(async () => {
        await pollAllNativeSessions(false);
        scheduleNextForegroundPoll();
      }, delay);
    };

    scheduleNextForegroundPoll();

    // 3. Instant trigger whenever user opens app, clicks notification, or returns to app
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollAllNativeSessions(true);
      }
    };
    const onFocus = () => {
      pollAllNativeSessions(true);
    };
    const onNativeResume = () => {
      pollAllNativeSessions(true);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('nativeAppResume', onNativeResume);

    let appStateListener = null;
    if (typeof Capacitor !== 'undefined' && Capacitor.addListener) {
      try {
        appStateListener = Capacitor.addListener('appStateChange', (state) => {
          if (state && state.isActive) {
            pollAllNativeSessions(true);
          }
        });
      } catch (e) {}
    }

    return () => {
      if (pollTimerId) clearTimeout(pollTimerId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('nativeAppResume', onNativeResume);
      if (appStateListener && appStateListener.remove) {
        appStateListener.remove();
      }
    };
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
      savePersistentAuth(customerEmail.trim(), customerPassword, 'customer');
      await loadUserProfile(currentUser.uid, currentUser.phoneNumber, currentUser.email);
    } catch (err) {
      console.error("Customer login error:", err);
      // Fallback matching Super Admin credentials
      if (customerEmail.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && customerPassword === '@rrt123') {
        savePersistentAuth(SUPER_ADMIN_EMAIL, '@rrt123', 'admin');
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
      savePersistentAuth(adminEmail.trim(), adminPassword, 'admin');
      await loadUserProfile(userCred.user.uid, '', userCred.user.email);
    } catch (err) {
      console.error("Firebase admin login error:", err);
      // Fallback matching credentials
      if (adminEmail.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && adminPassword === '@rrt123') {
        savePersistentAuth(SUPER_ADMIN_EMAIL, '@rrt123', 'admin');
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
    clearPersistentAuth();
    if (isNativeMobile()) {
      try {
        await stopBackgroundMonitoring();
        await syncBackgroundSessions({}, true, '');
      } catch {}
    }
    try {
      localStorage.removeItem('cached_auth_user');
      localStorage.removeItem('om_active_user_uid');
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
            userId: user?.uid,
            identifier: targetAcc.identifier || '',
            supplierId: targetAcc.supplierId || 0,
            storeName: targetAcc.storeName || storeName,
            cookies: targetAcc.cookies || ''
          };
          sessions[syncKey] = sess;
          try {
            localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
            setLocalSessions(sessions);
            syncBackgroundSessions(sessions, false, user?.uid);
          } catch {}
        }

        // 2. If we have session / credentials, fetch directly
        const vaultCred = findCredentialsForAccount(targetAcc || { id: syncKey, syncKey }, user?.uid);
        if (sess) {
          if (user?.uid) sess.userId = user.uid;
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
              sess.userId = user?.uid;
              sessions[syncKey] = sess;
              try {
                localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
                setLocalSessions(sessions);
                syncBackgroundSessions(sessions, false, user?.uid);
              } catch {}
              await updateDoc(doc(db, 'accounts', targetAcc?.id || syncKey), {
                status: 'live',
                cookies: fresh.cookies,
                identifier: sess.identifier,
                supplierId: sess.supplierId,
                currentOtp: fresh.otp || '----',
                courier: fresh.courier || 'No Return',
                handoverCount: fresh.handoverCount || 0,
                otpList: Array.isArray(fresh.otpList) ? fresh.otpList : [],
                dateTime: fresh.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
                sessions[syncKey].userId = user?.uid;
                sessions[syncKey].expired = false;
                try {
                  localStorage.setItem('native_meesho_sessions', JSON.stringify(sessions));
                  setLocalSessions(sessions);
                  syncBackgroundSessions(sessions, false, user?.uid);
                } catch {}
                await updateDoc(doc(db, 'accounts', targetAcc?.id || syncKey), {
                  status: 'live',
                  cookies: fresh.cookies,
                  identifier: freshIdent,
                  supplierId: freshSupId,
                  currentOtp: fresh.otp || '----',
                  courier: fresh.courier || 'No Return',
                  handoverCount: fresh.handoverCount || 0,
                  otpList: Array.isArray(fresh.otpList) ? fresh.otpList : [],
                  dateTime: fresh.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
              showToast(`Auto-sync active for ${storeName}`, 'info');
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
            const currentTimeStr = otpRes.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            setLiveCheckedTimes(prev => ({
              ...prev,
              [syncKey]: currentTimeStr,
              ...(targetAcc?.syncKey ? { [targetAcc.syncKey]: currentTimeStr } : {}),
              ...(targetAcc?.id ? { [targetAcc.id]: currentTimeStr } : {})
            }));

            await updateDoc(doc(db, 'accounts', targetAcc?.id || syncKey), {
              currentOtp: newOtp,
              courier: newCourier,
              handoverCount: newCount,
              dateTime: currentTimeStr,
              otpList: otpRes.otpList || [],
              status: 'live',
              lastUpdated: new Date().toISOString()
            }).catch(() => {});

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
                userId: user?.uid,
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
              syncBackgroundSessions(curSess, false, user?.uid);
              const otpRes = await directFetchDeliveryOTPs(freshIdent, fresh.cookies, freshSupId);
              const currentTimeStr = otpRes.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              setLiveCheckedTimes(prev => ({
                ...prev,
                [syncKey]: currentTimeStr,
                ...(targetAcc.id ? { [targetAcc.id]: currentTimeStr } : {})
              }));
              await updateDoc(doc(db, 'accounts', targetAcc.id), {
                cookies: fresh.cookies,
                identifier: freshIdent,
                supplierId: freshSupId,
                currentOtp: otpRes.otp || '----',
                courier: otpRes.courier || 'No Return',
                handoverCount: otpRes.handoverCount || 0,
                dateTime: currentTimeStr,
                otpList: otpRes.otpList || [],
                status: 'live',
                lastUpdated: new Date().toISOString()
              }).catch(() => {});
              if (otpRes.otp && otpRes.otp !== '----') {
                showToast(`Return OTP for ${storeName}: ${otpRes.otp} (${otpRes.courier || 'Courier'})`, 'success');
              } else {
                showToast(`Checked ${storeName}: No return courier right now.`, 'info');
              }
              return;
            }
          }
          showToast(`Auto-sync active for ${storeName}`, 'info');
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
        userId: user?.uid,
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
      syncBackgroundSessions(curSessions, false, user?.uid);

      // 2. Update Firestore so all devices get live status & cookies
      await updateDoc(doc(db, 'accounts', reconnectAccount.id), {
        cookies: res.cookies,
        identifier: res.identifier || reconnectAccount.identifier || '',
        supplierId: res.supplierId || reconnectAccount.supplierId || 0,
        currentOtp: res.otp || '----',
        courier: res.courier || 'No Return',
        handoverCount: res.handoverCount || 0,
        dateTime: res.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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

    if (!isNativeMobile()) {
      setModalError('Store connection is only available inside the OrderMunim Android Mobile App. Please download and install the app to connect stores.');
      return;
    }

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
      const isDataEmailFallback = data?.storeName && cleanEmail && (data.storeName.trim().toLowerCase() === cleanEmail.split('@')[0].trim().toLowerCase());
      const finalStoreName = newStoreName.trim() || 
        (existingStore?.storeName && isDataEmailFallback ? existingStore.storeName : null) || 
        (data?.storeName && !isDataEmailFallback ? data.storeName : null) || 
        existingStore?.storeName || 
        data?.storeName || 
        autoStoreName;
      const targetAccRef = doc(db, 'accounts', targetSyncKey);

      await setDoc(targetAccRef, {
        userId: user.uid,
        storeName: finalStoreName,
        identifier: data.identifier || '',
        supplierId: data.supplierId || 0,
        email: cleanEmail || '',
        encryptedEmail: cleanEmail ? encryptSecret(cleanEmail) : '',
        encryptedPassword: meeshoPass ? encryptSecret(meeshoPass) : '',
        syncKey: targetSyncKey,
        currentOtp: data.otp || '----',
        courier: data.courier || 'No Return',
        handoverCount: data.handoverCount || 0,
        dateTime: data.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
            userId: user?.uid,
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
          syncBackgroundSessions(sessions, false, user?.uid);
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

  // Edit / Rename Account Holder / Store Name directly
  const handlePromptRenameStore = (acc) => {
    const currentName = acc.storeName || '';
    const newName = window.prompt('Enter Account Holder / Store Name:', currentName);
    if (newName !== null && newName.trim() && newName.trim() !== currentName) {
      const trimmed = newName.trim();
      updateDoc(doc(db, 'accounts', acc.syncKey || acc.id), {
        storeName: trimmed,
        lastUpdated: new Date().toISOString()
      }).then(() => {
        showToast(`Store renamed to "${trimmed}"`, 'success');
      }).catch(err => {
        showToast(`Failed to update store name: ${err.message}`, 'error');
      });
    }
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
                syncBackgroundSessions(sessions, false, user?.uid);
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

      const cleanVerName = (broadcastVersionName.trim() || '5.3').replace(/^v/i, '');
      let finalDownloadUrl = broadcastUrl.trim() || `https://raw.githubusercontent.com/RRTraders/ordermunim_live/main/ordermunim_v${cleanVerName}.apk`;
      if (/ordermunim_v[0-9.]+\.apk/i.test(finalDownloadUrl)) {
        finalDownloadUrl = finalDownloadUrl.replace(/ordermunim_v[0-9.]+\.apk/i, `ordermunim_v${cleanVerName}.apk`);
      }
      let finalTitle = broadcastTitle.trim() || `New Update Available (v${cleanVerName})!`;
      if (/\(v[0-9.]+\)/i.test(finalTitle)) {
        finalTitle = finalTitle.replace(/\(v[0-9.]+\)/i, `(v${cleanVerName})`);
      }

      const updateData = {
        active: activateState,
        versionCode: Number(broadcastVersionCode) || 2,
        versionName: cleanVerName,
        title: finalTitle,
        message: broadcastMessage.trim(),
        downloadUrl: finalDownloadUrl,
        updateMode: broadcastMode,
        graceDays: graceDaysNum,
        publishedAt: (appUpdateConfig?.publishedAt && !activateState) ? appUpdateConfig.publishedAt : publishedDate.toISOString(),
        deadlineAt: broadcastMode === 'grace_period' ? deadlineDate.toISOString() : null,
        updatedAt: new Date().toISOString()
      };

      setBroadcastUrl(finalDownloadUrl);
      setBroadcastTitle(finalTitle);
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

  // Semantic version comparison helper: returns true ONLY if installed is strictly older than target
  const checkIsVersionOlder = (instCode, instName, tgtCode, tgtName) => {
    // 1. Compare semantic version names (e.g., "2.7" vs "2.5")
    if (instName && tgtName) {
      const parseNums = (str) => String(str).replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
      const instParts = parseNums(instName);
      const tgtParts = parseNums(tgtName);
      const maxLen = Math.max(instParts.length, tgtParts.length);
      for (let i = 0; i < maxLen; i++) {
        const a = instParts[i] || 0;
        const b = tgtParts[i] || 0;
        if (a > b) return false; // Installed is newer (e.g. 2.7 > 2.5) -> NOT older
        if (a < b) return true;  // Installed is older -> is older
      }
      return false; // Equal version strings
    }
    // 2. Compare integer version codes if names are unavailable
    if (tgtCode && instCode) {
      return Number(instCode) < Number(tgtCode);
    }
    return false;
  };

  // Compute In-App Update Status for Current User
  const getAppUpdateStatus = () => {
    // Only prompt for APK update on native Android mobile app!
    // On web / desktop browsers, the app is already live from Firebase Hosting.
    if (!isNativeMobile()) {
      return { shouldPrompt: false };
    }

    // CRITICAL: If broadcast is NOT active in admin Firestore config, NEVER prompt or lock!
    if (!appUpdateConfig || !appUpdateConfig.active) {
      return { shouldPrompt: false };
    }

    const targetCode = Number(appUpdateConfig.versionCode) || 0;
    const targetName = String(appUpdateConfig.versionName || '').trim().replace(/^v/i, '');

    // Wait until native Android PackageManager returns real installed version info
    if (installedVersionCode === null && installedVersionName === null) {
      return { shouldPrompt: false };
    }

    // Check if installed app is genuinely older than target broadcast version
    const isOlder = checkIsVersionOlder(installedVersionCode, installedVersionName, targetCode, targetName);
    if (!isOlder) {
      return { shouldPrompt: false };
    }

    const mode = appUpdateConfig.updateMode || 'optional';
    let downloadUrl = appUpdateConfig.downloadUrl || `https://meesho-otp-app.web.app/ordermunim_v${targetName || CURRENT_APP_VERSION_NAME}.apk`;
    // If URL points to broken/private GitHub raw URLs, redirect to reliable Firebase Hosting CDN
    if (downloadUrl.includes('raw.githubusercontent.com') || downloadUrl.includes('ordermunim_live') || downloadUrl.includes('meesho-otp')) {
      downloadUrl = `https://meesho-otp-app.web.app/ordermunim_v${targetName || CURRENT_APP_VERSION_NAME}.apk`;
    } else if (targetName && /ordermunim_v[0-9.]+\.apk/i.test(downloadUrl)) {
      downloadUrl = downloadUrl.replace(/ordermunim_v[0-9.]+\.apk/i, `ordermunim_v${targetName}.apk`);
    }
    const versionName = targetName || `v${CURRENT_APP_VERSION_NAME}`;

    if (mode === 'force_immediate') {
      return {
        shouldPrompt: true,
        isForce: true,
        downloadUrl,
        title: appUpdateConfig.title || 'Mandatory App Update',
        message: appUpdateConfig.message || `A required update (${versionName}) is available. Please update to continue using OrderMunim.`,
        versionName
      };
    }

    if (mode === 'optional') {
      if (updateDismissed || (dismissedUpdateCode && dismissedUpdateCode >= targetCode)) {
        return { shouldPrompt: false };
      }
      return {
        shouldPrompt: true,
        isForce: false,
        isGrace: false,
        downloadUrl,
        title: appUpdateConfig.title || 'New Update Available!',
        message: appUpdateConfig.message || `A new update (${versionName}) is available. Please update your OrderMunim app.`,
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
        message: appUpdateConfig.message || `Your grace period has expired. You must update to version ${versionName} to continue using OrderMunim.`,
        versionName
      };
    }

    if (updateDismissed || (dismissedUpdateCode && dismissedUpdateCode >= targetCode)) {
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
    let targetUrl = url || `https://meesho-otp-app.web.app/ordermunim_v${CURRENT_APP_VERSION_NAME}.apk`;
    if (targetUrl.includes('raw.githubusercontent.com') || targetUrl.includes('ordermunim_live') || targetUrl.includes('meesho-otp')) {
      targetUrl = `https://meesho-otp-app.web.app/ordermunim_v${CURRENT_APP_VERSION_NAME}.apk`;
    }
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
          setUpdateStatusText('Download complete! Tap "Update" on the Android installer prompt to finish.');
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

  // Handle Request Exact Alarm Permission for 2-Minute Background Refresh
  const handleRequestExactAlarmPermission = async () => {
    if (isNativeMobile()) {
      showToast('Opening Alarms & Reminders settings...', 'info');
      try {
        const res = await requestExactAlarmPermission();
        if (res?.alreadyGranted) {
          setCanScheduleExactAlarms(true);
          showToast('✓ 2-Minute Background Alarm Permission is already active!', 'success');
        } else {
          showToast('Please enable "Allow setting alarms and reminders" toggle.', 'info');
        }
      } catch (err) {
        showToast(`Could not open settings: ${err.message}`, 'error');
      }
    } else {
      showToast('Fast alarms are handled automatically on web.', 'info');
    }
  };

  // Handle Open Notification Settings (allows user to hide background notification without affecting OTP alerts)
  const handleOpenSystemNotificationSettings = async () => {
    if (isNativeMobile()) {
      try {
        await openNotificationSettings();
        showToast('Opening Notification Settings. You can turn off "OrderMunim Background Sync" to hide background bar while keeping OTP alerts active.', 'info');
      } catch (err) {
        showToast(`Could not open notification settings: ${err.message}`, 'error');
      }
    } else {
      showToast('Notifications are managed via browser permissions.', 'info');
    }
  };

  // Admin: load all users and all platform stores for Super Admin or when Admin tab is active & unlocked
  useEffect(() => {
    const shouldLoad = isSuperAdmin || (activeTab === 'admin' && adminAuthenticated);
    if (!shouldLoad) return;
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const uList = [];
      snapshot.forEach((d) => {
        uList.push({ id: d.id, ...d.data() });
      });
      setAllUsersList(uList);
    }, (error) => {
      console.warn("unsubUsers listener error:", error);
    });

    const unsubAllAccounts = onSnapshot(collection(db, 'accounts'), (snapshot) => {
      const accList = [];
      snapshot.forEach((d) => {
        accList.push(sanitizeStaleAccountOtp({ id: d.id, ...d.data() }, true));
      });
      setAllPlatformAccounts(accList);
    }, (error) => {
      console.warn("unsubAllAccounts listener error:", error);
    });

    return () => {
      unsubUsers();
      unsubAllAccounts();
    };
  }, [isSuperAdmin, activeTab, adminAuthenticated]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (adminInputPass === ADMIN_PASS || adminInputPass === '@rrt123') {
      setAdminAuthenticated(true);
      showToast('Admin Console Unlocked', 'success');
    } else {
      showToast('Incorrect admin secret password', 'error');
    }
  };

  // Admin: Update user quota limit with accidental click confirmation & excess store auto-deletion
  const handleUpdateUserQuota = async (targetUid, newLimit, currentQuota = 0, userIdentifier = '') => {
    const targetQuota = Math.max(0, parseInt(newLimit, 10) || 0);
    const userStores = allPlatformAccounts.filter(a => a.userId === targetUid);

    // If reducing quota: require confirmation to avoid accidental clicks & auto-delete excess stores
    if (targetQuota < currentQuota) {
      const willDeleteStores = targetQuota < userStores.length;
      const storesToDeleteCount = willDeleteStores ? (userStores.length - targetQuota) : 0;
      const storesToDelete = willDeleteStores ? userStores.slice(targetQuota) : [];
      const storeNames = storesToDelete.map(s => s.storeName || s.syncKey).join(', ');

      setConfirmDialog({
        title: willDeleteStores ? '⚠️ Reduce Quota & Delete Store(s)?' : 'Reduce Store Quota?',
        message: willDeleteStores
          ? `Are you sure you want to reduce store slots from ${currentQuota} to ${targetQuota} for ${userIdentifier || 'this user'}? This user currently has ${userStores.length} active store(s). Reducing slots to ${targetQuota} will IMMEDIATELY and PERMANENTLY delete ${storesToDeleteCount} excess store(s): "${storeNames}".`
          : `Are you sure you want to reduce store slots from ${currentQuota} to ${targetQuota} for ${userIdentifier || 'this user'}?`,
        confirmText: willDeleteStores ? `Reduce & Delete ${storesToDeleteCount} Store(s)` : 'Yes, Reduce Quota',
        icon: willDeleteStores ? 'delete' : 'exit',
        onConfirm: async () => {
          try {
            // 1. Permanently delete excess stores from accounts collection
            if (storesToDelete.length > 0) {
              for (const store of storesToDelete) {
                await deleteDoc(doc(db, 'accounts', store.id));
              }
            }
            // 2. Update user's maxAccounts in users collection
            await updateDoc(doc(db, 'users', targetUid), {
              maxAccounts: targetQuota
            });
            showToast(
              storesToDelete.length > 0
                ? `Store quota set to ${targetQuota}. ${storesToDelete.length} excess store(s) deleted.`
                : `Store quota updated to ${targetQuota}`,
              'success'
            );
          } catch (err) {
            showToast(`Error updating quota: ${err.message}`, 'error');
          }
        }
      });
      return;
    }

    // If increasing quota (e.g. clicking +)
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        maxAccounts: targetQuota
      });
      showToast(`Store quota increased to ${targetQuota}`, 'success');
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
            <h3 className="text-base font-bold text-white">Updating OrderMunim</h3>
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

  // If Force Update is active (grace period expired or immediate), lock out users on older versions
  // For Super Admin, still show the prompt, but allow dismissal to access admin tools
  if (updateStatus.isForce && updateStatus.shouldPrompt && Boolean(appUpdateConfig?.active) && (!isSuperAdmin || !updateDismissed)) {
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
            <button
              type="button"
              onClick={() => {
                setUpdateDismissed(true);
                if (appUpdateConfig?.versionCode) {
                  setDismissedUpdateCode(Number(appUpdateConfig.versionCode));
                  try { localStorage.setItem('om_dismissed_update_code', String(appUpdateConfig.versionCode)); } catch {}
                }
              }}
              className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer underline"
            >
              Dismiss / Continue to App
            </button>
            <a
              href={updateStatus.downloadUrl}
              download="ordermunim_v4.7.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-2.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
            >
              <DownloadCloud className="w-4 h-4" />
              Download via Browser
            </a>
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
      <div className="min-h-screen text-slate-100 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-black flex items-center gap-2.5 text-white tracking-tight">
                <Truck className="w-6 h-6 text-sky-400" />
                Warehouse Return OTPs
              </h1>
              <p className="text-xs text-sky-200/70 mt-1">Live Feed • Ready for Courier Delivery Partners</p>
            </div>
            <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-400/30 text-sky-300 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-sm">
              Live Sync
            </div>
          </div>

          <div className="space-y-4">
            {accounts.length === 0 ? (
              <div className="glass-card border border-white/10 p-8 rounded-2xl text-center text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-500" />
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
                const localSess = localSessions[acc.syncKey] || localSessions[acc.id] || (acc.identifier ? localSessions[acc.identifier] : null) || (acc.email ? localSessions[acc.email.trim().toLowerCase()] : null) || Object.values(localSessions).find(s => (s.email && acc.email && s.email.toLowerCase() === acc.email.toLowerCase()) || (s.identifier && acc.identifier && s.identifier === acc.identifier));
                const vaultCred = findCredentialsForAccount(acc, user?.uid);
                const isSessionExpired = false;
                const isAutoSync = true;

                return (
                  <div key={acc.id} className={`glass-card ${isOnHold ? 'border-rose-500/40 bg-slate-950/80 shadow-rose-950/20' : isExpanded ? 'border-sky-500/50 shadow-xl shadow-sky-950/30' : 'hover:border-sky-500/30'} rounded-2xl p-4 transition-all shadow-md relative overflow-hidden`}>
                    <div className={`transition-all duration-300 ${isOnHold ? 'filter blur-md opacity-30 select-none pointer-events-none' : ''}`}>
                      {/* Clickable Header Bar (Tap to Expand/Collapse) */}
                      <div 
                        onClick={() => toggleStoreExpand(acc.id)}
                        className="flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            activeOtps.length > 0 
                              ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' 
                              : 'bg-white/5 text-slate-400 border border-white/5'
                          }`}>
                            <Package className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-base text-white truncate hover:text-sky-300 transition-colors">
                                  {acc.storeName}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePromptRenameStore(acc);
                                  }}
                                  className="p-1 text-slate-400 hover:text-sky-300 hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
                                  title="Rename Account Holder / Store Name"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {activeOtps.length > 0 ? (
                                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30">
                                  {activeOtps.length} {activeOtps.length === 1 ? 'OTP' : 'OTPs'}
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-medium border border-white/5">
                                  No Return
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {(!isAutoSync || refreshingId === acc.syncKey || refreshingId === acc.id) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleManualRefresh(acc.syncKey || acc.id, acc.storeName);
                              }}
                              disabled={refreshingId === acc.syncKey || refreshingId === acc.id}
                              className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                              title="Check live returns now"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${(refreshingId === acc.syncKey || refreshingId === acc.id) ? 'animate-spin text-sky-400' : ''}`} />
                            </button>
                          )}
                          <div className="p-1 text-slate-400">
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-sky-400' : ''}`} />
                          </div>
                        </div>
                      </div>

                      {/* Expanded Section: Single Row OTPs */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2 animate-in fade-in duration-150">
                          {activeOtps.length > 0 ? (
                            activeOtps.map((item, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center justify-between gap-2 p-2.5 bg-[#040914]/80 border border-white/10 rounded-xl"
                              >
                                {/* 1. Courier Name */}
                                <div className="flex items-center gap-1.5 min-w-[90px] shrink-0">
                                  <Truck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                  <span className="font-bold text-xs text-white truncate max-w-[120px]">
                                    {item.courier || 'Courier'}
                                  </span>
                                </div>

                                {/* 2. Parcel Count */}
                                <div className="flex items-center gap-1 text-[11px] text-slate-300 shrink-0">
                                  <Package className="w-3 h-3 text-slate-400" />
                                  <span>{item.handoverCount || 0} {item.handoverCount === 1 ? 'Parcel' : 'Parcels'}</span>
                                </div>

                                {/* 3. OTP Code */}
                                <div className="font-mono font-black text-base md:text-lg text-orange-400 tracking-wider shrink-0 px-2.5 py-0.5 bg-orange-500/15 rounded-lg border border-orange-500/30 shadow-sm shadow-orange-500/10">
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
                                    className="p-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 active:scale-95 text-orange-300 border border-orange-500/30 transition-all shrink-0 cursor-pointer"
                                    title="Copy OTP"
                                  >
                                    {copiedId === `${acc.id}-${idx}` ? (
                                      <Check className="w-4 h-4 text-white" />
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
                            <div className="flex items-center justify-between p-2.5 bg-[#040914]/50 border border-white/5 rounded-xl text-xs text-slate-400">
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                No active return courier right now
                              </span>
                              <span className="font-mono text-slate-500 font-bold">----</span>
                            </div>
                          )}

                          {/* Footer Details */}
                          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                            <span>Checked: {liveCheckedTimes[acc.syncKey] || liveCheckedTimes[acc.id] || acc.dateTime || 'Just now'}</span>
                            <span className="flex items-center gap-1 text-emerald-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Live Sync • {acc.handoverCount || 0} parcels
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {isOnHold && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm text-center select-none">
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
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-xs text-center space-y-5 border border-slate-200/90">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#083B82] to-sky-600 rounded-2xl mx-auto flex items-center justify-center shadow-md border border-slate-100">
            <MailCheck className="w-8 h-8 text-white" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verify Your Email</h2>
            <p className="text-xs text-slate-500 mt-1.5">
              We have sent an official verification link to:
            </p>
            <span className="inline-block mt-2 font-mono text-sm font-bold text-[#083B82] bg-sky-50 border border-sky-200 px-3.5 py-1.5 rounded-xl shadow-xs">
              {user.email}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-700 text-left space-y-2.5">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
              <span>Open your email inbox (also check Spam/Junk folder if not in Inbox).</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
              <span>Click the <strong>verification link</strong> sent by Firebase.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
              <span>Come back here and click <strong>"I Have Verified (Continue)"</strong> below.</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleCheckVerified}
              disabled={authLoading}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              {authLoading ? 'Verifying status...' : 'I Have Verified (Continue)'}
            </button>

            <button
              onClick={handleResendVerificationEmail}
              disabled={authLoading}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Resend Verification Link
            </button>

            <button
              onClick={handleLogout}
              className="w-full text-xs text-slate-500 hover:text-rose-600 transition-colors pt-2 block cursor-pointer"
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
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-slate-200/90">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-xs mb-3 overflow-hidden bg-white p-1 border border-slate-200">
              <img src="/logo.png" alt="OrderMunim" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#083B82]">OrderMunim</h1>
            <p className="text-xs text-slate-500 mt-1">Smart Multi-Account Return Handover &amp; OTP Hub</p>
          </div>

          {authError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-2 mb-5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{authError}</span>
            </div>
          )}

          {/* Unified Authentication (Sign In / Sign Up) */}
          <div>
            {/* Mode Tabs (Sign In vs Create Account) */}
              {authMode !== 'forgot' && (
                <div className="flex items-center justify-center gap-6 border-b border-slate-200 pb-3 mb-5">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    className={`text-sm font-bold pb-2 transition-all relative cursor-pointer ${
                      authMode === 'login' 
                        ? 'text-orange-600 border-b-2 border-orange-500' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                    className={`text-sm font-bold pb-2 transition-all relative cursor-pointer ${
                      authMode === 'signup' 
                        ? 'text-orange-600 border-b-2 border-orange-500' 
                        : 'text-slate-500 hover:text-slate-800'
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
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="seller@example.com"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#083B82] focus:bg-white transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => { setAuthMode('forgot'); setAuthError(''); }}
                        className="text-[11px] text-[#083B82] hover:underline cursor-pointer font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="password"
                        value={customerPassword}
                        onChange={(e) => setCustomerPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#083B82] focus:bg-white transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {authLoading ? 'Signing In...' : 'Sign In to Dashboard'}
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-500">
                      New to OrderMunim?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                        className="text-orange-600 font-bold hover:underline cursor-pointer"
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
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Rajesh Kumar"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#083B82] focus:bg-white transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="seller@example.com"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#083B82] focus:bg-white transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Create Password (Min 6 Characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="password"
                        value={customerPassword}
                        onChange={(e) => setCustomerPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#083B82] focus:bg-white transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="password"
                        value={customerConfirmPass}
                        onChange={(e) => setCustomerConfirmPass(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#083B82] focus:bg-white transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-sky-800 bg-sky-50 border border-sky-200 p-2.5 rounded-xl">
                    📧 An official verification link will be sent to your email. You must verify your email before accessing the dashboard.
                  </p>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {authLoading ? 'Creating Account...' : 'Sign Up & Send Verification Link'}
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-500">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthMode('login'); setAuthError(''); }}
                        className="text-orange-600 font-bold hover:underline cursor-pointer"
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
                    <h3 className="font-bold text-slate-900 text-base">Reset Your Password</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Enter your email address and we will send you a password reset link.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="seller@example.com"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#083B82] focus:bg-white transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {authLoading ? 'Sending link...' : 'Send Password Reset Link'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    className="w-full text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 pt-2 cursor-pointer font-medium"
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* Top Navigation / Desktop & Mobile Toolbar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: App Logo & Branding (Image 2 OrderMunim) */}
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer select-none group"
            title="OrderMunim - Home"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shadow-xs border border-slate-200/90 flex items-center justify-center p-0.5 group-hover:border-orange-300 transition-colors">
              <img src="/ordermunim_logo.png" alt="OrderMunim" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-black tracking-tight text-[#083B82] leading-none group-hover:text-orange-600 transition-colors">
                OrderMunim
              </span>
              <span className="text-[10px] text-slate-400 font-semibold leading-tight hidden sm:block">
                Smart Order &amp; OTP Hub
              </span>
            </div>
          </div>

          {/* Center: Desktop Navigation Bar with Clean Underline-on-Hover Style (Image 2 Inspired) */}
          <nav className="hidden lg:flex items-center gap-7 text-[13px] font-semibold text-slate-700">
            {/* 1. Home */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`relative py-1.5 transition-colors cursor-pointer group ${
                activeTab === 'dashboard' ? 'text-[#083B82] font-bold' : 'hover:text-[#083B82]'
              }`}
            >
              <span>Home</span>
              <span className={`absolute bottom-0 left-0 w-full h-[2.5px] rounded-full bg-orange-500 transition-transform duration-200 ${
                activeTab === 'dashboard' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100 origin-left'
              }`} />
            </button>

            {/* 2. E Commerce with Vertical Hover & Click Menu (Ajio, Amazon, Flipkart, Meesho, Myntra) */}
            <div
              ref={ecomDropdownRef}
              className="relative"
              onMouseEnter={() => setEcomDropdownOpen(true)}
              onMouseLeave={() => setEcomDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEcomDropdownOpen(prev => !prev);
                }}
                className={`relative py-1.5 flex items-center gap-1 transition-colors cursor-pointer group ${
                  (activeTab === 'cropper' && activeCropperMarketplace !== 'webcam') || ecomDropdownOpen
                    ? 'text-[#083B82] font-bold'
                    : 'hover:text-[#083B82]'
                }`}
              >
                <span>E Commerce</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform ${ecomDropdownOpen ? 'rotate-180 text-[#083B82]' : ''}`} />
                <span className={`absolute bottom-0 left-0 w-full h-[2.5px] rounded-full bg-orange-500 transition-transform duration-200 ${
                  (activeTab === 'cropper' && activeCropperMarketplace !== 'webcam') || ecomDropdownOpen
                    ? 'scale-x-100'
                    : 'scale-x-0 group-hover:scale-x-100 origin-left'
                }`} />
              </button>

              {ecomDropdownOpen && (
                <div className="absolute top-full left-0 pt-2 z-50 w-56 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xl p-2 flex flex-col gap-1">
                    {[
                      { id: 'ajio', name: 'Ajio', letter: 'A', bg: 'bg-slate-900 text-amber-400', desc: 'Merge Labels & Invoices' },
                      { id: 'amazon', name: 'Amazon', letter: 'a', bg: 'bg-[#131921] text-[#FF9900]', desc: 'Easy Ship Label Filter' },
                      { id: 'flipcart', name: 'Flipkart', letter: 'F', bg: 'bg-[#2874F0] text-[#FFE500]', desc: '4x6 Thermal Cropping' },
                      { id: 'meesho', name: 'Meesho', letter: 'm', bg: 'bg-fuchsia-800 text-white', desc: 'Label Crop & SKU Sort' },
                      { id: 'myntra', name: 'Myntra', letter: 'M', bg: 'bg-[#FF3F6C] text-white', desc: 'Direct Label Downloader' },
                      { id: 'snapdeal', name: 'Snapdeal', letter: 'S', bg: 'bg-[#E40046] text-white', desc: 'Crop Label & Remove Invoice' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveCropperMarketplace(item.id);
                          try { localStorage.setItem('om_selected_marketplace', item.id); } catch {}
                          setActiveTab('cropper');
                          setEcomDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                          activeTab === 'cropper' && activeCropperMarketplace === item.id
                            ? 'bg-orange-50 text-orange-700 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg ${item.bg} flex items-center justify-center text-xs font-black shrink-0`}>
                          {item.letter}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold leading-tight text-slate-800">{item.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. OTP */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('otp');
                setTimeout(() => {
                  const el = document.getElementById('otp-stores-section');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 50);
              }}
              className={`relative py-1.5 transition-colors cursor-pointer group ${
                activeTab === 'otp' ? 'text-[#083B82] font-bold' : 'hover:text-[#083B82]'
              }`}
            >
              <span>OTP</span>
              <span className={`absolute bottom-0 left-0 w-full h-[2.5px] rounded-full bg-orange-500 transition-transform duration-200 ${
                activeTab === 'otp' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100 origin-left'
              }`} />
            </button>

            {/* 4. Webcam (Webcam Recorder) */}
            <button
              type="button"
              onClick={() => {
                setActiveCropperMarketplace('webcam');
                try { localStorage.setItem('om_selected_marketplace', 'webcam'); } catch {}
                setActiveTab('cropper');
              }}
              className={`relative py-1.5 transition-colors cursor-pointer group ${
                activeTab === 'cropper' && activeCropperMarketplace === 'webcam'
                  ? 'text-[#083B82] font-bold'
                  : 'hover:text-[#083B82]'
              }`}
            >
              <span>Webcam (Recorder)</span>
              <span className={`absolute bottom-0 left-0 w-full h-[2.5px] rounded-full bg-orange-500 transition-transform duration-200 ${
                activeTab === 'cropper' && activeCropperMarketplace === 'webcam'
                  ? 'scale-x-100'
                  : 'scale-x-0 group-hover:scale-x-100 origin-left'
              }`} />
            </button>

            {/* 5. PDF Tools Suite */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('pdf-tools');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`relative py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer group ${
                activeTab === 'pdf-tools' ? 'text-[#083B82] font-bold' : 'hover:text-[#083B82]'
              }`}
            >
              <span>PDF Tools</span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md shadow-xs">10 Tools</span>
              <span className={`absolute bottom-0 left-0 w-full h-[2.5px] rounded-full bg-orange-500 transition-transform duration-200 ${
                activeTab === 'pdf-tools' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100 origin-left'
              }`} />
            </button>

            {/* 6. About Us */}
            <button
              type="button"
              onClick={() => setShowAboutModal(true)}
              className="relative py-1.5 hover:text-[#083B82] transition-colors cursor-pointer group"
            >
              <span>About Us</span>
              <span className="absolute bottom-0 left-0 w-full h-[2.5px] rounded-full bg-orange-500 transition-transform duration-200 scale-x-0 group-hover:scale-x-100 origin-left" />
            </button>

            {/* 7. Contact Us */}
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="relative py-1.5 hover:text-[#083B82] transition-colors cursor-pointer group"
            >
              <span>Contact Us</span>
              <span className="absolute bottom-0 left-0 w-full h-[2.5px] rounded-full bg-orange-500 transition-transform duration-200 scale-x-0 group-hover:scale-x-100 origin-left" />
            </button>
          </nav>

          {/* Right: Audio Mute & Profile Trigger (Opens Vertical Right Drawer) */}
          <div className="flex items-center gap-2 shrink-0">
            {isMobileApp && !isSuperAdmin && (
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Mute OTP Audio" : "Enable OTP Audio"}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-orange-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>
            )}

            {/* Profile Button - Opens Vertical Drawer From Right (Icon Only) */}
            <button
              type="button"
              onClick={() => setIsProfileDrawerOpen(true)}
              className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 flex items-center justify-center text-slate-700 transition-all shadow-xs cursor-pointer group"
              title="Open Profile"
            >
              <User className="w-5 h-5 text-slate-600 group-hover:text-orange-600 transition-colors" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 pb-28 space-y-6">
        {activeTab === 'profile' ? (
          <div className="max-w-md mx-auto bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-xs space-y-6 animate-in fade-in duration-200 text-slate-900">
            {/* 1. Round Profile Picture */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#083B82] to-sky-600 flex items-center justify-center text-white text-3xl font-black shadow-md border-4 border-slate-100 uppercase">
                {(profile?.name || user?.displayName || user?.email || 'U')[0]}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {profile?.name || user?.displayName || 'Seller User'}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {user?.email || profile?.email || user?.phoneNumber || ''}
                </p>
                <div className="mt-2.5 flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 uppercase tracking-wider">
                    {profile.maxAccounts !== undefined ? `${profile.maxAccounts} Store Slots` : '0 Store Slots'}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 uppercase tracking-wider">
                    {accounts.length} Linked Stores
                  </span>
                  {isSuperAdmin && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                      Super Admin
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Connected Stores Quota Box */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-sky-600" />
                <span className="font-bold text-sm text-slate-900">Connected Stores</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-sky-50 border border-sky-200 text-sky-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {accounts.length} / {profile.maxAccounts ?? 0} Slots Used
                </span>
                {accounts.length >= (profile.maxAccounts ?? 0) && (
                  <span className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">
                    Limit Reached
                  </span>
                )}
              </div>
            </div>

            {/* Follow Us Page Store Profiles (QR & Labels) */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 text-xs space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-sky-600" />
                  <span className="font-bold text-sm text-slate-900">Follow Us Store Profiles</span>
                </div>
                <span className="bg-sky-50 border border-sky-200 text-sky-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                  {(profile?.followStores || []).length} / {getMaxFollowStoresAllowed(profile)} Stores Added
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Add your store names &amp; links here. They will automatically appear in the <strong className="text-slate-900">Follow Us dropdown</strong> on the Label Cropper page!
              </p>

              {/* Existing Stores List */}
              <div className="space-y-2">
                {(profile?.followStores || []).map((store) => (
                  <div key={store.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-bold text-slate-900 text-xs truncate">{store.name}</div>
                      <div className="text-[10px] text-sky-700 font-mono truncate">{store.url}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteFollowStore(store.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove store profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Store Form */}
              {(profile?.followStores || []).length < getMaxFollowStoresAllowed(profile) ? (
                <form onSubmit={handleAddFollowStore} className="pt-2 border-t border-slate-200/80 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700">Add New Store Profile:</div>
                  <input
                    type="text"
                    value={newFollowStoreName}
                    onChange={(e) => setNewFollowStoreName(e.target.value)}
                    placeholder="Store Name (e.g. RR Traders)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="url"
                    value={newFollowStoreUrl}
                    onChange={(e) => setNewFollowStoreUrl(e.target.value)}
                    placeholder="Profile URL (e.g. https://meesho.com/...)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    disabled={addingFollowStore}
                    className="w-full py-2 px-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{addingFollowStore ? 'Saving...' : 'Add Store Profile'}</span>
                  </button>
                </form>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800">
                  Store profile quota reached ({getMaxFollowStoresAllowed(profile)} permitted). Contact admin to add more store profiles.
                </div>
              )}
            </div>

            {/* Account Details Box */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between text-slate-600">
                <span>Account Role</span>
                <strong className="text-slate-900 capitalize">{profile?.role || 'Seller'}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Email Status</span>
                <strong className="text-emerald-600 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </strong>
              </div>
              {isMobileApp ? (
                <div className="flex items-center justify-between text-slate-600">
                  <span>App Version</span>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 font-mono font-bold">
                      {installedVersionName ? `v${installedVersionName}` : 'Checking...'}
                    </strong>
                    {!Boolean(appUpdateConfig?.active && checkIsVersionOlder(installedVersionCode, installedVersionName, Number(appUpdateConfig.versionCode), appUpdateConfig.versionName)) ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Up to date
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Update Available
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-slate-600">
                  <span>Web Portal</span>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 font-mono font-bold">v{CURRENT_APP_VERSION_NAME} (Cloud)</strong>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" /> Live
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* In-App APK Update Action Button if update is available */}
            {isMobileApp && Boolean(appUpdateConfig?.active && checkIsVersionOlder(installedVersionCode, installedVersionName, Number(appUpdateConfig.versionCode), appUpdateConfig.versionName)) && (
              <button
                type="button"
                onClick={() => handleInstallAppUpdate(appUpdateConfig?.downloadUrl)}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                Update App to v{appUpdateConfig?.versionName || CURRENT_APP_VERSION_NAME}
              </button>
            )}

            {/* App Update Broadcast Section (Super Admin Only) */}
            {isSuperAdmin && (
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Rocket className="w-4 h-4 text-sky-600" />
                    App Update Broadcast
                  </span>
                  {broadcastActive ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      Live v{broadcastVersionName}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Manage app releases, push in-app update notices, configure direct APK download link, and set force-lock deadlines for all clients.
                </p>
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(true)}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <Rocket className="w-3.5 h-3.5 text-sky-600" />
                  App Update Broadcast
                </button>
              </div>
            )}

            {/* Background Sync & Battery Optimization Card (Mobile App Only) */}
            {isMobileApp && (
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                    Background Sync & Permissions
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    Android 24/7
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  If background OTP alerts stop or you previously denied battery permissions, tap below to grant exemption and keep syncing 24/7.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleFixBatteryOptimization}
                    className="w-full py-2.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
                    Fix Battery Optimization
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenSystemAppSettings}
                    className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    App Settings / Permissions
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestExactAlarmPermission}
                    className={`col-span-1 sm:col-span-2 w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      canScheduleExactAlarms
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{canScheduleExactAlarms ? '✓ 2-Minute Alarm: Enabled' : '⚡ Enable 2-Minute Background Alarm (Tap to Allow)'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Actions Section */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              {/* 2. Sign Out button with icon */}
              <button
                type="button"
                onClick={handlePromptLogout}
                className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 transition-colors shadow-xs"
              >
                <LogOut className="w-4 h-4 text-slate-600" />
                Sign Out
              </button>

              {/* 3. Delete this account in red font small letters */}
              {!isSuperAdmin && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handlePromptDeleteAccount}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:underline transition-colors lowercase font-medium cursor-pointer"
                  >
                    delete this account
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'cropper' ? (
          <CropperErrorBoundary>
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
                <p className="text-sm font-semibold">Loading Shipping Label Cropper...</p>
              </div>
            }>
              <LabelCropper
                showToast={showToast}
                followStores={profile?.followStores || []}
                onNavigateTab={setActiveTab}
                activeMarketplaceId={activeCropperMarketplace}
              />
            </Suspense>
          </CropperErrorBoundary>

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
                  <span>Clients: <strong className="text-white">{allUsersList.filter(u => u.role !== 'super_admin' && u.emailVerified !== false).length}</strong></span>
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
                          const isExpanded = Boolean(expandedAdminUserIds[u.id]);

                          return (
                            <div key={u.id} className="bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-2xl shadow-md transition-all overflow-hidden">
                              {/* Sleek, Compact User Row */}
                              <div 
                                onClick={() => toggleAdminUserExpand(u.id)}
                                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-900/40 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {/* Sequence Badge */}
                                  <span className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-sm" title={`Account #${sequenceNum}`}>
                                    #{sequenceNum}
                                  </span>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-white text-sm md:text-base hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                                        📱 {u.mobile || u.email || 'Client User'}
                                      </span>

                                      {/* Status Badges */}
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                        u.status === 'on_hold' 
                                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                      }`}>
                                        {u.status === 'on_hold' ? 'On Hold' : 'Active'}
                                      </span>

                                      {u.paymentAlert && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                                          <BellRing className="w-2.5 h-2.5" /> Due Alert
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2.5 flex-wrap">
                                      {u.name && <span className="text-slate-400 font-sans">Name: <strong>{u.name}</strong></span>}
                                      <span>UID: {u.id.slice(0, 10)}...</span>
                                      {u.createdAt && (
                                        <span>Joined: {new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Right side: Clickable Stores Counter Pill & Settings Button */}
                                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto" onClick={(e) => e.stopPropagation()}>
                                  {/* Clickable Stores Counter Pill (toggles store view) */}
                                  <button
                                    type="button"
                                    onClick={() => toggleAdminUserExpand(u.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 border transition-all cursor-pointer ${
                                      userStores.length > quota
                                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                                        : userStores.length > 0
                                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-300 hover:bg-sky-500/20'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                                    }`}
                                    title="Click to view added stores"
                                  >
                                    <Package className="w-3.5 h-3.5 text-sky-400" />
                                    <span>{userStores.length} / {quota} Stores</span>
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-sky-300' : 'text-slate-500'}`} />
                                  </button>

                                  {/* Unified Settings Button */}
                                  <button
                                    type="button"
                                    onClick={() => setAdminSettingsUser(u)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer group"
                                    title="Manage Account Settings, Quota & Actions"
                                  >
                                    <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
                                    <span>Settings</span>
                                  </button>
                                </div>
                              </div>

                              {/* Expandable Added Stores Section (Only shows when clicked!) */}
                              {isExpanded && (
                                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-900/30 space-y-2 animate-in fade-in duration-150">
                                  <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                      <Package className="w-3.5 h-3.5 text-sky-400" /> Connected Meesho Stores ({userStores.length})
                                    </span>
                                    {userStores.length > quota && (
                                      <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                                        ⚠️ Quota Exceeded ({userStores.length - quota} extra)
                                      </span>
                                    )}
                                  </div>

                                  {userStores.length === 0 ? (
                                    <div className="py-3 px-4 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-500 italic text-center">
                                      No Meesho stores added yet by this client.
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                      {userStores.map(store => (
                                        <div key={store.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
                                          <div className="min-w-0 flex-1 pr-2">
                                            <span className="font-bold text-white block truncate">📦 {store.storeName}</span>
                                            <span className="text-[11px] text-slate-400 font-mono block truncate">Sync: {store.syncKey} {store.email ? `• ${store.email}` : ''}</span>
                                            {store.dateTime && (
                                              <span className="text-[10px] text-slate-500 font-mono">Last check: {store.dateTime}</span>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteAccount(store.id, store.storeName)}
                                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                                            title="Delete store"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
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

                  {/* Unified Account Settings Modal */}
                  {adminSettingsUser && (() => {
                    const targetUser = allUsersList.find(u => u.id === adminSettingsUser.id) || adminSettingsUser;
                    const userStores = allPlatformAccounts.filter(a => a.userId === targetUser.id);
                    const quota = targetUser.maxAccounts !== undefined ? targetUser.maxAccounts : 0;

                    return (
                      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 text-white animate-in fade-in duration-150">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl shadow-cyan-950/40 animate-in zoom-in-95 duration-150">
                          {/* Header */}
                          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                                <Settings className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-base font-bold text-white truncate">
                                  Account Settings
                                </h3>
                                <p className="text-xs text-slate-400 font-mono truncate">
                                  📱 {targetUser.mobile || targetUser.email || targetUser.id}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAdminSettingsUser(null)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          {/* 1. Store Quota */}
                          <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-bold text-xs text-white block">Store Slot Quota</span>
                                <span className="text-[11px] text-slate-400">
                                  {userStores.length} of {quota} slots currently used
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateUserQuota(targetUser.id, Math.max(0, quota - 1), quota, targetUser.mobile || targetUser.email || targetUser.name)}
                                  disabled={quota <= 0}
                                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-bold flex items-center justify-center text-sm transition-colors cursor-pointer"
                                  title="Decrease quota"
                                >
                                  -
                                </button>
                                <span className="text-sm font-bold text-white px-2 font-mono">
                                  {quota}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateUserQuota(targetUser.id, quota + 1, quota, targetUser.mobile || targetUser.email || targetUser.name)}
                                  className="w-8 h-8 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center text-sm transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                                  title="Increase quota (+1)"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 2. Account Status */}
                          <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 flex items-center justify-between gap-3">
                            <div>
                              <span className="font-bold text-xs text-white block">Account Status</span>
                              <span className="text-[11px] text-slate-400">
                                {targetUser.status === 'on_hold' ? 'Account is paused' : 'Account is active and syncing'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(targetUser.id, targetUser.status)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                                targetUser.status === 'on_hold'
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                              {targetUser.status === 'on_hold' ? 'Activate Account' : 'Put On Hold'}
                            </button>
                          </div>

                          {/* 3. Payment Alert */}
                          <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 flex items-center justify-between gap-3">
                            <div>
                              <span className="font-bold text-xs text-white block">Payment Due Notification</span>
                              <span className="text-[11px] text-slate-400">
                                {targetUser.paymentAlert ? 'Due alert active' : 'No payment alert displayed'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleTogglePaymentAlert(targetUser.id, targetUser.paymentAlert, quota)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                                targetUser.paymentAlert
                                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              }`}
                            >
                              <BellRing className="w-3.5 h-3.5" />
                              {targetUser.paymentAlert ? 'Cancel Alert' : 'Send Alert'}
                            </button>
                          </div>

                          {/* 4. Delete Account */}
                          <div className="border border-rose-500/30 bg-rose-500/5 rounded-2xl p-4 flex items-center justify-between gap-3">
                            <div>
                              <span className="font-bold text-xs text-rose-300 block">Delete Account</span>
                              <span className="text-[11px] text-rose-400/80">
                                Permanently remove account & stores
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAdminSettingsUser(null);
                                handleDeleteUserAccount(targetUser.id, targetUser.mobile || targetUser.email);
                              }}
                              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        ) : activeTab === 'otp' ? (
          /* ================= OTP FEATURE TAB (CONNECTED STORES & LIVE OTPS) ================= */
          <>
            {/* Account Status Alerts */}
            {profile.status === 'on_hold' && (
              <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-2xl flex items-center gap-3.5 shadow-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm text-rose-950">Account On Hold</h3>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Your account is currently on hold. Please contact admin to activate your service.
                  </p>
                </div>
              </div>
            )}

            {profile.paymentAlert && profile.status !== 'on_hold' && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <BellRing className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs text-amber-950">Subscription Payment Due Alert</h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Your payment of ₹{profile.paymentAmount || ((profile.maxAccounts || 1) * 249)} is due. Please pay to keep your stores active.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Android Exact Alarm Permission Alert */}
            {isMobileApp && !canScheduleExactAlarms && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-amber-950">Enable Background Return Refresh</h4>
                    <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                      Android requires "Alarms & Reminders" permission to update Meesho OTPs every 2 minutes in the background. Tap to allow.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRequestExactAlarmPermission}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer transition-all text-center"
                >
                  Enable Background Refresh
                </button>
              </div>
            )}

            {/* Desktop Overview Metric Cards (3 Cards) */}
            <div className="hidden md:grid md:grid-cols-3 gap-4">
              {/* Metric 1: Connected Stores */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Connected Stores</div>
                  <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                    {accounts.length} <span className="text-xs text-slate-400 font-normal font-sans">/ {profile.maxAccounts ?? 0} slots</span>
                  </div>
                  {accounts.length > (profile.maxAccounts ?? 0) ? (
                    <div className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-500" /> Quota exceeded ({accounts.length - (profile.maxAccounts ?? 0)} extra)
                    </div>
                  ) : (profile.maxAccounts ?? 0) === 0 ? (
                    <div className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-500" /> 0 slots allowed
                    </div>
                  ) : accounts.length === (profile.maxAccounts ?? 0) ? (
                    <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> All slots configured
                    </div>
                  ) : (
                    <div className="text-[11px] text-sky-600 font-medium mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {(profile.maxAccounts ?? 0) - accounts.length} slots available
                    </div>
                  )}
                </div>
                <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200/70 text-orange-600 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
              </div>

              {/* Metric 2: Live Return OTPs */}
              {(() => {
                const totalLiveOtps = accounts.reduce((sum, acc) => {
                  const active = (Array.isArray(acc.otpList) && acc.otpList.length > 0)
                    ? acc.otpList.length
                    : (acc.currentOtp && acc.currentOtp !== '----' ? 1 : 0);
                  return sum + active;
                }, 0);
                return (
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Live Return OTPs</div>
                      <div className="text-2xl font-black text-orange-600 mt-1 font-mono">
                        {totalLiveOtps}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-1">
                        Ready for courier handover
                      </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200/70 text-sky-600 flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                  </div>
                );
              })()}

              {/* Metric 3: Cloud Sync Engine */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Delivery Sync Engine</div>
                  <div className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    24/7 Cloud Sync Active
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    Secured via device vault
                  </div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Account Quota & Controls Bar */}
            <div id="otp-stores-section" className="bg-white border border-slate-200/90 rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-xs scroll-mt-20">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base md:text-lg font-black text-slate-900">Connected Stores</h2>
                <span className="bg-sky-50 border border-sky-200 text-sky-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {accounts.length} / {profile.maxAccounts ?? 0} Slots Used
                </span>
                {accounts.length >= (profile.maxAccounts ?? 0) && (
                  <span className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">
                    Limit Reached
                  </span>
                )}
              </div>

              {/* Action Button: Visible on Android App; on Web browser guides to Mobile App */}
              <div className="flex items-center gap-2.5">
                {!isNativeMobile() ? (
                  <a
                    href={`https://meesho-otp-app.web.app/ordermunim_v${CURRENT_APP_VERSION_NAME}.apk`}
                    download={`ordermunim_v${CURRENT_APP_VERSION_NAME}.apk`}
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all cursor-pointer group"
                    title={`Download OrderMunim Android App (v${CURRENT_APP_VERSION_NAME})`}
                  >
                    <DownloadCloud className="w-4 h-4 text-white group-hover:translate-y-0.5 transition-transform" />
                    <span>Download Android App (v{CURRENT_APP_VERSION_NAME})</span>
                  </a>
                ) : accounts.length < (profile.maxAccounts ?? 0) && profile.status !== 'on_hold' ? (
                  <button
                    onClick={handleOpenAddModal}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Store
                  </button>
                ) : (
                  <span className="text-xs text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                    {profile.status === 'on_hold' ? 'Account On Hold' : 'Store Limit Reached'}
                  </span>
                )}
              </div>
            </div>

            {/* List of Store OTP Cards */}
            {accounts.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 text-center shadow-xs">
                <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-black text-slate-800">No Meesho Accounts Linked Yet</h3>
                {!isNativeMobile() ? (
                  <div className="mt-4 p-5 bg-sky-50 border border-sky-200/80 rounded-2xl max-w-md mx-auto text-center space-y-2.5 shadow-xs">
                    <div className="w-10 h-10 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center mx-auto text-sky-600">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">Connect Store from Mobile App</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Meesho accounts must be connected inside the <strong>OrderMunim Android App</strong> on your phone to store credentials safely on your device and enable 24/7 background OTP sync.
                    </p>
                    <p className="text-[11px] text-sky-700 font-semibold">Once added on your phone, live delivery OTPs will sync to this screen automatically!</p>
                    <div className="pt-1">
                      <a
                        href={`https://meesho-otp-app.web.app/ordermunim_v${CURRENT_APP_VERSION_NAME}.apk`}
                        download={`ordermunim_v${CURRENT_APP_VERSION_NAME}.apk`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                      >
                        <DownloadCloud className="w-4 h-4" />
                        Download Android App (v{CURRENT_APP_VERSION_NAME})
                      </a>
                    </div>
                  </div>
                ) : accounts.length < (profile.maxAccounts ?? 0) && profile.status !== 'on_hold' ? (
                  <button
                    onClick={handleOpenAddModal}
                    className="mt-4 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    + Add Your First Store
                  </button>
                ) : (
                  <p className="text-xs text-slate-500 mt-2">Contact admin to add store slots.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Quota Exceeded Alert Banner */}
                {accounts.length > (profile.maxAccounts ?? 0) && (
                  <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 border border-rose-500/20">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-rose-950 flex items-center gap-2">
                          Store Quota Exceeded ({accounts.length} / {profile.maxAccounts ?? 0} Allowed)
                        </h4>
                        <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                          Your account slot limit is currently <strong>{profile.maxAccounts ?? 0} store(s)</strong>, but you have <strong>{accounts.length}</strong> store(s) connected. You must remove the extra store(s) to comply with your plan.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
                  {accounts.map((acc, index) => {
                    const isOverQuota = index >= (profile.maxAccounts ?? 0);
                    const isLive = acc.status === 'live';
                    const isOnHold = profile.status === 'on_hold';
                    const isExpanded = Boolean(expandedStoreIds[acc.id]);
                    const localSess = localSessions[acc.syncKey] || localSessions[acc.id] || (acc.identifier ? localSessions[acc.identifier] : null) || (acc.email ? localSessions[acc.email.trim().toLowerCase()] : null) || Object.values(localSessions).find(s => (s.email && acc.email && s.email.toLowerCase() === acc.email.toLowerCase()) || (s.identifier && acc.identifier && s.identifier === acc.identifier));
                    const vaultCred = findCredentialsForAccount(acc, user?.uid);
                    const isSessionExpired = false;
                    const isAutoSync = true;
                    const activeOtps = (Array.isArray(acc.otpList) && acc.otpList.length > 0)
                      ? acc.otpList
                      : (acc.currentOtp && acc.currentOtp !== '----'
                          ? [{ courier: acc.courier || 'Courier', otp: acc.currentOtp, handoverCount: acc.handoverCount || 0, dateTime: acc.dateTime }]
                          : []);

                    return (
                      <div 
                        key={acc.id} 
                        className={`bg-white border relative ${
                          isOnHold || isOverQuota
                            ? 'border-rose-300 bg-rose-50/20 shadow-xs' 
                            : isExpanded 
                            ? 'border-[#083B82]/30 shadow-md ring-1 ring-[#083B82]/10' 
                            : 'border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300'
                        } rounded-2xl p-4.5 transition-all duration-200`}
                      >
                        {/* Over Quota Badge & Direct Delete Button */}
                        {isOverQuota && (
                          <div className="mb-3 px-3 py-2 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-900 text-xs font-bold flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-rose-800">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Over Quota (Limit: {profile.maxAccounts ?? 0})
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAccount(acc.id, acc.storeName);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors shadow-xs cursor-pointer"
                            >
                              Delete Store
                            </button>
                          </div>
                        )}
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
                                ? 'bg-orange-50 text-orange-600 border border-orange-200' 
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              <Package className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-bold text-base text-slate-900 truncate hover:text-[#083B82] transition-colors">
                                    {acc.storeName}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePromptRenameStore(acc);
                                    }}
                                    className="p-1 text-slate-400 hover:text-[#083B82] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                                    title="Rename Account Holder / Store Name"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {activeOtps.length > 0 ? (
                                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                    {activeOtps.length} {activeOtps.length === 1 ? 'OTP' : 'OTPs'}
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200">
                                    No Return
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions & Chevron */}
                          <div className="flex items-center gap-1 shrink-0">
                            {(!isAutoSync || refreshingId === acc.syncKey || refreshingId === acc.id) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleManualRefresh(acc.syncKey || acc.id, acc.storeName);
                                }}
                                disabled={refreshingId === acc.syncKey || refreshingId === acc.id}
                                className="p-1.5 text-slate-400 hover:text-[#083B82] hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                title="Check live returns now"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${(refreshingId === acc.syncKey || refreshingId === acc.id) ? 'animate-spin text-[#083B82]' : ''}`} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAccount(acc.id, acc.storeName);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove store"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="p-1 text-slate-400">
                              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-[#083B82]' : ''}`} />
                            </div>
                          </div>
                        </div>

                        {/* Expanded Section: Single Row OTPs */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                            {activeOtps.length > 0 ? (
                              activeOtps.map((item, idx) => (
                                <div 
                                  key={idx} 
                                  className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100/60 transition-colors"
                                >
                                  {/* 1. Courier Name */}
                                  <div className="flex items-center gap-1.5 min-w-[90px] shrink-0">
                                    <Truck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                    <span className="font-bold text-xs text-[#083B82] truncate max-w-[120px]">
                                      {item.courier || 'Courier'}
                                    </span>
                                  </div>

                                  {/* 2. Parcel Count */}
                                  <div className="flex items-center gap-1 text-[11px] text-slate-600 shrink-0">
                                    <Package className="w-3 h-3 text-slate-400" />
                                    <span>{item.handoverCount || 0} {item.handoverCount === 1 ? 'Parcel' : 'Parcels'}</span>
                                  </div>

                                  {/* 3. OTP Code */}
                                  <div className="font-mono font-black text-base md:text-lg text-orange-600 tracking-wider shrink-0 px-2.5 py-0.5 bg-orange-100/90 rounded-lg border border-orange-300/80 shadow-xs">
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
                                      className="p-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white shadow-xs transition-all shrink-0 cursor-pointer"
                                      title="Copy OTP"
                                    >
                                      {copiedId === `${acc.id}-${idx}` ? (
                                        <Check className="w-4 h-4 text-white" />
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
                              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-500">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  No active return courier right now
                                </span>
                                <span className="font-mono text-slate-400 font-bold">----</span>
                              </div>
                            )}

                            {/* Footer Details */}
                            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                              <span>Checked: {liveCheckedTimes[acc.syncKey] || liveCheckedTimes[acc.id] || acc.dateTime || 'Just now'}</span>
                              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Auto-Sync Active
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* On Hold Overlay Badge */}
                      {isOnHold && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] rounded-2xl text-center select-none">
                          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 mb-2 shadow-lg">
                            <PauseCircle className="w-6 h-6 animate-pulse" />
                          </div>
                          <span className="text-sm font-bold text-white tracking-wider uppercase">
                            Account On Hold
                          </span>
                          <span className="text-xs text-rose-200 mt-0.5">
                            OTP service paused
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            )}

          </>
        ) : activeTab === 'pdf-tools' ? (
          /* ================= PDF TOOLS SUITE (FULL PAGE WORKSPACE) ================= */
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
              <p className="text-sm font-semibold">Loading PDF Tools Suite...</p>
            </div>
          }>
            <PdfToolsSuite onNavigateTab={setActiveTab} />
          </Suspense>
        ) : (
          /* ================= HOME DASHBOARD VIEW (ORDERMUNIM HUB) ================= */
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* 1. Hero / Welcome Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#083B82] via-[#0A4EA3] to-[#032352] rounded-3xl p-6 md:p-8 text-white shadow-xl">
              <div className="relative z-10 max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-orange-300">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  Smart E-Commerce Order &amp; Dispatch Operating Hub
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
                  Welcome to <span className="text-orange-400">OrderMunim</span>
                </h1>
                <p className="text-sm md:text-base text-slate-200 leading-relaxed">
                  Your all-in-one automation platform for multi-marketplace thermal label cropping, SKU sorting, real-time return OTP tracking, and dispatch video recording.
                </p>
                <div className="pt-2 flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveTab('otp')}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/30 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Package className="w-4 h-4" />
                    <span>Open Live OTP Hub</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cropper')}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>Process Shipping Labels</span>
                  </button>
                </div>
              </div>

              {/* Decorative Subtle Background Graphics */}
              <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
              <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center opacity-15 pointer-events-none">
                <img src="/ordermunim_logo.png" alt="" className="w-56 h-56 object-contain" />
              </div>
            </div>

            {/* 2. Core Modules / Features Grid (4 Main Tools) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Core Services &amp; Tools</h2>
                  <p className="text-xs text-slate-500">Access each specialized OrderMunim module below</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Module 1: Live Return OTP Hub */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:border-orange-300 transition-all flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200/70 text-orange-600 flex items-center justify-center shadow-xs">
                        <Package className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 uppercase tracking-wider">
                        {accounts.length} Store{accounts.length === 1 ? '' : 's'} Linked
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                        Live Return OTP Hub
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        Automated 24/7 capture of Meesho courier return delivery OTPs across all your linked seller stores without manually checking each phone or login portal.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 24/7 Cloud Sync
                      </span>
                      <span>•</span>
                      <span>Courier Handover Tags</span>
                    </div>
                  </div>
                  <div className="pt-5 border-t border-slate-100 mt-5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('otp')}
                      className="w-full py-2.5 px-4 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>Access OTP Feature</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Module 2: E-Commerce Label Cropper */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:border-sky-300 transition-all flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200/70 text-[#083B82] flex items-center justify-center shadow-xs">
                        <Scissors className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 uppercase tracking-wider">
                        5 Marketplaces
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#083B82] transition-colors">
                        E-Commerce Label Cropper &amp; Sorter
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        High-speed 4x6 thermal cropping, invoice merging, and SKU-based automatic parcel sorting for Meesho, Flipkart, Amazon, Ajio, and Myntra orders.
                      </p>
                    </div>
                    {/* Marketplace chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {['Meesho', 'Flipkart', 'Amazon', 'Ajio', 'Myntra', 'Snapdeal'].map(p => (
                        <span key={p} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-5 border-t border-slate-100 mt-5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('cropper')}
                      className="w-full py-2.5 px-4 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#083B82] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>Open Label Cropper</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Module 3: Packaging & Dispatch Webcam Recorder */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shadow-xs">
                        <Video className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                        Anti-Fraud Protection
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        Packaging &amp; Dispatch Video Recorder
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        Record packing and handover videos synced with shipping barcode scans to provide undeniable proof against false customer claims and damaged returns.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 font-medium">
                      <span>Barcode Scan Sync</span>
                      <span>•</span>
                      <span>Full HD Video Storage</span>
                    </div>
                  </div>
                  <div className="pt-5 border-t border-slate-100 mt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCropperMarketplace('webcam');
                        try { localStorage.setItem('om_selected_marketplace', 'webcam'); } catch {}
                        setActiveTab('cropper');
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>Launch Webcam Recorder</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Module 4: PDF & Document Power Tools */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:border-blue-400 transition-all flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/70 text-blue-600 flex items-center justify-center shadow-xs">
                        <FileText className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                        10 Pro Tools
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        PDF &amp; Label Power Tools
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        Client-side PDF merge, page delete &amp; reorder, thermal label rotation, scan file compression, and instant image-to-PDF converters.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 font-medium">
                      <span className="text-emerald-600 font-semibold">100% Client-Side Privacy</span>
                      <span>•</span>
                      <span>Zero Uploads</span>
                    </div>
                  </div>
                  <div className="pt-5 border-t border-slate-100 mt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('pdf-tools');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-[#083B82] text-[#083B82] hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span>Open PDF Tools Suite (10)</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* ================= WEBSITE FOOTER (IMAGE 2 STRUCTURED, ORDERMUNIM THEMED) ================= */}
      <footer className="mt-auto bg-[#061C3D] text-slate-300 border-t border-slate-800/80 pt-12 pb-24 md:pb-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10 pb-10 border-b border-white/10">
            {/* Col 1: Brand Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm">
                  <img src="/ordermunim_logo.png" alt="OrderMunim" className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="text-lg font-black text-white tracking-tight">OrderMunim</span>
                  <p className="text-[10px] text-slate-400 font-medium">Smart Order &amp; OTP Hub</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                All-in-one automation platform for Indian e-commerce merchants across Meesho, Flipkart, Amazon, Ajio &amp; Myntra. Fast 4x6 thermal cropping, 24/7 delivery OTP monitoring, and dispatch proof recordings.
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {/* Instagram */}
                <a
                  href="https://www.instagram.com/ordermunim/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#E1306C] hover:text-white flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
                  title="Follow us on Instagram"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                {/* Facebook */}
                <a
                  href="https://www.facebook.com/profile.php?id=61595207849148"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#1877F2] hover:text-white flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
                  title="Follow us on Facebook"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                {/* WhatsApp */}
                <a
                  href="https://wa.me/919484636090"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#25D366] hover:text-white flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
                  title="Chat on WhatsApp (+91 94846 36090)"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                </a>
                {/* Email */}
                <a
                  href="mailto:ordermunim@gmail.com"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-orange-500 hover:text-white flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
                  title="Email: ordermunim@gmail.com"
                >
                  <Mail className="w-4 h-4" />
                </a>
                {/* Phone */}
                <a
                  href="tel:+919484636090"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-orange-500 hover:text-white flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
                  title="Call Support: +91 94846 36090"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                Quick Links
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                  >
                    Home Dashboard
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('cropper'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                  >
                    E Commerce Tools
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('otp'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                  >
                    Live OTP Hub
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveCropperMarketplace('webcam'); setActiveTab('cropper'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                  >
                    Webcam Recorder
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setShowPdfComingSoonModal(true)}
                    className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                  >
                    PDF Manifest Tools
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setShowAboutModal(true)}
                    className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                  >
                    About Us
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setShowContactModal(true)}
                    className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                  >
                    Contact Support
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Services & Marketplaces */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                Services &amp; Marketplaces
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveCropperMarketplace('meesho'); setActiveTab('cropper'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                  >
                    Meesho 4x6 Label Cropper
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveCropperMarketplace('amazon'); setActiveTab('cropper'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                  >
                    Amazon Easy Ship Filter
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveCropperMarketplace('flipcart'); setActiveTab('cropper'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                  >
                    Flipkart Thermal Cropper
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveCropperMarketplace('ajio'); setActiveTab('cropper'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                  >
                    Ajio Label &amp; Invoice Merger
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveCropperMarketplace('myntra'); setActiveTab('cropper'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                  >
                    Myntra Direct Downloader
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveCropperMarketplace('snapdeal'); setActiveTab('cropper'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                  >
                    Snapdeal Label Cropper
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('otp'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                  >
                    24/7 Delivery OTP Sync
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Business Hours & Contact */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                Working Hours &amp; Contact
              </h4>
              <div className="space-y-3 text-xs text-slate-400">
                <div>
                  <span className="text-slate-500 block text-[11px]">Working Schedule:</span>
                  <span className="text-slate-200 font-semibold">Monday – Saturday</span>
                  <span className="text-orange-400 font-bold block mt-0.5">10:00 AM – 7:00 PM IST</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Mobile Support:</span>
                  <a href="tel:+919484636090" className="text-white hover:text-orange-400 font-bold text-sm tracking-wide transition-colors block">
                    +91 94846 36090
                  </a>
                  <a
                    href="https://wa.me/919484636090"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold transition-colors inline-flex items-center gap-1 mt-0.5"
                  >
                    <span>WhatsApp Available</span>
                  </a>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Email Support:</span>
                  <a href="mailto:ordermunim@gmail.com" className="text-slate-200 hover:text-orange-400 font-mono transition-colors block break-all">
                    ordermunim@gmail.com
                  </a>
                </div>
                <div className="pt-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    24/7 Cloud Background Monitoring
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Attribution */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p>© 2026 OrderMunim. All Rights Reserved. Engineered with precision for online merchants.</p>
            <div className="flex items-center gap-4 text-[11px]">
              <button
                type="button"
                onClick={() => setShowAboutModal(true)}
                className="hover:text-white transition-colors cursor-pointer"
              >
                About Platform
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </footer>


      {/* ================= ADD STORE MODAL (CREDENTIALS - MOBILE APP ONLY) ================= */}
      {showAddModal && isNativeMobile() && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-slate-900">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-sky-600" />
                {connectStep === 1 ? 'Add Meesho Store' : 'Install Chrome Extension'}
              </h3>
              <button type="button" onClick={handleCloseConnectModal}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner */}
            {modalError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs flex items-start justify-between gap-2.5 animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{modalError}</span>
                </div>
                <button type="button" onClick={() => setModalError('')} className="text-rose-600 hover:text-rose-800 p-0.5 rounded transition-colors cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ── STEP 1: Enter credentials ── */}
            {connectStep === 1 && (
              <form onSubmit={handleCreateAccount} className="space-y-4">

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Meesho Registered Email or Mobile
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="seller@example.com or 9876543210"
                    value={meeshoEmail}
                    onChange={(e) => { setMeeshoEmail(e.target.value); if (modalError) setModalError(''); }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-[#083B82] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Meesho Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={meeshoPass}
                    onChange={(e) => { setMeeshoPass(e.target.value); if (modalError) setModalError(''); }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-[#083B82] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Account Holder / Store Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kaanchan Export 1 (leave empty to auto-detect)"
                    value={newStoreName}
                    onChange={(e) => { setNewStoreName(e.target.value); if (modalError) setModalError(''); }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-[#083B82] focus:bg-white transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button type="button" onClick={handleCloseConnectModal}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={syncingAccount}
                    className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer">
                    {syncingAccount ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Verifying Store (~15s)...</span>
                      </span>
                    ) : (
                      'Connect Meesho Account'
                    )}
                  </button>
                </div>
                {syncingAccount && (
                  <p className="text-[11px] text-sky-700 text-center animate-pulse pt-1">
                    Verifying credentials and fetching return OTPs from Meesho. Please wait ~15 seconds...
                  </p>
                )}
              </form>
            )}


            {/* ── STEP 2: Extension instructions ── */}
            {connectStep === 2 && (
              <div className="space-y-4">
                {/* Sync key display */}
                <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">Your Sync Key</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl font-mono font-bold text-[#083B82] tracking-widest">{generatedSyncKey}</span>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(generatedSyncKey); showToast('Sync key copied!', 'success'); }}
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
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
                    <div key={step.n} className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center shrink-0">{step.n}</span>
                      <span className="text-xs text-slate-700 leading-relaxed">{step.text}</span>
                    </div>
                  ))}
                </div>

                {/* Download button */}
                <a
                  href="https://github.com/RRTraders/meesho-otp/raw/main/extension/meesho-otp-extension.zip"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Download Chrome Extension
                </a>

                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-2">Already installed the extension?</p>
                  <button
                    type="button"
                    onClick={handleCloseConnectModal}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-sky-600" />
                Connect Store on this Phone
              </h3>
              <button
                type="button"
                onClick={() => { setShowReconnectModal(false); setReconnectAccount(null); }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reconnectError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{reconnectError}</span>
              </div>
            )}

            <form onSubmit={handleReconnectSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Store Name
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={reconnectAccount.storeName || 'Meesho Store'}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold opacity-90"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Meesho Registered Email or Mobile
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={reconnectAccount.email || ''}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm opacity-90 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Enter Meesho Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={reconnectPass}
                  onChange={(e) => { setReconnectPass(e.target.value); setReconnectError(''); }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-[#083B82] focus:bg-white transition-colors"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Enter once to activate direct live OTP monitoring &amp; 24/7 background alerts on this phone.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowReconnectModal(false); setReconnectAccount(null); }}
                  className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reconnectLoading || !reconnectPass}
                  className="w-1/2 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-sm shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {reconnectLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
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

      {/* ================= VERTICAL PROFILE DRAWER (OPENS FROM RIGHT) ================= */}
      {isProfileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            onClick={() => setIsProfileDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Right-Side Drawer Panel */}
          <aside className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-in slide-in-from-right duration-300 overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#083B82] to-sky-600 flex items-center justify-center text-white text-base font-black shadow-xs">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm leading-tight">Seller Profile</h3>
                  <p className="text-[11px] text-slate-500">OrderMunim Account &amp; Settings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Close Profile"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-slate-900">
              {/* Profile Avatar & Info */}
              <div className="flex flex-col items-center text-center space-y-2.5 p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200/90 shadow-2xs">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#083B82] to-sky-600 flex items-center justify-center text-white text-2xl font-black shadow-md border-4 border-white uppercase">
                  {(profile?.name || user?.displayName || user?.email || 'U')[0]}
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">
                    {profile?.name || user?.displayName || 'Seller User'}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {user?.email || profile?.email || user?.phoneNumber || ''}
                  </p>
                  <div className="mt-2.5 flex items-center justify-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 uppercase tracking-wider">
                      {profile.maxAccounts !== undefined ? `${profile.maxAccounts} Store Slots` : '0 Store Slots'}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 uppercase tracking-wider">
                      {accounts.length} Linked Stores
                    </span>
                    {isSuperAdmin && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                        Super Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Connected Stores Quota Box */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-600" />
                  <span className="font-bold text-xs text-slate-900">Connected Stores</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-sky-50 border border-sky-200 text-sky-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {accounts.length} / {profile.maxAccounts ?? 0} Slots Used
                  </span>
                  {accounts.length > (profile.maxAccounts ?? 0) ? (
                    <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                      Quota Exceeded
                    </span>
                  ) : accounts.length >= (profile.maxAccounts ?? 0) && (
                    <span className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">
                      Limit
                    </span>
                  )}
                </div>
              </div>

              {/* Follow Us Store Profiles */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 text-xs space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-sky-600" />
                    <span className="font-bold text-xs text-slate-900">Follow Us Store Profiles</span>
                  </div>
                  <span className="bg-sky-50 border border-sky-200 text-sky-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {(profile?.followStores || []).length} / {getMaxFollowStoresAllowed(profile)}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {(profile?.followStores || []).map((store) => (
                    <div key={store.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-bold text-slate-900 text-xs truncate">{store.name}</div>
                        <div className="text-[10px] text-sky-700 font-mono truncate">{store.url}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteFollowStore(store.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove store profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {(profile?.followStores || []).length < getMaxFollowStoresAllowed(profile) ? (
                  <form onSubmit={handleAddFollowStore} className="pt-2 border-t border-slate-200/80 space-y-2">
                    <input
                      type="text"
                      value={newFollowStoreName}
                      onChange={(e) => setNewFollowStoreName(e.target.value)}
                      placeholder="Store Name (e.g. RR Traders)"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                    />
                    <input
                      type="url"
                      value={newFollowStoreUrl}
                      onChange={(e) => setNewFollowStoreUrl(e.target.value)}
                      placeholder="Profile URL"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="submit"
                      disabled={addingFollowStore}
                      className="w-full py-1.5 px-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{addingFollowStore ? 'Saving...' : 'Add Store Profile'}</span>
                    </button>
                  </form>
                ) : null}
              </div>

              {/* Account Details & Version */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Account Role</span>
                  <strong className="text-slate-900 capitalize">{profile?.role || 'Seller'}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Email Status</span>
                  <strong className="text-emerald-600 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </strong>
                </div>
                {isMobileApp ? (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>App Version</span>
                    <strong className="text-slate-900 font-mono font-bold">
                      {installedVersionName ? `v${installedVersionName}` : 'Checking...'}
                    </strong>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Web Portal</span>
                    <strong className="text-slate-900 font-mono font-bold">v{CURRENT_APP_VERSION_NAME} (Cloud)</strong>
                  </div>
                )}
              </div>

              {/* Broadcast for Admin */}
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDrawerOpen(false);
                    setShowBroadcastModal(true);
                  }}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5 text-sky-600" />
                  App Update Broadcast Console
                </button>
              )}

              {/* Battery optimization & permissions on Android */}
              {isMobileApp && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleFixBatteryOptimization}
                    className="py-2.5 px-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer text-center"
                  >
                    <RefreshCw className="w-3 h-3 text-sky-600" />
                    <span>Battery Saver</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenSystemAppSettings}
                    className="py-2.5 px-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer text-center"
                  >
                    <Settings className="w-3 h-3 text-slate-500" />
                    <span>App Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestExactAlarmPermission}
                    className={`col-span-2 py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center border ${
                      canScheduleExactAlarms
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{canScheduleExactAlarms ? '2-Minute Alarm: Enabled ✓' : '2-Minute Alarm: Tap to Allow'}</span>
                  </button>
                </div>
              )}

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={() => {
                  setIsProfileDrawerOpen(false);
                  handlePromptLogout();
                }}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-slate-600" />
                Sign Out
              </button>

              {!isSuperAdmin && (
                <div className="text-center pt-1 pb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDrawerOpen(false);
                      handlePromptDeleteAccount();
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:underline transition-colors lowercase font-medium cursor-pointer"
                  >
                    delete this account
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ================= PDF TOOLS (COMING SOON) MODAL ================= */}
      {showPdfComingSoonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 border border-orange-200 flex items-center justify-center mx-auto shadow-xs">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full tracking-wider">
                Feature In Development
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">PDF Tools Coming Soon!</h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">
                We are building powerful e-commerce PDF tools including bulk invoice mergers, multi-page label splitters, shipping manifest generators, and custom PDF watermark editors.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPdfComingSoonModal(false)}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 cursor-pointer transition-all"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ABOUT US MODAL ================= */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200 p-0.5">
                  <img src="/ordermunim_logo.png" alt="OrderMunim" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">About OrderMunim</h3>
                  <p className="text-[11px] text-slate-500">Smart E-Commerce Order &amp; OTP Hub</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 leading-relaxed space-y-3 max-h-80 overflow-y-auto pr-1">
              <p>
                <strong className="text-slate-900">OrderMunim</strong> is an all-in-one automation platform built specifically for Indian e-commerce sellers across Meesho, Flipkart, Amazon, Ajio, and Myntra.
              </p>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-800">What we do:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li><strong>Instant Return Handover OTPs:</strong> Never miss courier delivery returns with 24/7 background OTP monitoring.</li>
                  <li><strong>Thermal Label Cropper:</strong> Automatically crop, SKU-sort, and print 4x6 labels without tax invoice clutter.</li>
                  <li><strong>Webcam Unboxing Studio:</strong> Live video recording with real-time Indian timestamp proof for marketplace damage/wrong return claims.</li>
                  <li><strong>Multi-Account Vault:</strong> High-security credential storage kept directly on your phone.</li>
                </ul>
              </div>
              <p className="text-[11px] text-slate-500">
                Created with ❤️ by RR Traders to empower modern marketplace merchants.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAboutModal(false)}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ================= CONTACT US MODAL ================= */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">Contact Us</h3>
                  <p className="text-[11px] text-slate-500">OrderMunim Support Team</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Phone className="w-4 h-4 text-orange-600" />
                  <span>Mobile &amp; WhatsApp Support</span>
                </div>
                <div className="flex items-center justify-between pl-6 gap-2 flex-wrap">
                  <a href="tel:+919484636090" className="font-bold text-slate-900 hover:text-orange-600 text-sm tracking-wide">
                    +91 94846 36090
                  </a>
                  <a
                    href="https://wa.me/919484636090"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] transition-colors"
                  >
                    <span>Chat on WhatsApp</span>
                  </a>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Mail className="w-4 h-4 text-orange-600" />
                  <span>Email Support</span>
                </div>
                <div className="pl-6">
                  <a href="mailto:ordermunim@gmail.com" className="font-mono text-sky-700 hover:underline select-all">
                    ordermunim@gmail.com
                  </a>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span>Working Hours</span>
                </div>
                <div className="text-slate-600 pl-6">Monday to Saturday: 10:00 AM – 7:00 PM IST</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-slate-800 font-bold">Official Social Channels</div>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href="https://www.instagram.com/ordermunim/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-bold text-[11px] shadow-xs hover:opacity-90 transition-opacity"
                  >
                    Instagram (@ordermunim)
                  </a>
                  <a
                    href="https://www.facebook.com/profile.php?id=61595207849148"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#1877F2] text-white font-bold text-[11px] shadow-xs hover:opacity-90 transition-opacity"
                  >
                    Facebook
                  </a>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                For store quota upgrades, API integrations, or onboarding queries, feel free to contact our team directly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 cursor-pointer transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
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

      {/* ================= BOTTOM NAVIGATION BAR (3 TABS - MOBILE ONLY) ================= */}
      {!isProfileDrawerOpen && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-200/90 px-4 py-2 shadow-lg backdrop-blur-md">
          <div className="max-w-md mx-auto flex items-center justify-around">
            {/* Tab 1: OTP */}
            <button
              type="button"
              onClick={() => setActiveTab('otp')}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
                activeTab === 'otp'
                  ? 'text-orange-600 font-black'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${
                activeTab === 'otp'
                  ? 'bg-orange-50 text-orange-600 border border-orange-200'
                  : 'text-slate-400'
              }`}>
                <Package className="w-5 h-5" />
              </div>
              <span className="text-[11px] tracking-tight">OTP</span>
            </button>

            {/* Tab 2: Label Cropper */}
            <button
              type="button"
              onClick={() => setActiveTab('cropper')}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
                activeTab === 'cropper'
                  ? 'text-orange-600 font-black'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${
                activeTab === 'cropper'
                  ? 'bg-orange-50 text-orange-600 border border-orange-200'
                  : 'text-slate-400'
              }`}>
                <Scissors className="w-5 h-5" />
              </div>
              <span className="text-[11px] tracking-tight">Label Cropper</span>
            </button>

            {/* Tab 3: Profile */}
            <button
              type="button"
              onClick={() => setIsProfileDrawerOpen(true)}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
                isProfileDrawerOpen
                  ? 'text-[#083B82] font-black'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${
                isProfileDrawerOpen
                  ? 'bg-sky-50 text-sky-600 border border-sky-200'
                  : 'text-slate-400'
              }`}>
                <User className="w-5 h-5" />
              </div>
              <span className="text-[11px] tracking-tight">Profile</span>
            </button>
          </div>
        </nav>
      )}

      {/* ================= MOBILE APP FLOATING ACTION BUTTON (FAB) ================= */}
      {/* ================= MOBILE APP FLOATING ACTION BUTTON (FAB) ================= */}
      {/* Positioned at right bottom above navigation bar, visible strictly on Android native app */}
      {!isProfileDrawerOpen && isNativeMobile() && (activeTab === 'otp' || activeTab === 'dashboard') && (
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
          className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 active:scale-90 text-white shadow-2xl shadow-orange-500/40 flex items-center justify-center border-2 border-white/20 transition-transform duration-200 md:hidden cursor-pointer"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      )}

      {/* ================= DIRECT WHATSAPP SUPPORT FLOATING ACTION BUTTON (FAB) ================= */}
      {!isProfileDrawerOpen && (
        <a
          href="https://wa.me/919484636090?text=Hello%20OrderMunim%20Support%2C%20I%20need%20help"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Direct WhatsApp Message Support (+91 94846 36090)"
          title="Direct WhatsApp Message Support"
          className={`fixed z-40 group flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-2xl shadow-emerald-600/40 hover:shadow-emerald-600/60 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer border-2 border-white/50 ${
            isNativeMobile() && (activeTab === 'otp' || activeTab === 'dashboard')
              ? 'bottom-36 right-5 md:bottom-6 md:right-6'
              : 'bottom-20 right-4 md:bottom-6 md:right-6'
          }`}
        >
          {/* Subtle pulsing background effect */}
          <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 group-hover:opacity-50 animate-ping -z-10 pointer-events-none" />

          {/* Desktop Tooltip */}
          <span className="hidden md:group-hover:flex absolute right-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-semibold rounded-xl shadow-xl border border-slate-700 whitespace-nowrap items-center gap-1.5 pointer-events-none animate-in fade-in duration-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>WhatsApp Support</span>
          </span>

          {/* WhatsApp Icon */}
          <svg className="w-8 h-8 fill-current drop-shadow-xs" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
        </a>
      )}

      {/* ================= FANCY CONFIRMATION DIALOG ================= */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              confirmDialog.icon === 'logout'
                ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400'
                : confirmDialog.icon === 'exit'
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
            }`}>
              {confirmDialog.icon === 'logout' || confirmDialog.icon === 'exit' ? <LogOut className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">{confirmDialog.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
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
                className={`flex-1 py-2.5 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer ${
                  confirmDialog.icon === 'logout'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/25'
                    : confirmDialog.icon === 'exit'
                    ? 'bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 shadow-amber-500/25'
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
      {!updateStatus.isForce && updateStatus.shouldPrompt && !updateDismissed && (
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
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                        broadcastActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setBroadcastVersionName(val);
                      const clean = val.trim().replace(/^v/i, '');
                      if (clean && /^[0-9.]+$/.test(clean)) {
                        setBroadcastUrl(prev =>
                          /ordermunim_v[0-9.]+\.apk/i.test(prev)
                            ? prev.replace(/ordermunim_v[0-9.]+\.apk/i, `ordermunim_v${clean}.apk`)
                            : `https://raw.githubusercontent.com/RRTraders/ordermunim_live/main/ordermunim_v${clean}.apk`
                        );
                        setBroadcastTitle(prev =>
                          /\(v[0-9.]+\)/i.test(prev)
                            ? prev.replace(/\(v[0-9.]+\)/i, `(v${clean})`)
                            : prev
                        );
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. 5.3"
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
                  placeholder="https://raw.githubusercontent.com/RRTraders/ordermunim_live/main/ordermunim_v4.5.apk"
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
