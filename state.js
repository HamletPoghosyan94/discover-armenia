/* ────────────────────────────────────────────────────────────────────────────
 * state.js — per-user check-in state for Discover Armenia
 *
 * Auth is not built yet, so state is persisted in localStorage for a single
 * logged-in user. This module is the ONLY place that touches persistence, so it
 * can later be swapped for a backend (fetch/websocket) without changing any UI
 * code — keep the public API (window.UserState) stable.
 *
 * State shape (keyed by destination id from destinations.js):
 *   { [id]: { visited: bool, wishlist: bool, date?: string, note?: string, photos?: string[] } }
 *
 * Public API (window.UserState):
 *   getState()                       → the whole map (do not mutate)
 *   getEntry(id)                     → normalized entry for one destination
 *   isVisited(id) / isWishlist(id)   → booleans
 *   statusOf(id)                     → 'visited' | 'wishlist' | 'unvisited'
 *   toggleVisited(id, details?)      → new visited bool (visiting clears wishlist)
 *   toggleWishlist(id)              → new wishlist bool (no-op if visited)
 *   setDetails(id, {date,note,photos}) → merges detail fields
 *   onChange(fn)                     → subscribe; returns an unsubscribe fn
 *
 * Also dispatches a window CustomEvent('userstate:change', {detail:{id, entry}}).
 * ──────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'discover-armenia:user-state:v1';
  var listeners = new Set();
  var state = load();

  function load() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
      console.warn('[state] could not load, starting fresh:', e && e.message);
      return {};
    }
  }

  function save() {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      // e.g. QuotaExceededError when a large photo is attached
      console.warn('[state] could not save:', e && e.message);
      return false;
    }
  }

  function normalize(raw) {
    raw = raw || {};
    return {
      visited: !!raw.visited,
      wishlist: !!raw.wishlist,
      date: raw.date || null,
      note: raw.note || '',
      photos: Array.isArray(raw.photos) ? raw.photos : []
    };
  }

  function emit(id) {
    var entry = getEntry(id);
    listeners.forEach(function (fn) {
      try { fn({ id: id, entry: entry }); } catch (e) { console.error(e); }
    });
    try {
      global.dispatchEvent(new CustomEvent('userstate:change', { detail: { id: id, entry: entry } }));
    } catch (e) { /* CustomEvent unsupported — onChange still works */ }
  }

  function getEntry(id) { return normalize(state[id]); }

  var API = {
    getState: function () { return state; },
    getEntry: getEntry,

    isVisited: function (id) { return !!(state[id] && state[id].visited); },
    isWishlist: function (id) { return !!(state[id] && state[id].wishlist); },

    statusOf: function (id) {
      var e = state[id];
      if (e && e.visited) return 'visited';
      if (e && e.wishlist) return 'wishlist';
      return 'unvisited';
    },

    // Toggle visited. Marking visited clears wishlist (you've been there).
    // Optional `details` ({date, note, photos}) is merged when marking visited.
    toggleVisited: function (id, details) {
      var e = normalize(state[id]);
      e.visited = !e.visited;
      if (e.visited) {
        e.wishlist = false;
        if (details) {
          if (details.date != null) e.date = details.date;
          if (details.note != null) e.note = details.note;
          if (Array.isArray(details.photos)) e.photos = details.photos;
        }
      }
      state[id] = e;
      save();
      emit(id);
      return e.visited;
    },

    // Toggle wishlist. Ignored if already visited (visited takes precedence).
    toggleWishlist: function (id) {
      var e = normalize(state[id]);
      if (e.visited) return false;
      e.wishlist = !e.wishlist;
      state[id] = e;
      save();
      emit(id);
      return e.wishlist;
    },

    // Merge detail fields (date/note/photos) onto an existing entry.
    setDetails: function (id, details) {
      var e = normalize(state[id]);
      if (!details) return e;
      if (details.date !== undefined) e.date = details.date;
      if (details.note !== undefined) e.note = details.note;
      if (details.photos !== undefined) e.photos = Array.isArray(details.photos) ? details.photos : [];
      state[id] = e;
      var ok = save();
      emit(id);
      return { entry: e, saved: ok };
    },

    // Subscribe to any change. Returns an unsubscribe function.
    onChange: function (fn) {
      listeners.add(fn);
      return function () { listeners.delete(fn); };
    }
  };

  global.UserState = API;
})(window);
