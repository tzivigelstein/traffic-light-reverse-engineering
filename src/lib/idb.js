/** Tiny key-value store on IndexedDB (works in workers too). Values are structured-cloned. */

const DB_NAME = "cruce", STORE = "kv";

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("no IndexedDB")); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request(mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode), req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  }));
}

export const idbGet = (key) => request("readonly", (s) => s.get(key)).catch(() => undefined);
export const idbSet = (key, value) => request("readwrite", (s) => s.put(value, key)).catch(() => undefined);
export const idbDelete = (key) => request("readwrite", (s) => s.delete(key)).catch(() => undefined);
