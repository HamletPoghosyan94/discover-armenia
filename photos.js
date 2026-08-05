/* ────────────────────────────────────────────────────────────────────────────
 * photos.js — per-destination user photos, stored in IndexedDB.
 *
 * Photos are far too large for localStorage (~5 MB cap), so they live in
 * IndexedDB (hundreds of MB) keyed by destination id. Each record is an array of
 * downscaled JPEG data-URLs. This is the only place that touches photo storage,
 * so it can be swapped for a backend/object-store later without changing the UI.
 *
 * Public API (window.PhotoStore), all async:
 *   available()        → boolean, is IndexedDB usable
 *   get(id)            → Promise<string[]>  (data-URLs; [] if none)
 *   add(id, urls)      → Promise<string[]>  appends, resolves to the new full list
 *   remove(id, index)  → Promise<string[]>  removes one, resolves to the new list
 *   count(id)          → Promise<number>
 * ──────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var DB_NAME = 'discover-armenia', STORE = 'photos', VERSION = 1;
  var dbPromise = null;

  function hasIDB() { try { return !!global.indexedDB; } catch (e) { return false; } }

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = global.indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function get(id) {
    if (!hasIDB()) return Promise.resolve([]);
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, 'readonly');
        var r = t.objectStore(STORE).get(id);
        r.onsuccess = function () { resolve(Array.isArray(r.result) ? r.result : []); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }

  function put(id, value) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, 'readwrite');
        t.objectStore(STORE).put(value, id);
        t.oncomplete = function () { resolve(value); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  var API = {
    available: hasIDB,
    get: get,
    add: function (id, urls) {
      urls = (urls || []).filter(Boolean);
      if (!urls.length) return get(id);
      return get(id).then(function (cur) { return put(id, cur.concat(urls)); });
    },
    remove: function (id, index) {
      return get(id).then(function (cur) {
        if (index >= 0 && index < cur.length) cur.splice(index, 1);
        return put(id, cur);
      });
    },
    count: function (id) { return get(id).then(function (a) { return a.length; }); }
  };

  global.PhotoStore = API;
})(window);
