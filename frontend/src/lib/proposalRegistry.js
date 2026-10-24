// The contract stores proposal ids but exposes no enumeration view, so the
// Proposals page cannot discover every proposal on its own. This module keeps
// track of the proposals registered from this browser, which the page merges
// with the deployment's configured ids and any ids referenced by disputes.
// Nothing is invented: every remembered id is still read from the chain, and
// ids that do not exist are skipped by the page.

const KEY = "daoresolve:proposals:registered";
const PROBE = "daoresolve:probe";

// Same storage strategy as formPersistence: localStorage first, sessionStorage
// second, in-memory last, so the app also works where storage is blocked.
function pickStorage() {
  if (typeof window !== "undefined") {
    for (const candidate of ["localStorage", "sessionStorage"]) {
      try {
        const storage = window[candidate];
        if (storage) {
          storage.setItem(PROBE, "1");
          storage.removeItem(PROBE);
          return storage;
        }
      } catch {
        // Not available in this environment; try the next candidate.
      }
    }
  }
  return null;
}

const storage = pickStorage();
const memory = [];

export function readRememberedProposals() {
  if (!storage) return [...memory];
  try {
    const raw = storage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string" && value) : [];
  } catch {
    return [];
  }
}

export function rememberProposal(id) {
  const clean = String(id || "").trim();
  if (!clean) return;
  const current = readRememberedProposals();
  if (current.includes(clean)) return;
  const next = [...current, clean];
  if (!storage) {
    memory.length = 0;
    memory.push(...next);
    return;
  }
  try {
    storage.setItem(KEY, JSON.stringify(next));
  } catch {
    memory.length = 0;
    memory.push(...next);
  }
}

/** Merge id lists in priority order, trimming and dropping duplicates/empties. */
export function mergeProposalIds(...lists) {
  const seen = new Set();
  const merged = [];
  for (const list of lists) {
    for (const value of Array.isArray(list) ? list : []) {
      const clean = String(value || "").trim();
      if (!clean || seen.has(clean)) continue;
      seen.add(clean);
      merged.push(clean);
    }
  }
  return merged;
}
