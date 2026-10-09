(() => {
  'use strict';

  const marker = 'mgfv1:';
  const databaseName = 'math-gap-local-vault';
  const keyName = 'device-encryption-key';
  const localStore = window.localStorage;
  const original = {
    get: Storage.prototype.getItem,
    set: Storage.prototype.setItem,
    remove: Storage.prototype.removeItem,
    clear: Storage.prototype.clear,
    key: Storage.prototype.key,
  };
  const values = new Map();
  const versions = new Map();
  const pending = new Map();
  const status = { encrypted: false, warning: '', ready: false };
  let cryptoKey = null;
  let database = null;
  let valuesLoaded = false;
  const isAppKey = (key) => String(key).startsWith('mgf-');

  function encodeBytes(bytes) {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
    }
    return btoa(binary);
  }

  function decodeBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('keys');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local encryption storage.'));
      request.onblocked = () => reject(new Error('Local encryption storage is busy in another tab.'));
    });
  }

  async function getOrCreateKey(db, encryptedValuesExist) {
    const candidate = encryptedValuesExist ? null : await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('keys', 'readwrite');
      const store = transaction.objectStore('keys');
      const request = store.get(keyName);
      let selected = null, failure = null;
      request.onsuccess = () => {
        if (request.result) selected = request.result;
        else if (candidate) { selected = candidate; store.put(candidate, keyName); }
        else { failure = new Error('The local encryption key is missing.'); transaction.abort(); }
      };
      request.onerror = () => { failure = request.error || new Error('Could not read the local encryption key.'); transaction.abort(); };
      transaction.oncomplete = () => resolve(selected);
      transaction.onerror = transaction.onabort = () => reject(failure || transaction.error || new Error('Could not access the local encryption key.'));
    });
  }

  async function encryptValue(value) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, new TextEncoder().encode(value));
    return marker + encodeBytes(iv) + ':' + encodeBytes(new Uint8Array(ciphertext));
  }

  async function decryptValue(value) {
    const parts = value.slice(marker.length).split(':');
    if (parts.length !== 2) throw new Error('A local encrypted value is damaged.');
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBytes(parts[0]) }, cryptoKey, decodeBytes(parts[1]));
    return new TextDecoder().decode(plaintext);
  }

  function setNative(key, value) {
    original.set.call(localStore, key, value);
  }

  function persistEncrypted(key, value) {
    const version = (versions.get(key) || 0) + 1;
    versions.set(key, version);
    const task = encryptValue(value).then((encoded) => {
      if (versions.get(key) === version) setNative(key, encoded);
    }).catch(() => {
      status.warning = 'Some recent changes could not be encrypted to this browser. Keep a backup and check your storage space.';
      window.dispatchEvent(new CustomEvent('mathgap:storage-warning', { detail: { message: status.warning } }));
    }).finally(() => {
      if (pending.get(key) === task) pending.delete(key);
    });
    pending.set(key, task);
  }

  function collectNativeEntries() {
    const entries = [];
    for (let index = 0; index < localStore.length; index++) {
      const key = original.key.call(localStore, index);
      if (key !== null && isAppKey(key)) entries.push([key, original.get.call(localStore, key)]);
    }
    return entries;
  }

  function installStorageAdapter() {
    Storage.prototype.getItem = function(key) {
      if (this !== localStore || !isAppKey(key)) return original.get.call(this, key);
      const name = String(key);
      return values.has(name) ? values.get(name) : null;
    };
    Storage.prototype.setItem = function(key, value) {
      if (this !== localStore || !isAppKey(key)) return original.set.call(this, key, value);
      const name = String(key), text = String(value);
      values.set(name, text);
      persistEncrypted(name, text);
    };
    Storage.prototype.removeItem = function(key) {
      if (this !== localStore || !isAppKey(key)) return original.remove.call(this, key);
      const name = String(key);
      values.delete(name);
      versions.set(name, (versions.get(name) || 0) + 1);
      original.remove.call(localStore, name);
    };
    Storage.prototype.clear = function() {
      if (this !== localStore) return original.clear.call(this);
      values.clear();
      for (const [key] of collectNativeEntries()) versions.set(key, (versions.get(key) || 0) + 1);
      original.clear.call(localStore);
    };
  }

  async function initialize() {
    if (!window.isSecureContext || !window.crypto?.subtle || !window.indexedDB) {
      status.warning = 'This browser cannot encrypt local app storage. Use a private browser profile and an encrypted backup.';
      status.ready = true;
      return status;
    }
    const entries = collectNativeEntries();
    const encryptedValuesExist = entries.some(([, value]) => typeof value === 'string' && value.startsWith(marker));
    try {
      database = await openDatabase();
      cryptoKey = await getOrCreateKey(database, encryptedValuesExist);
      database.close();
      database = null;
    } catch (error) {
      database?.close();
      database = null;
      if (encryptedValuesExist) throw error;
      status.warning = 'This browser could not open local encryption storage, so it is using ordinary browser storage. Make an encrypted backup and avoid a shared browser profile.';
      status.ready = true;
      return status;
    }
    const legacy = [];
    for (const [key, rawValue] of entries) {
      if (typeof rawValue === 'string' && rawValue.startsWith(marker)) {
        values.set(key, await decryptValue(rawValue));
      } else {
        values.set(key, rawValue);
        legacy.push([key, rawValue]);
      }
    }
    valuesLoaded = true;
    try {
      for (const [key, value] of legacy) {
        setNative(key, await encryptValue(value));
      }
    } catch {
      status.warning = 'This browser could not encrypt every existing value; some local values may still be readable in browser storage. Make an encrypted backup and avoid a shared browser profile.';
      installStorageAdapter();
      status.ready = true;
      return status;
    }
    status.encrypted = true;
    installStorageAdapter();
    status.ready = true;
    return status;
  }

  const ready = initialize().catch((error) => {
    status.warning = 'Math Gap Finder could not unlock encrypted data in this browser. Restore a backup or reset this local cache to try account sync.';
    status.error = error;
    throw error;
  });

  window.addEventListener('storage', (event) => {
    if (event.storageArea !== localStore) return;
    if (!event.key) { values.clear(); return; }
    if (!isAppKey(event.key)) return;
    if (event.newValue === null) { values.delete(event.key); return; }
    if (!status.encrypted) { values.set(event.key, event.newValue); return; }
    decryptValue(event.newValue).then((value) => values.set(event.key, value)).catch(() => {
      status.warning = 'Another tab changed encrypted local data that this tab could not open. Reload before continuing.';
    });
  });

  async function flush() {
    await Promise.all([...pending.values()]);
    return status.warning;
  }

  function snapshot() {
    const blocked = (key) => key.startsWith('mgf-sync-') || key.startsWith('mgf-sync:') || key === 'mgf-anonymous-visitor' || key === 'mgf-summary-email' || key.startsWith('mgf-photo-usage-');
    const source = valuesLoaded ? values : new Map(collectNativeEntries());
    return Object.fromEntries([...source.entries()].filter(([key]) => key.startsWith('mgf-') && !blocked(key)));
  }

  function resetAndReload() {
    database?.close();
    database = null;
    try { for (const [key] of collectNativeEntries()) original.remove.call(localStore, key); } catch {}
    return new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    }).then(() => location.reload());
  }

  window.MathGapLocalVault = { ready, status, flush, snapshot, resetAndReload };
})();
