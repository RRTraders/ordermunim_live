import CryptoJS from 'crypto-js';

// Device-bound salt
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
 * Encrypt sensitive plain text using AES-256 with device-bound key
 */
export const encryptSecret = (plainText) => {
  if (!plainText) return '';
  try {
    const key = getVaultKey();
    return CryptoJS.AES.encrypt(String(plainText), key).toString();
  } catch (e) {
    console.error('[Vault] Encryption error:', e);
    return '';
  }
};

/**
 * Decrypt AES-256 cipher text using device-bound key
 */
export const decryptSecret = (cipherText) => {
  if (!cipherText) return '';
  try {
    const key = getVaultKey();
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error('[Vault] Decryption error:', e);
    return '';
  }
};

/**
 * Store encrypted Meesho credentials into local database (localStorage)
 */
export const saveEncryptedStoreCredentials = (storeKey, creds, userId = '') => {
  if (!storeKey || !creds) return;
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    const vault = raw ? JSON.parse(raw) : {};

    const encData = {
      userId: userId || creds.userId || '',
      email: creds.email ? encryptSecret(creds.email.trim()) : '',
      password: creds.password ? encryptSecret(creds.password) : '',
      identifier: creds.identifier ? encryptSecret(creds.identifier) : '',
      supplierId: creds.supplierId || 0,
      storeName: creds.storeName || '',
      updatedAt: new Date().toISOString()
    };

    vault[storeKey] = encData;
    if (creds.identifier) vault[creds.identifier] = encData;
    if (creds.supplierId) vault[`sup_${creds.supplierId}`] = encData;
    if (creds.email) vault[creds.email.trim().toLowerCase()] = encData;

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
  const candidates = [
    acc.syncKey,
    acc.id,
    acc.identifier,
    acc.supplierId ? `sup_${acc.supplierId}` : null,
    acc.email ? acc.email.trim().toLowerCase() : null
  ].filter(Boolean);

  for (const k of candidates) {
    const cred = getDecryptedStoreCredentials(k);
    if (cred && cred.password) {
      // Ensure credentials belong strictly to this user
      if (targetUserId && cred.userId && cred.userId !== targetUserId) {
        continue;
      }
      return cred;
    }
  }
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
