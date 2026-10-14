import CryptoJS from 'crypto-js';

// Permanent master encryption key for reliable offline device encryption
const MASTER_VAULT_KEY = 'ORDERMUNIM_LOCAL_DB_SECURE_MEESHO_VAULT_PERMANENT_KEY_v2';
const VAULT_SALT = 'ORDERMUNIM_LOCAL_DB_SECURE_MEESHO_VAULT_v1';
const VAULT_STORAGE_KEY = 'om_encrypted_credentials_vault';

const getVaultKey = () => {
  let devId = 'generic_device';
  try {
    devId = localStorage.getItem('om_unique_device_id') || 'om_dev_default';
  } catch {}
  return `${VAULT_SALT}__${devId}`;
};

/**
 * Encrypt sensitive plain text using AES-256 with permanent stable key
 */
export const encryptSecret = (plainText) => {
  if (!plainText) return '';
  try {
    return CryptoJS.AES.encrypt(String(plainText), MASTER_VAULT_KEY).toString();
  } catch (e) {
    console.error('[Vault] Encryption error:', e);
    return String(plainText);
  }
};

/**
 * Decrypt AES-256 cipher text trying current and all legacy keys so credentials never get lost
 */
export const decryptSecret = (cipherText) => {
  if (!cipherText) return '';
  const text = String(cipherText);
  
  // List of keys to try (new permanent key first, followed by legacy device-bound variations)
  let devId = 'generic_device';
  try { devId = localStorage.getItem('om_unique_device_id') || 'om_dev_default'; } catch {}
  const keysToTry = [
    MASTER_VAULT_KEY,
    `${VAULT_SALT}__${devId}`,
    `${VAULT_SALT}__om_dev_default`,
    `${VAULT_SALT}__generic_device`,
    VAULT_SALT
  ];

  for (const k of keysToTry) {
    try {
      const bytes = CryptoJS.AES.decrypt(text, k);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (decrypted && decrypted.length > 0) {
        return decrypted;
      }
    } catch {}
  }

  // If text is not AES encrypted (raw password), return as-is
  if (!text.startsWith('U2F') && !text.includes(' ') && text.length < 80) {
    return text;
  }
  return '';
};

/**
 * Store encrypted Meesho credentials into local database (localStorage)
 */
export const saveEncryptedStoreCredentials = (storeKey, creds, userId = '') => {
  if (!storeKey || !creds) return;
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    const vault = raw ? JSON.parse(raw) : {};

    // If incoming password is empty, preserve existing password from vault
    let encPassword = creds.password ? encryptSecret(creds.password) : '';
    if (!encPassword) {
      const existingEnc = vault[storeKey]?.password || (creds.identifier ? vault[creds.identifier]?.password : null) || (creds.email ? vault[creds.email.trim().toLowerCase()]?.password : null);
      if (existingEnc) encPassword = existingEnc;
    }

    const encData = {
      userId: userId || creds.userId || vault[storeKey]?.userId || '',
      email: creds.email ? encryptSecret(creds.email.trim()) : (vault[storeKey]?.email || ''),
      password: encPassword,
      identifier: creds.identifier ? encryptSecret(creds.identifier) : (vault[storeKey]?.identifier || ''),
      supplierId: creds.supplierId || vault[storeKey]?.supplierId || 0,
      storeName: creds.storeName || vault[storeKey]?.storeName || '',
      updatedAt: new Date().toISOString()
    };

    vault[storeKey] = encData;
    if (creds.identifier) vault[creds.identifier] = encData;
    if (creds.supplierId) vault[`sup_${creds.supplierId}`] = encData;
    if (creds.email) vault[creds.email.trim().toLowerCase()] = encData;
    if (creds.storeName) vault[`store_${creds.storeName.trim().toLowerCase()}`] = encData;

    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
    return true;
  } catch (e) {
    console.error('[Vault] saveEncryptedStoreCredentials error:', e);
    return false;
  }
};

/**
 * Retrieve and decrypt stored credentials by storeKey
 */
export const getDecryptedStoreCredentials = (storeKey) => {
  if (!storeKey) return null;
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return null;
    const vault = JSON.parse(raw);
    const encData = vault[storeKey];
    if (!encData) return null;

    return {
      userId: encData.userId || '',
      email: encData.email ? decryptSecret(encData.email) : '',
      password: encData.password ? decryptSecret(encData.password) : '',
      identifier: encData.identifier ? decryptSecret(encData.identifier) : '',
      supplierId: encData.supplierId || 0,
      storeName: encData.storeName || '',
      updatedAt: encData.updatedAt
    };
  } catch (e) {
    console.error('[Vault] getDecryptedStoreCredentials error:', e);
    return null;
  }
};

/**
 * Find credentials by searching all possible identifiers of an account, isolated by user
 */
