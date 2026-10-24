import { nextTick, watch } from "vue";

// Form drafts survive page refreshes, hard reloads, and navigation, so a failed
// wallet signature or transaction never means re-typing the form.
// Storage is localStorage keyed per form; nothing sensitive is ever written to
// these forms (keys, tokens, or private data live only in the wallet).
const PREFIX = "daoresolve:draft:";

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

// Prefer real localStorage; fall back to sessionStorage; fall back to an
// in-memory map (private mode, blocked storage, or constrained test runtimes).
// A constrained runtime keeps the app working in memory; browsers get the
// real persistent store.
function pickStorage() {
  const probe = "daoresolve:probe";
  if (typeof window !== "undefined") {
    for (const candidate of ["localStorage", "sessionStorage"]) {
      try {
        const storage = window[candidate];
        if (storage) {
          storage.setItem(probe, "1");
          storage.removeItem(probe);
          return storage;
        }
      } catch {
        // Not available in this environment; try the next candidate.
      }
    }
  }
  const memory = new Map();
  return {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => {
      memory.set(key, String(value));
    },
    removeItem: (key) => {
      memory.delete(key);
    },
  };
}

const storage = pickStorage();

function readDraft(key) {
  try {
    const raw = storage.getItem(PREFIX + String(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveDraft(key, value) {
  try {
    storage.setItem(PREFIX + String(key), JSON.stringify(value));
  } catch {
    // Storage full or unavailable: forms keep working in memory.
  }
}

function removeDraftLater(key) {
  nextTick(() => {
    try {
      storage.removeItem(PREFIX + String(key));
    } catch {
      // Nothing to clear.
    }
  });
}

/** Read the stored draft through the same storage path; for tests and debugging. */
export function peekDraft(key) {
  try {
    return storage.getItem(PREFIX + String(key));
  } catch {
    return null;
  }
}

function resolveDefaults(defaults) {
  // Defaults may be given directly or as a factory, so dynamic values
  // (e.g. a fresh "now" timestamp) are recomputed at reset time.
  return typeof defaults === "function" ? defaults() : defaults;
}

/**
 * keepForm: keep one reactive form object across reloads.
 * - Restores saved values into the form immediately.
 * - Saves on every change (deep watch).
 * - Returns { restored, reset, keep }:
 *     reset(next) - write defaults into the fields, persist that
 *     state, then remove the draft after the watcher flush (deterministic
 *     order, so a later change is still saved).
 *     keep() - remove the draft only; the current field values stay shown.
 */
export function bindFormDraft(key, form, defaults) {
  const draft = readDraft(key);
  function applyDraft() {
    if (!draft) return false;
    for (const [field, value] of Object.entries(draft)) {
      if (Object.prototype.hasOwnProperty.call(form, field)) form[field] = value;
    }
    return true;
  }
  const restored = applyDraft();
  watch(
    form,
    () => {
      saveDraft(key, plain(form));
    },
    { deep: true }
  );
  return {
    restored,
    reset(next = {}) {
      const base = resolveDefaults(defaults);
      for (const field of Object.keys(form)) {
        const value = field in next ? next[field] : base[field];
        if (value !== undefined) form[field] = value;
      }
      saveDraft(key, plain(form)); // snapshot the reset state before clearing
      removeDraftLater(key);
    },
    keep() {
      removeDraftLater(key);
    },
  };
}

/**
 * bindRefDraft: same contract for a group of refs (single values or arrays)
 * that together make up one form, e.g. the challenge dialog.
 */
export function bindRefDraft(key, refs, defaults) {
  const draft = readDraft(key);
  let restored = false;
  if (draft) {
    for (const [field, ref] of Object.entries(refs)) {
      if (field in draft && draft[field] !== undefined) {
        ref.value = draft[field];
        restored = true;
      }
    }
  }
  function snapshot() {
    const out = {};
    for (const [field, ref] of Object.entries(refs)) out[field] = plain(ref.value);
    return out;
  }
  watch(snapshot, (value) => {
    saveDraft(key, value);
  });
  return {
    restored,
    reset(next = {}) {
      const base = resolveDefaults(defaults);
      for (const field of Object.keys(refs)) {
        const value = field in next ? next[field] : base[field];
        if (value !== undefined) refs[field].value = value;
      }
      saveDraft(key, plain(snapshot()));
      removeDraftLater(key);
    },
    keep() {
      removeDraftLater(key);
    },
  };
}
