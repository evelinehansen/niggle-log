// storage.js
// localStorage load and save, export and import, backup age tracking.
//
// The whole document lives under one namespaced key, "niggle-log:v1".
// All the family's tools share one GitHub Pages origin and therefore one
// localStorage, so a bare key would be a silent collision between siblings.
//
// Device-only state (when this browser last exported) lives in a separate
// key, "niggle-log:backup", because it belongs to this device and never
// appears in an export.

import { REGIONS, CONTEXTS, SENSATIONS, ACTIVITIES, DURATIONS, INTENSITIES } from "./taxonomy.js";

const KEY = "niggle-log:v1";
const BACKUP_KEY = "niggle-log:backup";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const CONTEXT_KEYS = CONTEXTS.map((c) => c.key);
const SENSATION_KEYS = SENSATIONS.map((s) => s.key);
const ACTIVITY_KEYS = ACTIVITIES.map((a) => a.key);
const DURATION_KEYS = DURATIONS.map((d) => d.key);
const INTENSITY_KEYS = INTENSITIES.map((i) => i.key);

// Schema version 2: `contexts` is an array (one or more), where version 1
// stored a single `context` string. sanitize() migrates v1 records on read.
export function emptyState() {
  return { schemaVersion: 2, entries: [], sessions: [], dismissals: [] };
}

function validSite(region, subsite, side) {
  const r = REGIONS.find((x) => x.key === region);
  if (!r) return false;
  if (!r.subsites.some((s) => s.key === subsite)) return false;
  return r.sides.includes(side);
}

// Bring any raw object (from disk or from an import file) into a valid
// state. Invalid records are dropped and counted rather than repaired,
// with two exceptions: an unknown sessionId becomes null, and stray site
// fields on a clear entry are stripped. Returns { state, dropped }.
export function sanitize(raw) {
  const out = emptyState();
  let dropped = 0;
  if (!raw || typeof raw !== "object") return { state: out, dropped };

  for (const s of Array.isArray(raw.sessions) ? raw.sessions : []) {
    if (!s || typeof s.id !== "string" || !DAY_RE.test(s.occurredOn || "")) {
      dropped++;
      continue;
    }
    out.sessions.push({
      id: s.id,
      occurredOn: s.occurredOn,
      createdAt: typeof s.createdAt === "string" ? s.createdAt : null,
      editedAt: typeof s.editedAt === "string" ? s.editedAt : null,
      activity: ACTIVITY_KEYS.includes(s.activity) ? s.activity : null,
      durationBucket: DURATION_KEYS.includes(s.durationBucket) ? s.durationBucket : null,
      intensity: INTENSITY_KEYS.includes(s.intensity) ? s.intensity : null,
    });
  }
  const sessionIds = new Set(out.sessions.map((s) => s.id));

  for (const e of Array.isArray(raw.entries) ? raw.entries : []) {
    if (!e || typeof e.id !== "string" || !DAY_RE.test(e.occurredOn || "")) {
      dropped++;
      continue;
    }
    const base = {
      id: e.id,
      occurredOn: e.occurredOn,
      createdAt: typeof e.createdAt === "string" ? e.createdAt : null,
      editedAt: typeof e.editedAt === "string" ? e.editedAt : null,
    };
    if (e.kind === "clear") {
      // Clear entries carry no site fields at all; anything extra is stripped.
      out.entries.push({ ...base, kind: "clear" });
    } else if (e.kind === "niggle") {
      if (!validSite(e.region, e.subsite, e.side)) { dropped++; continue; }
      if (![1, 2, 3].includes(e.severity)) { dropped++; continue; }
      // v2 stores `contexts` as an array; a v1 record's single `context`
      // string migrates to a one-element array. Kept in taxonomy order.
      const rawContexts = Array.isArray(e.contexts)
        ? e.contexts
        : typeof e.context === "string" ? [e.context] : [];
      const contexts = CONTEXT_KEYS.filter((k) => rawContexts.includes(k));
      if (contexts.length === 0) { dropped++; continue; }
      out.entries.push({
        ...base,
        kind: "niggle",
        region: e.region,
        subsite: e.subsite,
        side: e.side,
        severity: e.severity,
        contexts,
        sensation: SENSATION_KEYS.includes(e.sensation) ? e.sensation : null,
        note: typeof e.note === "string" && e.note.trim() ? e.note.slice(0, 140) : null,
        sessionId:
          typeof e.sessionId === "string" && sessionIds.has(e.sessionId) ? e.sessionId : null,
      });
    } else {
      dropped++;
    }
  }

  // A day cannot be both a clear day and a niggle day; the niggle wins.
  // At most one clear entry per day.
  const niggleDays = new Set(
    out.entries.filter((e) => e.kind === "niggle").map((e) => e.occurredOn)
  );
  const clearSeen = new Set();
  out.entries = out.entries.filter((e) => {
    if (e.kind !== "clear") return true;
    if (niggleDays.has(e.occurredOn)) { dropped++; return false; }
    if (clearSeen.has(e.occurredOn)) { dropped++; return false; }
    clearSeen.add(e.occurredOn);
    return true;
  });

  for (const d of Array.isArray(raw.dismissals) ? raw.dismissals : []) {
    if (
      !d ||
      typeof d.siteKey !== "string" ||
      d.siteKey.split(":").length !== 3 ||
      typeof d.rule !== "string" ||
      !DAY_RE.test(d.dismissedOn || "") ||
      ![1, 2, 3].includes(d.severityAtDismissal)
    ) {
      dropped++;
      continue;
    }
    out.dismissals.push({
      siteKey: d.siteKey,
      rule: d.rule,
      dismissedOn: d.dismissedOn,
      severityAtDismissal: d.severityAtDismissal,
    });
  }

  return { state: out, dropped };
}

