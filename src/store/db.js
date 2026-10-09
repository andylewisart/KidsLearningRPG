// A tiny promise wrapper around IndexedDB: one key-value store. IndexedDB
// (not localStorage) because this site's localStorage is small and shared
// with any other game on andylewisart.github.io.

const DB_NAME = "crystal-titans";
const STORE = "kv";

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("database blocked"));
  });
  return dbPromise;
}

function run(mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req?.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export const dbGet = (key) => run("readonly", (s) => s.get(key));
export const dbSet = (key, value) => run("readwrite", (s) => s.put(value, key));
export const dbDelete = (key) => run("readwrite", (s) => s.delete(key));

/** Ask the browser not to evict our data (best effort; not all browsers honor it). */
export async function askPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* not supported: fine */
  }
}
