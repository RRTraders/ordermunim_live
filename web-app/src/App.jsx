import React, { useState, useEffect } from 'react';
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
  Printer
} from 'lucide-react';
import LabelCropper from './LabelCropper';

const SUPER_ADMIN_EMAIL = "rrtradersofficials@gmail.com";
const ADMIN_PASS = "admin249"; // Default secret password for Admin panel


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

  // User Profile & Account Data
  const [profile, setProfile] = useState({
    maxAccounts: 1,
    mobile: '',
    status: 'active'
  });
  const [accounts, setAccounts] = useState([]);
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

  // Admin Panel State
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminInputPass, setAdminInputPass] = useState('');
  const [allUsersList, setAllUsersList] = useState([]);

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
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4000';
    }
    // Always prioritize local residential IP tunnel (Cloudflare) because Meesho blocks Render cloud IPs
    if (serverConfig?.tunnelUrl && serverConfig.tunnelUrl.includes('trycloudflare.com')) {
      return serverConfig.tunnelUrl;
    }
    if (serverConfig?.apiUrl && !serverConfig.apiUrl.includes('onrender.com')) {
      return serverConfig.apiUrl;
    }
    return serverConfig?.tunnelUrl || serverConfig?.apiUrl || 'https://meesho-otp-backend.onrender.com';
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

  // Listen to Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const isSuper = (currentUser.email && currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || currentUser.uid === 'vJID6QrALTf4ybiDP5TuLvNkyN63';
        if (!isSuper && currentUser.email && !currentUser.emailVerified) {
          setEmailNeedsVerification(true);
        } else {
          setEmailNeedsVerification(false);
          await loadUserProfile(currentUser.uid, currentUser.phoneNumber, currentUser.email);
        }
      } else {
        setEmailNeedsVerification(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load user profile & realtime accounts listener
  const loadUserProfile = async (uid, userPhone, userEmail) => {
    const isSuper = (userEmail && userEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || uid === 'vJID6QrALTf4ybiDP5TuLvNkyN63';
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    let prof = {};
    if (!snap.exists()) {
      prof = {
        mobile: userPhone || '',
        email: userEmail || '',
        maxAccounts: isSuper ? 999 : 1, // Super admin has 999 slots
        role: isSuper ? 'super_admin' : 'seller',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      await setDoc(userRef, prof);
    } else {
      prof = snap.data();
      if (isSuper && prof.role !== 'super_admin') {
        prof.role = 'super_admin';
        prof.maxAccounts = 999;
        await updateDoc(userRef, { role: 'super_admin', maxAccounts: 999 });
      }
    }
    setProfile(prof);

    if (isSuper || prof.role === 'super_admin') {
      setAdminAuthenticated(true);
      setActiveTab('admin');
    }

    // Subscribe to accounts:
    // If super admin, load ALL accounts across the platform!
    // If regular seller, load only this user's accounts!
    const q = (isSuper || prof.role === 'super_admin')
      ? collection(db, 'accounts')
      : query(collection(db, 'accounts'), where('userId', '==', uid));

    const unsubAcc = onSnapshot(q, (snapshot) => {
      const accList = [];
      snapshot.forEach((d) => {
        accList.push({ id: d.id, ...d.data() });
      });
      setAccounts(accList);
    });

    // Also load all users in real-time for Admin view
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const uList = [];
      snapshot.forEach((d) => {
        uList.push({ id: d.id, ...d.data() });
      });
      setAllUsersList(uList);
    });

    return () => {
      unsubAcc();
      unsubUsers();
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

  // Play audio chime when OTP changes
  useEffect(() => {
    if (soundEnabled && accounts.length > 0) {
      // Audio chime
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
    }
  }, [accounts.map(a => a.currentOtp).join(',')]);

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
      await confirmationResult.confirm(verificationCode);
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
      
      if (!isSuper && !currentUser.emailVerified) {
        setEmailNeedsVerification(true);
        setUser(currentUser);
        // Automatically trigger a fresh verification email link
        await sendEmailVerification(currentUser).catch(() => {});
        return;
      }

      setEmailNeedsVerification(false);
      setUser(currentUser);
      await loadUserProfile(currentUser.uid, currentUser.phoneNumber, currentUser.email);
    } catch (err) {
      console.error("Customer login error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError('Invalid email or password. If you do not have an account, click "Create Account" below.');
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
        maxAccounts: 2, // 2 stores quota by default
        status: 'active',
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

  // Check if User clicked verification link in their email
  const handleCheckVerified = async () => {
    if (!auth.currentUser) return;
    setAuthLoading(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
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
    await signOut(auth);
    setUser(null);
    setEmailNeedsVerification(false);
    setProfile({ maxAccounts: 1, mobile: '', status: 'active' });
    setAccounts([]);
    setAdminAuthenticated(false);
    setActiveTab('dashboard');
  };

  // Manual Trigger to refresh store OTP from Meesho
  const handleManualRefresh = async (syncKey, storeName) => {
    setRefreshingId(syncKey);
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/meesho/refresh/${syncKey}`, { method: 'POST' });
      const data = await res.json();
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

  // Add a new Meesho Account slot — calls local/Indian-IP backend
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setModalError('');

    if (accounts.length >= profile.maxAccounts) {
      setModalError(`Plan Limit Reached! Your plan allows ${profile.maxAccounts} store(s). Contact admin to add slots.`);
      return;
    }

    const cleanEmail = meeshoEmail.trim().toLowerCase();
    if (cleanEmail) {
      const existing = accounts.find(a =>
        a.email && a.email.trim().toLowerCase() === cleanEmail
      );
      if (existing) {
        setModalError(`Account already added! "${existing.storeName || meeshoEmail}" is already connected.`);
        return;
      }
    }

    const randomId = Math.floor(1000 + Math.random() * 9000);
    const syncKey = `MSH-${randomId}`;
    const autoStoreName = newStoreName.trim() || (meeshoEmail ? meeshoEmail.split('@')[0] : 'My Meesho Store');

    setSyncingAccount(true);
    try {
      // 1. Call backend login first — NEVER store dummy placeholders in Firestore!
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/meesho/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          syncKey,
          storeName: newStoreName.trim(),
          email: meeshoEmail.trim(),
          password: meeshoPass
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setModalError(data.error || 'Meesho login failed. Please check your credentials.');
        return;
      }

      // Check for duplicate store
      const duplicateStore = accounts.find(a =>
        a.id !== syncKey && (
          (a.identifier && data.identifier && a.identifier === data.identifier) ||
          (a.email && cleanEmail && a.email.trim().toLowerCase() === cleanEmail)
        )
      );
      if (duplicateStore) {
        setModalError(`Store "${data.storeName}" is already linked!`);
        return;
      }

      // 2. Only store in Firestore when login is 100% SUCCESSFUL with verified store name & OTP!
      const finalStoreName = data.storeName || newStoreName.trim() || autoStoreName;
      const newAccRef = doc(db, 'accounts', syncKey);
      await setDoc(newAccRef, {
        userId: user.uid,
        storeName: finalStoreName,
        identifier: data.identifier || '',
        email: cleanEmail || '',
        syncKey,
        currentOtp: data.otp || '----',
        courier: data.courier || 'No Return',
        handoverCount: data.handoverCount || 0,
        dateTime: data.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'live',
        lastUpdated: new Date().toISOString()
      });

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
    setConnectStep(1);
    setGeneratedSyncKey('');
    setModalError('');
    setMeeshoEmail('');
    setMeeshoPass('');
    setNewStoreName('');
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
          showToast('Store removed successfully', 'success');
        } catch (err) {
          showToast(`Error removing store: ${err.message}`, 'error');
        }
      }
    });
  };

  // Copy to clipboard with toast
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Admin: load all users
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (adminInputPass === ADMIN_PASS || adminInputPass === '@rrt123') {
      setAdminAuthenticated(true);
      showToast('Admin Console Unlocked', 'success');
      const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const uList = [];
        snapshot.forEach((d) => {
          uList.push({ id: d.id, ...d.data() });
        });
        setAllUsersList(uList);
      });
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
          const userStores = accounts.filter(a => a.userId === targetUid);
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
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
                return (
                  <div key={acc.id} className={`bg-slate-900/90 border-2 ${isOnHold ? 'border-rose-500/40 bg-slate-950/80 shadow-rose-950/20' : 'border-slate-700/80'} rounded-2xl p-5 shadow-xl relative overflow-hidden`}>
                    <div className={`transition-all duration-300 ${isOnHold ? 'filter blur-md opacity-30 select-none pointer-events-none' : ''}`}>
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-3">
                        <span className="text-base font-bold text-white flex items-center gap-2">
                          📦 {acc.storeName}
                        </span>
                        <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
                          {acc.courier || 'Courier'}
                        </span>
                      </div>

                      <div className="bg-slate-950 rounded-xl p-4 flex items-center justify-between border border-slate-800 my-3">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">RETURN HANDOVER OTP</span>
                          <span className="text-4xl md:text-5xl font-black text-amber-400 tracking-wider font-mono">
                            {acc.currentOtp || '----'}
                          </span>
                        </div>
                        {acc.currentOtp && acc.currentOtp !== '----' && (
                          <button 
                            onClick={() => handleCopy(acc.currentOtp, acc.id)}
                            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-4 py-2 rounded-xl flex items-center gap-1.5 font-bold text-sm"
                          >
                            {copiedId === acc.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            {copiedId === acc.id ? 'Copied' : 'Copy'}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mt-2">
                        <div className="bg-slate-800/40 p-2.5 rounded-lg">
                          <span className="text-slate-500 block">Total Handover Count</span>
                          <span className="text-slate-200 font-bold text-sm">
                            {acc.handoverCount || 0} {acc.handoverCount === 1 ? 'Parcel' : 'Parcels'}
                          </span>
                        </div>
                        <div className="bg-slate-800/40 p-2.5 rounded-lg">
                          <span className="text-slate-500 block">Time</span>
                          <span className="text-slate-200 font-bold text-sm">
                            {acc.dateTime || 'Just now'}
                          </span>
                        </div>
                      </div>
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
            <div className="w-14 h-14 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-3">
              <Package className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Meesho OTP Hub</h1>
            <p className="text-xs text-slate-400 mt-1">Multi-Account Return Handover OTP Management</p>
          </div>

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl text-xs flex items-center gap-2 mb-5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Top Toggle between Customer and Super Admin */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl mb-5 border border-slate-800">
            <button
              type="button"
              onClick={() => { setAuthTab('customer'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                authTab === 'customer' 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Customer
            </button>
            <button
              type="button"
              onClick={() => { setAuthTab('admin'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                authTab === 'admin' 
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              Super Admin
            </button>
          </div>

          {authTab === 'admin' ? (
            /* ================= SUPER ADMIN LOGIN FORM ================= */
            <form onSubmit={handleAdminEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Super Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="rrtradersofficials@gmail.com"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-amber-500 transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Super Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-amber-500 transition-colors text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                <Crown className="w-4 h-4" />
                {authLoading ? 'Verifying Admin Access...' : 'Login as Super Admin'}
              </button>
            </form>
          ) : (
            /* ================= CUSTOMER AUTHENTICATION (SIGN IN / SIGN UP) ================= */
            <div>
              {/* Customer Mode Tabs (Sign In vs Create Account) */}
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
                    Create Account (Sign Up)
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
                        Create an Account
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
          )}

        </div>
      </div>
    );
  }

  // ===================== LOGGED IN SELLER DASHBOARD =====================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${
              isSuperAdmin ? 'bg-gradient-to-tr from-amber-500 to-amber-600 shadow-amber-500/20' : 'bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-cyan-500/20'
            }`}>
              {isSuperAdmin ? <Crown className="w-5 h-5 text-slate-950" /> : <Package className="w-5 h-5 text-white" />}
            </div>
            <div>
              <span className="font-bold text-sm md:text-base text-white flex items-center gap-2 leading-tight">
                Meesho OTP Hub
                {isSuperAdmin && (
                  <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-500/30 flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5" /> SUPER ADMIN
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                {isSuperAdmin ? (
                  <span className="text-amber-300 font-medium">👑 {user?.email || SUPER_ADMIN_EMAIL}</span>
                ) : (
                  <span>📱 {user?.phoneNumber || profile.mobile || 'Customer'}</span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isSuperAdmin && (
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Mute OTP Audio" : "Enable OTP Audio"}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </button>
            )}

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Feature Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl max-w-lg mx-auto shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab !== 'cropper'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-4 h-4" />
            {isSuperAdmin ? 'Admin Console' : 'Return OTP Hub'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cropper')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'cropper'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Scissors className="w-4 h-4 text-cyan-300" />
            Label Cropper (4x6 & A4)
            <span className="bg-amber-400/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold border border-amber-400/30">
              FREE
            </span>
          </button>
        </div>

        {activeTab === 'cropper' ? (
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
                  <span>Total Stores: <strong className="text-cyan-400">{accounts.length}</strong></span>
                  <span>•</span>
                  <span>Monthly Revenue: <strong className="text-amber-400 font-mono">₹{(accounts.length * 249).toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
                {allUsersList.filter(u => u.role !== 'super_admin').length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No client sellers registered yet.
                  </div>
                ) : (
                  allUsersList.filter(u => u.role !== 'super_admin').map((u) => {
                    const userStores = accounts.filter(a => a.userId === u.id);
                    const quota = u.maxAccounts || 1;
                    const canAddMore = userStores.length < quota;

                    return (
                      <div key={u.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
                        {/* Top: Client Info & Actions */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-base">
                                📱 {u.mobile || u.email || 'Client User'}
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
                            <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                              UID: {u.id}
                            </span>
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

                            {/* Copy Warehouse Staff Link */}
                            <button
                              onClick={() => {
                                const staffUrl = `${window.location.origin}?staff=${u.id}`;
                                handleCopy(staffUrl, `staff_${u.id}`);
                              }}
                              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
                              title="Copy warehouse staff link for this client"
                            >
                              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                              {copiedId === `staff_${u.id}` ? 'Staff Link Copied!' : 'Copy Staff Link'}
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
                              onClick={() => handleUpdateUserQuota(u.id, Math.max(1, quota - 1))}
                              disabled={quota <= 1}
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

            {/* Account Quota & Controls Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base md:text-lg font-bold text-white">Connected Stores</h2>
                  <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {accounts.length} / {profile.maxAccounts || 1} Slots Used
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <button
                  onClick={() => {
                    const staffUrl = `${window.location.origin}?staff=${user.uid}`;
                    handleCopy(staffUrl, 'staff_url');
                  }}
                  className="flex-1 md:flex-initial px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  title="Copy link for warehouse staff"
                >
                  <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                  {copiedId === 'staff_url' ? 'Link Copied!' : 'Staff View Link'}
                </button>

                {accounts.length < (profile.maxAccounts || 1) && profile.status !== 'on_hold' ? (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex-1 md:flex-initial px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    + Add Store
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-xl">
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
                {accounts.length < (profile.maxAccounts || 1) && profile.status !== 'on_hold' ? (
                  <button
                    onClick={() => setShowAddModal(true)}
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

                  return (
                    <div 
                      key={acc.id} 
                      className={`bg-slate-900 border ${isOnHold ? 'border-rose-500/40 bg-slate-950/80 shadow-rose-950/20' : 'border-slate-800 hover:border-slate-700/80'} rounded-2xl p-5 shadow-xl transition-all relative overflow-hidden flex flex-col justify-between`}
                    >
                      {/* Inner Card Content (Blurred when on hold) */}
                      <div className={`flex flex-col justify-between h-full transition-all duration-300 ${isOnHold ? 'filter blur-md opacity-25 select-none pointer-events-none' : ''}`}>
                        {/* Top Bar of Card */}
                        <div>
                          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                            <div>
                              <span className="font-bold text-base text-white block">
                                {acc.storeName}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                Sync Key: {acc.syncKey}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
                                {acc.courier || 'No Return'}
                              </span>
                              <button
                                onClick={() => handleManualRefresh(acc.syncKey, acc.storeName)}
                                disabled={refreshingId === acc.syncKey}
                                className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-50"
                                title="Check for live OTP now"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === acc.syncKey ? 'animate-spin text-cyan-400' : ''}`} />
                              </button>
                              <button
                                onClick={() => handleDeleteAccount(acc.id, acc.storeName)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                                title="Remove store"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Big OTP Display */}
                          <div className="bg-slate-950 rounded-2xl p-4 my-2 border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                Return Handover OTP
                              </span>
                              <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-3xl md:text-4xl font-black font-mono text-amber-400 tracking-wider">
                                  {acc.currentOtp || '----'}
                                </span>
                              </div>
                            </div>

                            {acc.currentOtp && acc.currentOtp !== '----' && (
                              <button
                                onClick={() => handleCopy(acc.currentOtp, acc.id)}
                                className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                              >
                                {copiedId === acc.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedId === acc.id ? 'Copied' : 'Copy'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Card Details Footer */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                          <div className="bg-slate-950/60 p-2 rounded-xl">
                            <span className="text-slate-500 text-[10px] block">Total Handover</span>
                            <span className="font-bold text-slate-200">
                              {acc.handoverCount || 0} {acc.handoverCount === 1 ? 'Parcel' : 'Parcels'}
                            </span>
                          </div>
                          <div className="bg-slate-950/60 p-2 rounded-xl">
                            <span className="text-slate-500 text-[10px] block">Time</span>
                            <span className="font-bold text-slate-200">
                              {acc.dateTime || 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Sync Status Banner */}
                        <div className="mt-2 text-[10px] flex items-center justify-between text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                            {isLive ? 'Active Auto-Sync' : 'Connecting'}
                          </span>
                          <span className="font-mono text-slate-500">Key: {acc.syncKey}</span>
                        </div>
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
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Logging in & Fetching OTP...</>
                    ) : (
                      'Connect Meesho Account'
                    )}
                  </button>
                </div>
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

      {/* ================= FANCY CONFIRMATION DIALOG ================= */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <Trash2 className="w-6 h-6" />
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
                className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/25 transition-all"
              >
                {confirmDialog.confirmText || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