// ------------------------------------------------------------ load and save

export function load() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(KEY));
  } catch (e) {
    raw = null;
  }
  return sanitize(raw).state;
}

// Returns true when the write actually happened. Quota overflow and Safari
// private mode both throw, and then the write did NOT happen; the app must
// tell the user loudly rather than autosave in silence.
export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

// ------------------------------------------------------------ backup status

export function getLastExportAt() {
  try {
    const raw = JSON.parse(localStorage.getItem(BACKUP_KEY));
    return raw && typeof raw.lastExportAt === "string" ? raw.lastExportAt : null;
  } catch (e) {
    return null;
  }
}

export function setLastExportAt(iso) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ lastExportAt: iso }));
    return true;
  } catch (e) {
    return false;
  }
}

// --------------------------------------------------------- export and import

export function buildExport(state, nowIso) {
  return {
    schemaVersion: 2,
    exportedAt: nowIso,
    entries: state.entries,
    sessions: state.sessions,
    dismissals: state.dismissals,
  };
}

// Parse and validate an import file. Returns either
// { ok: true, state, dropped } or { ok: false, error } with a message
// fit to show the user.
export function parseImport(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: "That file is not readable JSON." };
  }
  if (!raw || typeof raw !== "object" || !("schemaVersion" in raw)) {
    return { ok: false, error: "That does not look like a Niggle Log export file." };
  }
  if (raw.schemaVersion !== 1 && raw.schemaVersion !== 2) {
    return {
      ok: false,
      error: `That file has schema version ${raw.schemaVersion}. This tool reads schema versions 1 and 2.`,
    };
  }
  const { state, dropped } = sanitize(raw);
  return { ok: true, state, dropped };
}

// Merge semantics: match on id, incoming wins on conflict, union of both
// sets. Dismissals have no id, so they match on (siteKey, rule, dismissedOn).
export function merge(current, incoming) {
  const entryMap = new Map(current.entries.map((e) => [e.id, e]));
  for (const e of incoming.entries) entryMap.set(e.id, e);
  const sessionMap = new Map(current.sessions.map((s) => [s.id, s]));
  for (const s of incoming.sessions) sessionMap.set(s.id, s);
  const dKey = (d) => `${d.siteKey}|${d.rule}|${d.dismissedOn}`;
  const dismissalMap = new Map(current.dismissals.map((d) => [dKey(d), d]));
  for (const d of incoming.dismissals) dismissalMap.set(dKey(d), d);
  const merged = {
    schemaVersion: 2,
    entries: [...entryMap.values()],
    sessions: [...sessionMap.values()],
    dismissals: [...dismissalMap.values()],
  };
  // Re-run the invariants (one clear per day, niggle wins, ids resolve).
  return sanitize(merged).state;
}