export const findCredentialsForAccount = (acc, expectedUserId = '') => {
  if (!acc) return null;
  const targetUserId = expectedUserId || acc.userId || '';

  // Direct Firestore Encrypted Credentials Recovery (Master Spec Feature 5)
  // If Firestore document holds encryptedPassword, decrypt it in memory immediately!
  if (acc.encryptedPassword) {
    try {
      const decPass = decryptSecret(acc.encryptedPassword);
      if (decPass) {
        const decEmail = acc.encryptedEmail ? decryptSecret(acc.encryptedEmail) : (acc.email || '');
        return {
          userId: targetUserId,
          email: decEmail,
          password: decPass,
          identifier: acc.identifier || '',
          supplierId: acc.supplierId || 0,
          storeName: acc.storeName || ''
        };
      }
    } catch (e) {}
  }

  const candidates = [
    acc.syncKey,
    acc.id,
    acc.identifier,
    acc.supplierId ? `sup_${acc.supplierId}` : null,
    acc.email ? acc.email.trim().toLowerCase() : null,
    acc.storeName ? `store_${acc.storeName.trim().toLowerCase()}` : null
  ].filter(Boolean);

  let fallbackCred = null;
  for (const k of candidates) {
    const cred = getDecryptedStoreCredentials(k);
    if (cred && cred.password) {
      if (targetUserId && cred.userId && cred.userId !== targetUserId) {
        if (!fallbackCred) fallbackCred = cred;
        continue;
      }
      return cred;
    }
  }

  // Deep fallback: Scan entire vault dictionary
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (raw) {
      const vault = JSON.parse(raw);
      for (const [vKey, vVal] of Object.entries(vault)) {
        if (vVal && vVal.password) {
          const decPass = decryptSecret(vVal.password);
          if (decPass) {
            const decEmail = vVal.email ? decryptSecret(vVal.email) : '';
            const decIdent = vVal.identifier ? decryptSecret(vVal.identifier) : '';
            const matchEmail = acc.email && decEmail && acc.email.trim().toLowerCase() === decEmail.trim().toLowerCase();
            const matchIdent = acc.identifier && decIdent && acc.identifier === decIdent;
            const matchSup = acc.supplierId && vVal.supplierId && String(acc.supplierId) === String(vVal.supplierId);
            const matchStore = acc.storeName && vVal.storeName && acc.storeName.trim().toLowerCase() === vVal.storeName.trim().toLowerCase();
            if (matchEmail || matchIdent || matchSup || matchStore) {
              return {
                userId: targetUserId || vVal.userId,
                email: decEmail || acc.email || '',
                password: decPass,
                identifier: decIdent || acc.identifier || '',
                supplierId: vVal.supplierId || acc.supplierId || 0,
                storeName: vVal.storeName || acc.storeName || ''
              };
            }
          }
        }
      }
    }
  } catch (e) {}

  if (fallbackCred) return fallbackCred;

  // Resilient Fallback: Check native_meesho_sessions stored locally on device
  try {
    const rawSessions = localStorage.getItem('native_meesho_sessions');
    if (rawSessions) {
      const parsed = JSON.parse(rawSessions);
      for (const k of candidates) {
        if (parsed[k] && parsed[k].password) {
          return {
            userId: targetUserId,
            email: parsed[k].email || acc.email || '',
            password: parsed[k].password,
            identifier: parsed[k].identifier || acc.identifier || '',
            supplierId: parsed[k].supplierId || acc.supplierId || 0,
            storeName: parsed[k].storeName || acc.storeName || ''
          };
        }
      }
      for (const [sKey, sVal] of Object.entries(parsed)) {
        if (sVal && sVal.password) {
          const matchEmail = acc.email && sVal.email && acc.email.trim().toLowerCase() === sVal.email.trim().toLowerCase();
          const matchSup = acc.supplierId && sVal.supplierId && String(acc.supplierId) === String(sVal.supplierId);
          const matchIdent = acc.identifier && sVal.identifier && acc.identifier === sVal.identifier;
          const matchStore = acc.storeName && sVal.storeName && acc.storeName.trim().toLowerCase() === sVal.storeName.trim().toLowerCase();
          if (matchEmail || matchSup || matchIdent || matchStore) {
            return {
              userId: targetUserId,
              email: sVal.email || acc.email || '',
              password: sVal.password,
              identifier: sVal.identifier || acc.identifier || '',
              supplierId: sVal.supplierId || acc.supplierId || 0,
              storeName: sVal.storeName || acc.storeName || ''
            };
          }
        }
      }
    }
  } catch (e) {}

  return null;
};

/**
 * Remove credentials for a specific store
 */
export const removeEncryptedStoreCredentials = (storeKey) => {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return;
    const vault = JSON.parse(raw);
    delete vault[storeKey];
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
  } catch (e) {}
};

/**
 * Clear all stored encrypted credentials (on logout or device eviction)
 */
export const clearVault = () => {
  try {
    localStorage.removeItem(VAULT_STORAGE_KEY);
  } catch (e) {}
};
