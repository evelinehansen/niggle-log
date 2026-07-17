// engine.js
// All derivation and detection logic as pure functions. No DOM in this file,
// and no reading of the clock: `today` is always passed in as a "YYYY-MM-DD"
// string. That is what makes every function here testable with a plain call.
//
// Derived values (flags, frequencies, the strip) are computed fresh every
// time and never stored. Editing an old entry therefore recomputes the flag
// correctly with no extra code.

import { REGIONS, SIDES } from "./taxonomy.js";

// ---------------------------------------------------------------- day maths

const MS_PER_DAY = 86400000;

// Add n calendar days to a "YYYY-MM-DD" string (n can be negative).
export function addDays(day, n) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Whole days from b to a. Positive when a is the later day.
export function dayDiff(a, b) {
  return Math.round(
    (Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / MS_PER_DAY
  );
}

// ------------------------------------------------------ identity and labels

export function siteKey(entry) {
  return `${entry.region}:${entry.subsite}:${entry.side}`;
}

export function parseSiteKey(key) {
  const [region, subsite, side] = key.split(":");
  return { region, subsite, side };
}

function regionByKey(key) {
  return REGIONS.find((r) => r.key === key) || null;
}

function subsiteByKey(regionKey, subsiteKey) {
  const region = regionByKey(regionKey);
  if (!region) return null;
  return region.subsites.find((s) => s.key === subsiteKey) || null;
}

// Shared shape for the two label styles. `field` is "short" (plain word,
// for the UI) or "clinical" (anatomical term, for export and print).
function buildLabel(key, field) {
  const { region, subsite, side } = parseSiteKey(key);
  const r = regionByKey(region);
  const s = subsiteByKey(region, subsite);
  if (!r || !s) return key;
  const part = s[field];
  if (side === "central") {
    // "Lower back, central" rather than "Lower back, central, central".
    if (part === "central" || part === "midline") return `${r.label}, ${part}`;
    return `${r.label}, ${part}, central`;
  }
  const sideWord = SIDES[side] || side;
  return `${sideWord} ${r.label.toLowerCase()}, ${part}`;
}

export function siteLabel(key) {
  return buildLabel(key, "short");
}

export function siteLabelClinical(key) {
  return buildLabel(key, "clinical");
}

// ----------------------------------------------------------------- coverage

function inWindow(day, windowDays, today) {
  const diff = dayDiff(today, day);
  return diff >= 0 && diff < windowDays;
}

// Distinct days in the window carrying any entry (niggle or clear).
export function observedDays(entries, windowDays, today) {
  const days = new Set();
  for (const e of entries) {
    if (inWindow(e.occurredOn, windowDays, today)) days.add(e.occurredOn);
  }
  return days.size;
}

export function isDayObserved(entries, day) {
  return entries.some((e) => e.occurredOn === day);
}

// --------------------------------------------------------------- aggregates

// Per-site summary over the window, most-logged first.
export function siteFrequency(entries, windowDays, today) {
  const map = new Map();
  for (const e of entries) {
    if (e.kind !== "niggle") continue;
    if (!inWindow(e.occurredOn, windowDays, today)) continue;
    const key = siteKey(e);
    let row = map.get(key);
    if (!row) {
      row = { siteKey: key, days: new Set(), latestOn: e.occurredOn, maxSeverity: 0 };
      map.set(key, row);
    }
    row.days.add(e.occurredOn);
    if (e.occurredOn > row.latestOn) row.latestOn = e.occurredOn;
    if (e.severity > row.maxSeverity) row.maxSeverity = e.severity;
  }
  return [...map.values()]
    .map((r) => ({ siteKey: r.siteKey, days: r.days.size, latestOn: r.latestOn, maxSeverity: r.maxSeverity }))
    .sort(
      (a, b) =>
        b.days - a.days ||
        (a.latestOn < b.latestOn ? 1 : a.latestOn > b.latestOn ? -1 : 0) ||
        (a.siteKey < b.siteKey ? -1 : 1)
    );
}

// Distinct sites by most recent use, for the recent-site chips.
export function recentSites(entries, limit = 6) {
  const sorted = entries
    .filter((e) => e.kind === "niggle")
    .slice()
    .sort((a, b) => ((a.createdAt || "") < (b.createdAt || "") ? 1 : -1));
  const keys = [];
  for (const e of sorted) {
    const key = siteKey(e);
    if (!keys.includes(key)) keys.push(key);
    if (keys.length >= limit) break;
  }
  return keys;
}

// Seven slots, oldest first, today last. kind is "niggle", "clear" or "none";
// a day with both kinds cannot exist, but if data ever disagrees the niggle wins.
export function last7Strip(entries, today) {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const day = addDays(today, -i);
    const dayEntries = entries.filter((e) => e.occurredOn === day);
    const niggles = dayEntries.filter((e) => e.kind === "niggle");
    if (niggles.length > 0) {
      out.push({ day, kind: "niggle", severity: Math.max(...niggles.map((e) => e.severity)) });
    } else if (dayEntries.some((e) => e.kind === "clear")) {
      out.push({ day, kind: "clear", severity: null });
    } else {
      out.push({ day, kind: "none", severity: null });
    }
  }
  return out;
}

// Everything the site detail view needs to draw its 90 day timeline.
export function siteTimeline(entries, sessions, key, windowDays, today) {
  const start = addDays(today, -(windowDays - 1));
  const points = entries
    .filter(
      (e) =>
        e.kind === "niggle" &&
        siteKey(e) === key &&
        inWindow(e.occurredOn, windowDays, today)
    )
    .map((e) => ({ day: e.occurredOn, severity: e.severity, entryId: e.id }))
    .sort((a, b) => (a.day < b.day ? -1 : 1));
  const sessionDays = [
    ...new Set(
      sessions
        .filter((s) => inWindow(s.occurredOn, windowDays, today))
        .map((s) => s.occurredOn)
    ),
  ].sort();
  return { start, end: today, windowDays, points, sessionDays };
}

// ---------------------------------------------------------------- detection

// The v1 rule: Escalation. Scope is one site key, window is 14 calendar days.
// Fires only when all four clauses hold:
//   1. niggles on at least 3 distinct days in the window
//   2. the most recent entry falls within the last 5 days
//   3. the most recent entry is severity 2 or 3
//   4. max severity in the last 7 days > max severity in the prior 7 days
//      (an empty half counts as 0, which lets a rapid onset fire)
function escalationCandidates(entries, today) {
  const bySite = new Map();
  for (const e of entries) {
    if (e.kind !== "niggle") continue;
    if (!inWindow(e.occurredOn, 14, today)) continue;
    const key = siteKey(e);
    if (!bySite.has(key)) bySite.set(key, []);
    bySite.get(key).push(e);
  }

  const flags = [];
  for (const [key, siteEntries] of bySite) {
    const days = [...new Set(siteEntries.map((e) => e.occurredOn))].sort();
    if (days.length < 3) continue; // clause 1

    const latestOn = days[days.length - 1];
    if (dayDiff(today, latestOn) > 4) continue; // clause 2

    const latestSeverity = Math.max(
      ...siteEntries.filter((e) => e.occurredOn === latestOn).map((e) => e.severity)
    );
    if (latestSeverity < 2) continue; // clause 3

    let recentMax = 0;
    let priorMax = 0;
    for (const e of siteEntries) {
      const diff = dayDiff(today, e.occurredOn);
      if (diff <= 6) recentMax = Math.max(recentMax, e.severity);
      else priorMax = Math.max(priorMax, e.severity);
    }
    if (recentMax <= priorMax) continue; // clause 4

    flags.push({
      rule: "escalation",
      siteKey: key,
      daysLogged: days.length,
      windowDays: 14,
      priorMax,
      recentMax,
      latestOn,
      latestSeverity,
    });
  }
  return flags;
}

// The current max severity at a flagged site over its window. Used both for
// the dismissal cooldown break and for recording severityAtDismissal.
export function flagWindowMax(flag) {
  return Math.max(flag.recentMax, flag.priorMax);
}

// A dismissal suppresses its (siteKey, rule) pair for 7 days, unless the
// site's max severity has since climbed above what it was at dismissal.
// That break is what prevents "I dismissed it, then it got worse, and the
// app said nothing."
export function isDismissed(dismissals, siteKeyValue, rule, maxSeverityNow, today) {
  const relevant = dismissals
    .filter(
      (d) =>
        d.siteKey === siteKeyValue &&
        d.rule === rule &&
        dayDiff(today, d.dismissedOn) >= 0 &&
        dayDiff(today, d.dismissedOn) < 7
    )
    .sort((a, b) => (a.dismissedOn < b.dismissedOn ? 1 : -1));
  if (relevant.length === 0) return false;
  return maxSeverityNow <= relevant[0].severityAtDismissal;
}

// Deterministic ranking so the flag never flickers between renders:
// latest severity, then most recent entry, then distinct days, then site key.
function rankFlags(a, b) {
  return (
    b.latestSeverity - a.latestSeverity ||
    (a.latestOn < b.latestOn ? 1 : a.latestOn > b.latestOn ? -1 : 0) ||
    b.daysLogged - a.daysLogged ||
    (a.siteKey < b.siteKey ? -1 : 1)
  );
}

export function detectEscalation(entries, dismissals, today) {
  const flags = escalationCandidates(entries, today)
    .filter((f) => !isDismissed(dismissals, f.siteKey, f.rule, flagWindowMax(f), today))
    .sort(rankFlags);
  return flags[0] || null;
}

// At most one active flag at a time. In v1 the only rule is escalation;
// later rules slot in here below it in rank order.
export function activeFlag(entries, dismissals, today) {
  return detectEscalation(entries, dismissals, today);
}

// ------------------------------------------------------------- housekeeping

export function backupAgeDays(lastExportAt, today) {
  if (!lastExportAt) return null;
  return Math.max(0, dayDiff(today, lastExportAt.slice(0, 10)));
}

// v3 groundwork: bucket midpoint in minutes times an intensity weight.
// Derived on demand, never stored. Nothing in v1 calls this.
export function loadProxy(session) {
  const midpoints = { under_30: 15, "30_60": 45, "60_90": 75, over_90: 105 };
  const weights = { easy: 1, moderate: 2, hard: 3 };
  if (!session || !midpoints[session.durationBucket] || !weights[session.intensity]) return null;
  return midpoints[session.durationBucket] * weights[session.intensity];
}
