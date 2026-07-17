// app.js
// All DOM work lives here. engine.js computes, storage.js persists, this
// file renders and routes events. Every user-facing sentence is either in
// this file or in taxonomy.js, so the copy can be audited in one pass.

import * as engine from "./engine.js";
import * as store from "./storage.js";
import {
  REGIONS, SIDES, SEVERITIES, CONTEXTS, SENSATIONS,
  ACTIVITIES, DURATIONS, INTENSITIES, GLOSSARY,
} from "./taxonomy.js";

// ------------------------------------------------------------------- state

let data = store.load();

const ui = {
  tab: "today",          // today | log | body
  view: "tabs",          // tabs | site
  siteKey: null,         // which site the detail view shows
  returnTab: "today",    // where Back from the detail view goes
  sheet: null,           // the open bottom sheet / side panel, or null
  glossaryOpen: false,
  dialog: null,          // the open confirm dialog, or null
  logFilter: "all",
  popToday: false,       // one-shot: animate today's strip mark on next render
  saveFailed: false,
};

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix) {
  let id;
  do {
    id = prefix + Math.random().toString(36).slice(2, 8);
  } while (
    data.entries.some((e) => e.id === id) ||
    data.sessions.some((s) => s.id === id)
  );
  return id;
}

function persist() {
  const ok = store.save(data);
  ui.saveFailed = !ok;
}

// -------------------------------------------------------------- DOM helper

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    node.append(child);
  }
  return node;
}

function svgEl(tag, attrs = {}, ...children) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    if (k === "class") node.setAttribute("class", v);
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

// ---------------------------------------------------------- label helpers

function contextLabel(key) {
  const c = CONTEXTS.find((x) => x.key === key);
  return c ? c.label : key;
}

function contextsPhrase(keys) {
  return keys.map((k) => contextLabel(k).toLowerCase()).join(", ");
}

// Membership toggle that keeps the result in taxonomy order, so "at rest,
// next morning" never renders as "next morning, at rest".
function toggleContext(keys, key) {
  const wanted = new Set(keys);
  if (wanted.has(key)) wanted.delete(key);
  else wanted.add(key);
  return CONTEXTS.map((c) => c.key).filter((k) => wanted.has(k));
}

function severityPhrase(sev) {
  const s = SEVERITIES.find((x) => x.value === sev);
  return `severity ${sev} of 3, ${s ? s.label.toLowerCase() : ""}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtDay(day, withWeekday = false) {
  const d = new Date(day + "T00:00:00");
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const year = d.getFullYear() === new Date().getFullYear() ? "" : ` ${d.getFullYear()}`;
  return (withWeekday ? `${WEEKDAYS[d.getDay()]} ` : "") + base + year;
}

function weekdayInitial(day) {
  return WEEKDAYS[new Date(day + "T00:00:00").getDay()][0];
}

// ------------------------------------------------------------------ render

function render() {
  renderHeader();
  renderTabs();
  renderMain();
  renderOverlay();
  renderBanner();
  ui.popToday = false;
}

function renderHeader() {
  const status = document.getElementById("backup-status");
  const age = engine.backupAgeDays(store.getLastExportAt(), todayStr());
  if (age === null) status.textContent = "Last backup: never";
  else if (age === 0) status.textContent = "Last backup: today";
  else if (age === 1) status.textContent = "Last backup: 1 day ago";
  else status.textContent = `Last backup: ${age} days ago`;
}

function renderTabs() {
  document.querySelectorAll(".tab").forEach((t) => {
    const selected = ui.view === "tabs" && t.dataset.tab === ui.tab;
    t.setAttribute("aria-selected", selected ? "true" : "false");
  });
}

function renderMain() {
  const main = document.getElementById("main");
  main.replaceChildren();
  if (ui.view === "site") main.append(viewSiteDetail());
  else if (ui.tab === "today") main.append(viewToday());
  else if (ui.tab === "log") main.append(viewLog());
  else main.append(viewBody());
}

// ------------------------------------------------------------- Today view

function viewToday() {
  const t = todayStr();
  const wrap = el("div", { class: "view" });

  const flag = engine.activeFlag(data.entries, data.dismissals, t);
  if (flag) wrap.append(flagCard(flag));

  if (data.entries.length === 0) {
    wrap.append(
      el("div", { class: "empty-state" },
        el("span", { class: "serif", text: "Log the small things that have not stopped you." }),
        el("span", { text: "Location, how much it changed what you did, and when." }),
        el("br"),
        el("span", { text: "After a couple of weeks, patterns start to be visible." }),
        el("br"),
        el("span", { text: "If one spot keeps coming back and gets worse across two weeks, a card will appear here showing you that record." })
      )
    );
  }

  const hasNiggleToday = data.entries.some((e) => e.kind === "niggle" && e.occurredOn === t);
  const hasClearToday = data.entries.some((e) => e.kind === "clear" && e.occurredOn === t);

  const clearBtn = el("button", {
    class: "btn big",
    type: "button",
    text: hasClearToday ? "Marked clear for today" : "Nothing to report",
    onclick: markClearToday,
  });
  if (hasClearToday || hasNiggleToday) clearBtn.disabled = true;

  wrap.append(
    el("div", { class: "today-actions" },
      el("button", {
        class: "btn primary big", type: "button", text: "Log a niggle",
        onclick: () => openLogForm("create", null),
      }),
      clearBtn
    )
  );

  wrap.append(stripEl(t));
  return wrap;
}

function stripEl(t) {
  const slots = engine.last7Strip(data.entries, t);
  const row = el("div", { class: "strip", role: "img", "aria-label": "The last 7 days" });
  for (const slot of slots) {
    const isToday = slot.day === t;
    const box = el("div", { class: "strip-box" });
    if (slot.kind === "clear") {
      box.append(markEl("clear", isToday));
    } else if (slot.kind === "niggle") {
      box.append(markEl(`sev${slot.severity}`, isToday));
    }
    const cls = `strip-slot ${slot.kind}${isToday ? " today" : ""}`;
    row.append(
      el("div", { class: cls, title: fmtDay(slot.day, true) },
        box,
        el("span", { class: "strip-day", text: isToday ? "Today" : weekdayInitial(slot.day) })
      )
    );
  }
  return row;
}

function markEl(kindClass, isToday) {
  const pop = isToday && ui.popToday ? " pop" : "";
  return el("span", { class: `mark ${kindClass}${pop}` });
}

function flagCard(flag) {
  // Pure fact, no verdict, no instruction. The user concludes.
  let body;
  if (flag.rule === "persistence") {
    body = `Logged on ${flag.daysLogged} of the last 14 days. The worst level was ` +
      `${flag.windowMax} of 3.`;
    if (flag.morningCount === 1) {
      body += " On 1 of those days it was already there when you woke up.";
    } else if (flag.morningCount > 1) {
      body += ` On ${flag.morningCount} of those days it was already there when you woke up.`;
    }
  } else if (flag.priorMax > 0) {
    body = `Logged on ${flag.daysLogged} of the last 14 days. The worst level was ` +
      `${flag.priorMax} of 3 in the first week and ${flag.recentMax} of 3 in the last 7 days.`;
  } else {
    body = `Logged on ${flag.daysLogged} of the last 14 days. Nothing was logged in the ` +
      `week before; the worst level in the last 7 days was ${flag.recentMax} of 3.`;
  }
  return el("section", { class: "card flag-card" },
    el("h2", { class: "serif", text: engine.siteLabel(flag.siteKey) }),
    el("p", { text: body }),
    el("div", { class: "flag-actions" },
      el("button", {
        class: "btn", type: "button", text: "See the timeline",
        onclick: () => openSiteDetail(flag.siteKey, "today"),
      }),
      el("button", {
        class: "btn ghost", type: "button", text: "Not now",
        onclick: () => dismissFlag(flag),
      })
    )
  );
}

function dismissFlag(flag) {
  data.dismissals.push({
    siteKey: flag.siteKey,
    rule: flag.rule,
    dismissedOn: todayStr(),
    severityAtDismissal: engine.flagWindowMax(flag),
  });
  persist();
  render();
}

function markClearToday() {
  const t = todayStr();
  if (data.entries.some((e) => e.occurredOn === t)) return;
  data.entries.push({
    id: uid("e_"), kind: "clear", occurredOn: t, createdAt: nowIso(), editedAt: null,
  });
  persist();
  ui.popToday = true;
  render();
}

// --------------------------------------------------------------- Log view

function viewLog() {
  const wrap = el("div", { class: "view" });

  const siteKeys = [...new Set(
    data.entries.filter((e) => e.kind === "niggle").map((e) => engine.siteKey(e))
  )].sort((a, b) => engine.siteLabel(a).localeCompare(engine.siteLabel(b)));

  if (siteKeys.length > 0) {
    const select = el("select", {
      "aria-label": "Filter by site",
      onchange: (ev) => { ui.logFilter = ev.target.value; render(); },
    });
    select.append(el("option", { value: "all", text: "All sites" }));
    for (const key of siteKeys) {
      select.append(el("option", { value: key, text: engine.siteLabel(key) }));
    }
    if (ui.logFilter !== "all" && !siteKeys.includes(ui.logFilter)) ui.logFilter = "all";
    select.value = ui.logFilter;
    wrap.append(el("div", { class: "log-filter" }, select));
  }

  const entries = data.entries
    .filter((e) => {
      if (ui.logFilter === "all") return true;
      return e.kind === "niggle" && engine.siteKey(e) === ui.logFilter;
    })
    .slice()
    .sort((a, b) =>
      a.occurredOn < b.occurredOn ? 1 :
      a.occurredOn > b.occurredOn ? -1 :
      (a.createdAt || "") < (b.createdAt || "") ? 1 : -1
    );

  if (entries.length === 0) {
    wrap.append(el("p", { class: "empty-state", text: "Nothing logged yet." }));
    return wrap;
  }

  const list = el("div", { class: "row-list" });
  for (const e of entries) list.append(logRow(e));
  wrap.append(list);
  return wrap;
}

function logRow(e) {
  if (e.kind === "clear") {
    return el("button", {
      class: "log-row clear-row", type: "button",
      onclick: () => { ui.dialog = { type: "remove-clear", id: e.id, day: e.occurredOn }; render(); },
    },
      el("div", { class: "row-top" },
        el("span", { class: "row-site", text: "Nothing to report" }),
        el("span", { class: "row-date", text: fmtDay(e.occurredOn, true) })
      )
    );
  }
  const session = e.sessionId ? data.sessions.find((s) => s.id === e.sessionId) : null;
  const bits = [severityPhrase(e.severity), contextsPhrase(e.contexts)];
  if (session) {
    const act = ACTIVITIES.find((a) => a.key === session.activity);
    bits.push(act ? `session: ${act.label.toLowerCase()}` : "session logged");
  }
  return el("button", {
    class: "log-row", type: "button",
    onclick: () => openLogForm("edit", e.id),
  },
    el("div", { class: "row-top" },
      el("span", { class: "row-site", text: engine.siteLabel(engine.siteKey(e)) }),
      el("span", { class: "row-date", text: fmtDay(e.occurredOn, true) })
    ),
    el("div", { class: "row-sub", text: bits.join(" · ") })
  );
}

// -------------------------------------------------------------- Body view

const BODY_WINDOW = 90;
const COVERAGE_MIN = 14;

function viewBody() {
  const t = todayStr();
  const wrap = el("div", { class: "view" });

  const observed = engine.observedDays(data.entries, BODY_WINDOW, t);
  if (observed < COVERAGE_MIN) {
    // The coverage gate. Below an honest minimum of observed days this view
    // shows progress toward the reveal, not numbers.
    const pct = Math.round((observed / COVERAGE_MIN) * 100);
    wrap.append(
      el("section", { class: "card coverage-gate" },
        el("p", { text: `This view needs ${COVERAGE_MIN} observed days. You have ${observed}.` }),
        el("div", { class: "progress-track" },
          el("div", { class: "progress-fill gate", style: `width: ${pct}%` })
        )
      )
    );
    return wrap;
  }

  const freq = engine.siteFrequency(data.entries, BODY_WINDOW, t);
  if (freq.length === 0) {
    wrap.append(el("p", { class: "empty-state", text: `No niggles logged in the last ${BODY_WINDOW} days.` }));
    return wrap;
  }

  const flag = engine.activeFlag(data.entries, data.dismissals, t);
  const maxDays = freq[0].days;
  const list = el("div", { class: "row-list" });
  for (const row of freq) {
    const flagged = flag && flag.siteKey === row.siteKey;
    const pct = Math.max(4, Math.round((row.days / maxDays) * 100));
    list.append(
      el("button", {
        class: "body-row", type: "button",
        onclick: () => openSiteDetail(row.siteKey, "body"),
      },
        el("div", { class: "row-top" },
          el("span", { class: "row-site", text: engine.siteLabel(row.siteKey) }),
          el("span", { class: "row-count", text: `Logged on ${row.days} of the last ${BODY_WINDOW} days` })
        ),
        el("div", { class: "progress-track" },
          el("div", { class: `progress-fill freq${flagged ? " flagged" : ""}`, style: `width: ${pct}%` })
        )
      )
    );
  }
  wrap.append(list);
  return wrap;
}

// ------------------------------------------------------------ Site detail

function openSiteDetail(key, returnTab) {
  ui.view = "site";
  ui.siteKey = key;
  ui.returnTab = returnTab || ui.tab;
  render();
}

function viewSiteDetail() {
  const t = todayStr();
  const key = ui.siteKey;
  const wrap = el("div", { class: "view" });

  wrap.append(
    el("button", {
      class: "btn ghost small back-link", type: "button", text: "Back",
      onclick: () => { ui.view = "tabs"; ui.tab = ui.returnTab; render(); },
    })
  );

  wrap.append(
    el("div", { class: "detail-head" },
      el("h2", { class: "serif", text: engine.siteLabel(key) }),
      el("span", { class: "detail-sub", text: engine.siteLabelClinical(key) })
    )
  );

  const tl = engine.siteTimeline(data.entries, data.sessions, key, BODY_WINDOW, t);
  wrap.append(timelineSvg(tl));

  const entries = data.entries
    .filter((e) => e.kind === "niggle" && engine.siteKey(e) === key)
    .sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : -1));
  const list = el("div", { class: "row-list" });
  for (const e of entries) list.append(logRow(e));
  wrap.append(list);

  return wrap;
}

function timelineSvg(tl) {
  const W = 720, H = 175, padL = 56, padR = 14;
  const yFor = { 3: 34, 2: 66, 1: 98 };
  const axisY = 122;
  const span = tl.windowDays - 1;
  const x = (day) => padL + (engine.dayDiff(day, tl.start) / span) * (W - padL - padR);

  const svg = svgEl("svg", {
    class: "timeline-svg", viewBox: `0 0 ${W} ${H}`,
    role: "img", "aria-label": `Severity over the last ${tl.windowDays} days`,
  });

  // guide lines and the severity scale, spelled out
  for (const sev of [1, 2, 3]) {
    svg.append(svgEl("line", { class: "grid", x1: padL, y1: yFor[sev], x2: W - padR, y2: yFor[sev] }));
    svg.append(svgEl("text", { class: "axis-label", x: 8, y: yFor[sev] + 4, text: `${sev} of 3` }));
  }
  svg.append(svgEl("line", { class: "grid", x1: padL, y1: axisY, x2: W - padR, y2: axisY }));

  // session ticks under the axis, where sessions exist
  for (const day of tl.sessionDays) {
    svg.append(svgEl("line", {
      class: "session-tick", x1: x(day), y1: axisY + 6, x2: x(day), y2: axisY + 18,
    }, svgEl("title", { text: `Session, ${fmtDay(day)}` })));
  }

  // severity dots, tappable to edit
  for (const p of tl.points) {
    const cx = x(p.day);
    svg.append(svgEl("circle", { class: `dot sev${p.severity}`, cx, cy: yFor[p.severity], r: 5.5 }));
    svg.append(svgEl("circle", {
      class: "dot-hit", cx, cy: yFor[p.severity], r: 16,
      tabindex: "0", role: "button",
      "aria-label": `${fmtDay(p.day)}, ${severityPhrase(p.severity)}. Opens the entry.`,
      onclick: () => openLogForm("edit", p.entryId),
      onkeydown: (ev) => { if (ev.key === "Enter" || ev.key === " ") openLogForm("edit", p.entryId); },
    }, svgEl("title", { text: `${fmtDay(p.day)}, ${severityPhrase(p.severity)}` })));
  }

  svg.append(svgEl("text", { class: "axis-label", x: padL, y: H - 8, text: fmtDay(tl.start) }));
  svg.append(svgEl("text", { class: "axis-label", x: W - padR, y: H - 8, "text-anchor": "end", text: "Today" }));
  return svg;
}

// --------------------------------------------------------- log/edit form

function openLogForm(mode, entryId) {
  let f = {
    region: null, subsite: null, side: null,
    severity: null, contexts: [], sensation: null,
    note: "", occurredOn: todayStr(),
  };
  let sessionDraft = null;
  if (mode === "edit") {
    const e = data.entries.find((x) => x.id === entryId);
    if (!e || e.kind !== "niggle") return;
    f = {
      region: e.region, subsite: e.subsite, side: e.side,
      severity: e.severity, contexts: [...e.contexts], sensation: e.sensation,
      note: e.note || "", occurredOn: e.occurredOn,
    };
    const s = e.sessionId ? data.sessions.find((x) => x.id === e.sessionId) : null;
    if (s) sessionDraft = { activity: s.activity, durationBucket: s.durationBucket, intensity: s.intensity };
  }
  ui.sheet = { type: "form", mode, entryId, f, sessionDraft, sessionOpen: false };
  render();
}

function closeSheet() {
  ui.sheet = null;
  render();
}

function formSheet(sheet) {
  const { mode, f } = sheet;
  const isEdit = mode === "edit";
  const panel = el("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": isEdit ? "Edit entry" : "Log a niggle" });
  panel.append(el("h2", { text: isEdit ? "Edit entry" : "Log a niggle" }));

  // Recent sites: the highest-leverage friction reduction in the tool.
  if (!isEdit) {
    const recents = engine.recentSites(data.entries, 6);
    if (recents.length > 0) {
      const row = el("div", { class: "chip-row" });
      for (const key of recents) {
        const active = f.region && engine.siteKey(f) === key;
        row.append(el("button", {
          class: "chip", type: "button", "aria-pressed": active ? "true" : "false",
          text: engine.siteLabel(key),
          onclick: () => {
            const parts = engine.parseSiteKey(key);
            f.region = parts.region; f.subsite = parts.subsite; f.side = parts.side;
            render();
          },
        }));
      }
      panel.append(section("Recent sites", row));
    }
  }

  // Where: region, then subsite, then side. Side is never auto-defaulted.
  const regionRow = el("div", { class: "chip-row" });
  for (const r of REGIONS) {
    regionRow.append(el("button", {
      class: "chip", type: "button", "aria-pressed": f.region === r.key ? "true" : "false",
      text: r.label,
      onclick: () => {
        if (f.region !== r.key) { f.region = r.key; f.subsite = null; f.side = null; }
        render();
      },
    }));
  }
  const whereSection = section("Where", regionRow);
  const region = REGIONS.find((r) => r.key === f.region);
  if (region) {
    const subRow = el("div", { class: "chip-row" });
    for (const s of region.subsites) {
      subRow.append(el("button", {
        class: "chip", type: "button", "aria-pressed": f.subsite === s.key ? "true" : "false",
        text: s.label,
        onclick: () => { f.subsite = s.key; render(); },
      }));
    }
    whereSection.append(subgroup(`Which part of the ${region.label.toLowerCase()}?`, subRow));
    const sideRow = el("div", { class: "chip-row" });
    for (const sideKey of region.sides) {
      sideRow.append(el("button", {
        class: "chip", type: "button", "aria-pressed": f.side === sideKey ? "true" : "false",
        text: SIDES[sideKey],
        onclick: () => { f.side = sideKey; render(); },
      }));
    }
    whereSection.append(subgroup("Which side?", sideRow));
  }
  whereSection.append(el("button", {
    class: "quiet-link", type: "button", text: "What do these words mean?",
    onclick: () => { ui.glossaryOpen = true; render(); },
  }));
  panel.append(whereSection);

  // Severity: behaviourally anchored, three levels.
  const sevWrap = el("div", {});
  for (const s of SEVERITIES) {
    sevWrap.append(el("button", {
      class: "severity-option", type: "button",
      "aria-pressed": f.severity === s.value ? "true" : "false",
      "aria-label": `${s.value} of 3, ${s.label.toLowerCase()}. ${s.anchor}`,
      onclick: () => { f.severity = s.value; render(); },
    },
      el("span", { class: "sev-label", text: `${s.value} of 3, ${s.label.toLowerCase()}` }),
      el("span", { class: "sev-anchor", text: s.anchor })
    ));
  }
  panel.append(section("How much did it change what you did?", sevWrap));

  // Context: multi-select, one or more.
  const ctxRow = el("div", { class: "chip-row" });
  for (const c of CONTEXTS) {
    ctxRow.append(el("button", {
      class: "chip", type: "button", "aria-pressed": f.contexts.includes(c.key) ? "true" : "false",
      text: c.label,
      onclick: () => { f.contexts = toggleContext(f.contexts, c.key); render(); },
    }));
  }
  panel.append(section("When did you feel it? (all that apply)", ctxRow));

  // Sensation: optional, one tap, tap again to clear.
  const senRow = el("div", { class: "chip-row" });
  for (const s of SENSATIONS) {
    senRow.append(el("button", {
      class: "chip", type: "button", "aria-pressed": f.sensation === s.key ? "true" : "false",
      text: s.label,
      onclick: () => { f.sensation = f.sensation === s.key ? null : s.key; render(); },
    }));
  }
  panel.append(section("What did it feel like? (optional)", senRow));

  // Note: capped so it never becomes a journal.
  const noteInput = el("input", {
    type: "text", class: "field-wide", maxlength: "140",
    value: f.note, placeholder: "Only on stairs going down.",
    oninput: (ev) => { f.note = ev.target.value; },
  });
  panel.append(section("Note (optional)", noteInput));

  // Which day: today, yesterday, or a picked date. Back-dating is required.
  const t = todayStr();
  const yesterday = engine.addDays(t, -1);
  const dateInput = el("input", {
    type: "date", value: f.occurredOn, max: t,
    onchange: (ev) => {
      const v = ev.target.value;
      if (v && v <= t) f.occurredOn = v;
      render();
    },
  });
  const dayRow = el("div", { class: "chip-row" },
    el("button", {
      class: "chip", type: "button", "aria-pressed": f.occurredOn === t ? "true" : "false",
      text: "Today", onclick: () => { f.occurredOn = t; render(); },
    }),
    el("button", {
      class: "chip", type: "button", "aria-pressed": f.occurredOn === yesterday ? "true" : "false",
      text: "Yesterday", onclick: () => { f.occurredOn = yesterday; render(); },
    }),
    dateInput
  );
  panel.append(section("Which day?", dayRow));

  // Session, in the edit form only. Creation uses the after-save prompt.
  if (isEdit) panel.append(sessionSection(sheet));

  // Footer.
  const valid = f.region && f.subsite && f.side && f.severity && f.contexts.length > 0;
  const saveBtn = el("button", {
    class: "btn primary", type: "button", text: "Save",
    onclick: () => saveForm(sheet),
  });
  if (!valid) saveBtn.disabled = true;
  const footer = el("div", { class: "sheet-footer" },
    saveBtn,
    el("button", { class: "btn ghost", type: "button", text: "Cancel", onclick: closeSheet })
  );
  panel.append(footer);

  if (isEdit) {
    panel.append(el("div", { class: "sheet-footer" },
      el("button", {
        class: "btn danger", type: "button", text: "Delete this entry",
        onclick: () => { ui.dialog = { type: "delete-entry", id: sheet.entryId }; render(); },
      })
    ));
  }

  return panel;
}

function section(heading, ...children) {
  return el("div", { class: "sheet-section" },
    el("span", { class: "section-h", text: heading }),
    ...children
  );
}

// A labelled step inside a section, for choices that only appear after an
// earlier choice (part and side after region).
function subgroup(label, row) {
  return el("div", { class: "chip-subgroup" },
    el("span", { class: "subgroup-h", text: label }),
    row
  );
}

function sessionSection(sheet) {
  const entry = data.entries.find((x) => x.id === sheet.entryId);
  const hasSession = entry && entry.sessionId;

  if (!hasSession && !sheet.sessionOpen) {
    if (!sheet.f.contexts.includes("after_activity")) return el("span", {});
    return section("Session",
      el("button", {
        class: "btn small", type: "button", text: "Add a session",
        onclick: () => {
          sheet.sessionOpen = true;
          sheet.sessionDraft = { activity: null, durationBucket: null, intensity: null };
          render();
        },
      })
    );
  }

  const draft = sheet.sessionDraft || { activity: null, durationBucket: null, intensity: null };
  sheet.sessionDraft = draft;
  const wrap = el("div", {},
    sessionChipRows(draft),
    hasSession
      ? el("button", {
          class: "quiet-link", type: "button", text: "Delete this session",
          onclick: () => { ui.dialog = { type: "delete-session", entryId: sheet.entryId }; render(); },
        })
      : null
  );
  return section("Session", wrap);
}

function sessionChipRows(draft) {
  const mkRow = (items, field) => {
    const row = el("div", { class: "chip-row", style: "margin-bottom: 0.5rem" });
    for (const item of items) {
      row.append(el("button", {
        class: "chip", type: "button",
        "aria-pressed": draft[field] === item.key ? "true" : "false",
        text: item.label,
        onclick: () => { draft[field] = draft[field] === item.key ? null : item.key; render(); },
      }));
    }
    return row;
  };
  return el("div", {},
    mkRow(ACTIVITIES, "activity"),
    mkRow(DURATIONS, "durationBucket"),
    mkRow(INTENSITIES, "intensity")
  );
}

function saveForm(sheet) {
  const { mode, f } = sheet;
  const note = f.note.trim() ? f.note.trim().slice(0, 140) : null;
  let savedEntry;

  if (mode === "create") {
    savedEntry = {
      id: uid("e_"), kind: "niggle", occurredOn: f.occurredOn,
      createdAt: nowIso(), editedAt: null,
      region: f.region, subsite: f.subsite, side: f.side,
      severity: f.severity, contexts: [...f.contexts], sensation: f.sensation,
      note, sessionId: null,
    };
    data.entries.push(savedEntry);
  } else {
    savedEntry = data.entries.find((x) => x.id === sheet.entryId);
    if (!savedEntry) return;
    Object.assign(savedEntry, {
      occurredOn: f.occurredOn, editedAt: nowIso(),
      region: f.region, subsite: f.subsite, side: f.side,
      severity: f.severity, contexts: [...f.contexts], sensation: f.sensation,
      note,
    });
    // Session changes made in the edit form.
    if (savedEntry.sessionId) {
      const s = data.sessions.find((x) => x.id === savedEntry.sessionId);
      if (s && sheet.sessionDraft) {
        Object.assign(s, sheet.sessionDraft, { editedAt: nowIso() });
      }
    } else if (sheet.sessionOpen && sheet.sessionDraft) {
      const d = sheet.sessionDraft;
      if (d.activity || d.durationBucket || d.intensity) {
        const s = {
          id: uid("s_"), occurredOn: savedEntry.occurredOn,
          createdAt: nowIso(), editedAt: null,
          activity: d.activity, durationBucket: d.durationBucket, intensity: d.intensity,
        };
        data.sessions.push(s);
        savedEntry.sessionId = s.id;
      }
    }
  }

  // A day cannot be both: a niggle on a day silently removes its clear marker.
  data.entries = data.entries.filter(
    (e) => !(e.kind === "clear" && e.occurredOn === savedEntry.occurredOn)
  );

  persist();
  ui.sheet = null;
  if (savedEntry.occurredOn === todayStr()) ui.popToday = true;

  // The session prompt appears only when a niggle is saved with a context
  // including after_activity, and only if that entry has no session yet.
  // Failing that, a next_morning niggle with a session logged yesterday
  // gets the one-tap link prompt instead; the two never stack.
  if (mode === "create" && savedEntry.contexts.includes("after_activity") && !savedEntry.sessionId) {
    ui.sheet = {
      type: "session-prompt", entryId: savedEntry.id,
      draft: { activity: null, durationBucket: null, intensity: null },
    };
  } else if (mode === "create" && savedEntry.contexts.includes("next_morning") && !savedEntry.sessionId) {
    const s = engine.sessionOnDay(data.sessions, engine.addDays(savedEntry.occurredOn, -1));
    if (s) ui.sheet = { type: "link-prompt", entryId: savedEntry.id, sessionId: s.id };
  }
  render();
}

// ------------------------------------------------------- session prompt

function sessionPromptSheet(sheet) {
  const panel = el("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": "Was this after a session?" });
  panel.append(
    el("h2", { text: "Was this after a session?" }),
    el("p", { class: "detail-sub", style: "margin-bottom: 0.9rem", text: "Three taps, or skip. You can add it later from the entry." }),
    sessionChipRows(sheet.draft),
    el("div", { class: "sheet-footer" },
      el("button", {
        class: "btn primary", type: "button", text: "Add",
        onclick: () => {
          const d = sheet.draft;
          const entry = data.entries.find((x) => x.id === sheet.entryId);
          if (entry && (d.activity || d.durationBucket || d.intensity)) {
            const s = {
              id: uid("s_"), occurredOn: entry.occurredOn,
              createdAt: nowIso(), editedAt: null,
              activity: d.activity, durationBucket: d.durationBucket, intensity: d.intensity,
            };
            data.sessions.push(s);
            entry.sessionId = s.id;
            persist();
          }
          closeSheet();
        },
      }),
      el("button", { class: "btn ghost", type: "button", text: "Skip", onclick: closeSheet })
    )
  );
  return panel;
}

// ------------------------------------------------ next-morning link prompt

function sessionSummary(s) {
  const bits = [];
  const act = ACTIVITIES.find((a) => a.key === s.activity);
  if (act) bits.push(act.label);
  const dur = DURATIONS.find((d) => d.key === s.durationBucket);
  if (dur) bits.push(dur.label.toLowerCase());
  const inten = INTENSITIES.find((i) => i.key === s.intensity);
  if (inten) bits.push(inten.label.toLowerCase());
  return bits.length > 0 ? bits.join(", ") : "a session";
}

function linkPromptSheet(sheet) {
  const s = data.sessions.find((x) => x.id === sheet.sessionId);
  // A back-dated entry links to the day before that entry, which is not
  // "yesterday"; the copy switches to the explicit date in that case.
  const wasYesterday = s && s.occurredOn === engine.addDays(todayStr(), -1);
  const title = wasYesterday
    ? "Was this from yesterday's session?"
    : "Was this from the session the day before?";
  const lead = !s ? "" : wasYesterday
    ? `Yesterday you logged ${sessionSummary(s)}. One tap links this entry to it.`
    : `On ${fmtDay(s.occurredOn, true)} you logged ${sessionSummary(s)}. One tap links this entry to it.`;
  const panel = el("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title });
  panel.append(
    el("h2", { text: title }),
    el("p", { class: "detail-sub", style: "margin-bottom: 0.9rem", text: lead }),
    el("div", { class: "sheet-footer" },
      el("button", {
        class: "btn primary", type: "button", text: "Link it",
        onclick: () => {
          const entry = data.entries.find((x) => x.id === sheet.entryId);
          if (entry && s) {
            entry.sessionId = s.id;
            persist();
          }
          closeSheet();
        },
      }),
      el("button", { class: "btn ghost", type: "button", text: "Skip", onclick: closeSheet })
    )
  );
  return panel;
}

// --------------------------------------------------- about and glossary

function aboutSheet() {
  const panel = el("div", { class: "sheet about", role: "dialog", "aria-modal": "true", "aria-label": "About" });
  panel.append(
    el("h2", { text: "About Niggle Log" }),
    el("p", {},
      el("strong", { text: "What this is for." }),
      "Logging small complaints that have not stopped you, so that a pattern across weeks is visible instead of forgettable."
    ),
    el("p", {},
      el("strong", { text: "What this is not." }),
      "This is not a diagnosis. It does not know what is wrong with you and it will not guess. It does not predict injuries. Most niggles resolve on their own, and a site that escalates for 10 days is usually a site that then settles down. What this tool can do is show you the record. What that record means is between you and someone qualified to look at you."
    ),
    el("p", {},
      el("strong", { text: "What the app watches for." }),
      "Two patterns, and at most one card at a time. A card appears on the Today view when a site is getting worse: niggles on 3 or more days in the last 14, the most recent within the last 5 days at severity 2 of 3 or higher, and the worst severity in the last 7 days higher than the worst in the 7 days before. A card also appears when a site will not go away: logged on 5 or more days in the last 14, at any severity, once at least 10 of those 14 days were observed. Getting worse outranks not going away. Dismissing a card keeps it away for 7 days, unless the site gets worse in the meantime. The Body view stays closed until 14 days have been observed, because frequencies from a thin record mislead."
    ),
    el("p", {},
      el("strong", { text: "Things this tool has nothing useful to say about." }),
      "Numbness or pins and needles. Pain that wakes you at night. Swelling, or a joint that gives way. Anything that arrived suddenly with a pop. Those are worth a conversation with a professional, and no amount of logging changes that."
    ),
    el("button", {
      class: "quiet-link", type: "button", text: "What do these words mean?",
      onclick: () => { ui.glossaryOpen = true; render(); },
    }),
    el("p", { class: "fine" },
      "Your data stays in this browser. It is stored in your browser and is readable by any page on this domain. It is not encrypted and it is not private from software running on this machine. Browsers can also clear this storage after a period of disuse, so the export file is the real home of the data."
    ),
    el("p", { class: "fine", text: "Niggle Log, version 1. Schema version 2." }),
    el("div", { class: "sheet-footer" },
      el("button", { class: "btn ghost", type: "button", text: "Close", onclick: closeSheet })
    )
  );
  return panel;
}

function glossarySheet() {
  const dl = (pairs) => {
    const list = el("dl", {});
    for (const [term, def] of pairs) {
      list.append(el("dt", { text: term }), el("dd", { text: def }));
    }
    return list;
  };
  return el("div", { class: "sheet glossary layer2", role: "dialog", "aria-modal": "true", "aria-label": "What these words mean" },
    el("h2", { text: "What these words mean" }),
    el("span", { class: "section-h", text: "Anatomy words" }),
    dl(GLOSSARY.anatomy),
    el("span", { class: "section-h", text: "Words this tool uses" }),
    dl(GLOSSARY.tool),
    el("div", { class: "sheet-footer" },
      el("button", {
        class: "btn ghost", type: "button", text: "Close",
        onclick: () => { ui.glossaryOpen = false; render(); },
      })
    )
  );
}

// ----------------------------------------------------------- dialogs

function dialogEl(dialog) {
  const box = el("div", { class: "dialog", role: "dialog", "aria-modal": "true" });
  const actions = el("div", { class: "dialog-actions" });

  const closeDialog = () => { ui.dialog = null; render(); };

  if (dialog.type === "delete-entry") {
    box.append(el("p", { text: "Delete this entry? This cannot be undone." }));
    actions.append(
      el("button", {
        class: "btn danger", type: "button", text: "Delete",
        onclick: () => {
          // Deleting a niggle does not delete its session.
          data.entries = data.entries.filter((e) => e.id !== dialog.id);
          persist();
          ui.dialog = null;
          ui.sheet = null;
          render();
        },
      }),
      el("button", { class: "btn", type: "button", text: "Keep", onclick: closeDialog })
    );
  } else if (dialog.type === "delete-session") {
    box.append(el("p", { text: "Delete this session? The entries logged with it stay." }));
    actions.append(
      el("button", {
        class: "btn danger", type: "button", text: "Delete",
        onclick: () => {
          const entry = data.entries.find((e) => e.id === dialog.entryId);
          const sessionId = entry ? entry.sessionId : null;
          if (sessionId) {
            // Deleting a session does not cascade; linked entries are unlinked.
            data.sessions = data.sessions.filter((s) => s.id !== sessionId);
            for (const e of data.entries) {
              if (e.sessionId === sessionId) e.sessionId = null;
            }
            persist();
          }
          if (ui.sheet && ui.sheet.type === "form") {
            ui.sheet.sessionDraft = null;
            ui.sheet.sessionOpen = false;
          }
          ui.dialog = null;
          render();
        },
      }),
      el("button", { class: "btn", type: "button", text: "Keep", onclick: closeDialog })
    );
  } else if (dialog.type === "remove-clear") {
    box.append(el("p", { text: `Remove the clear day marker for ${fmtDay(dialog.day, true)}? This cannot be undone.` }));
    actions.append(
      el("button", {
        class: "btn danger", type: "button", text: "Remove",
        onclick: () => {
          data.entries = data.entries.filter((e) => e.id !== dialog.id);
          persist();
          ui.dialog = null;
          render();
        },
      }),
      el("button", { class: "btn", type: "button", text: "Keep", onclick: closeDialog })
    );
  } else if (dialog.type === "import-choice") {
    const { state, dropped } = dialog;
    const counts = `This file holds ${state.entries.length} entries and ${state.sessions.length} sessions.`;
    const droppedNote = dropped > 0 ? ` ${dropped} invalid records in the file were skipped.` : "";
    box.append(
      el("p", { text: counts + droppedNote }),
      el("p", { class: "detail-sub", text: "Merge keeps what is here and adds the file (the file wins where both have the same entry). Replace discards what is here now and loads the file." })
    );
    actions.append(
      el("button", {
        class: "btn primary", type: "button", text: "Merge",
        onclick: () => {
          data = store.merge(data, dialog.state);
          persist();
          ui.dialog = null;
          render();
        },
      }),
      el("button", {
        class: "btn", type: "button", text: "Replace",
        onclick: () => {
          data = dialog.state;
          persist();
          ui.dialog = null;
          render();
        },
      }),
      el("button", { class: "btn ghost", type: "button", text: "Cancel", onclick: closeDialog })
    );
  } else if (dialog.type === "message") {
    box.append(el("p", { text: dialog.text }));
    actions.append(el("button", { class: "btn", type: "button", text: "Close", onclick: closeDialog }));
  }

  box.append(actions);
  return box;
}

// ----------------------------------------------------------- overlay

function renderOverlay() {
  const overlay = document.getElementById("overlay");
  // Sheets are rebuilt on every state change; keep their scroll position so
  // tapping a chip halfway down the form does not jump the user back to the top.
  const scrollPositions = new Map();
  overlay.querySelectorAll(".sheet").forEach((s) => {
    scrollPositions.set(s.classList.contains("layer2") ? "layer2" : "main", s.scrollTop);
  });
  overlay.replaceChildren();

  if (ui.sheet) {
    overlay.append(el("button", {
      class: "backdrop", type: "button", "aria-label": "Close",
      onclick: closeSheet,
    }));
    if (ui.sheet.type === "form") overlay.append(formSheet(ui.sheet));
    else if (ui.sheet.type === "session-prompt") overlay.append(sessionPromptSheet(ui.sheet));
    else if (ui.sheet.type === "link-prompt") overlay.append(linkPromptSheet(ui.sheet));
    else if (ui.sheet.type === "about") overlay.append(aboutSheet());
  }

  if (ui.glossaryOpen) {
    overlay.append(el("button", {
      class: "backdrop layer2", type: "button", "aria-label": "Close glossary",
      onclick: () => { ui.glossaryOpen = false; render(); },
    }));
    overlay.append(glossarySheet());
  }

  if (ui.dialog) {
    overlay.append(el("button", {
      class: "backdrop layer3", type: "button", "aria-label": "Close dialog",
      onclick: () => { ui.dialog = null; render(); },
    }));
    overlay.append(dialogEl(ui.dialog));
  }

  overlay.querySelectorAll(".sheet").forEach((s) => {
    const key = s.classList.contains("layer2") ? "layer2" : "main";
    if (scrollPositions.has(key)) s.scrollTop = scrollPositions.get(key);
  });
}

function renderBanner() {
  const banner = document.getElementById("banner");
  banner.replaceChildren();
  if (!ui.saveFailed) return;
  banner.append(
    el("div", { class: "save-banner", role: "alert" },
      el("p", { text: "That change was not saved. The browser refused the write, which can happen in private browsing or when storage is full. Export your data to keep it safe." }),
      el("button", {
        class: "btn small", type: "button", text: "Close",
        onclick: () => { ui.saveFailed = false; render(); },
      })
    )
  );
}

// ------------------------------------------------------ export / import

function doExport() {
  const payload = store.buildExport(data, nowIso());
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `niggle-log-export-${todayStr()}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  store.setLastExportAt(nowIso());
  render();
}

function doImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const result = store.parseImport(String(reader.result));
    if (!result.ok) {
      ui.dialog = { type: "message", text: result.error };
    } else {
      ui.dialog = { type: "import-choice", state: result.state, dropped: result.dropped };
    }
    render();
  };
  reader.onerror = () => {
    ui.dialog = { type: "message", text: "That file could not be read." };
    render();
  };
  reader.readAsText(file);
}

// -------------------------------------------------------------- wiring

document.querySelectorAll(".tab").forEach((t) => {
  t.addEventListener("click", () => {
    ui.tab = t.dataset.tab;
    ui.view = "tabs";
    render();
  });
});

document.getElementById("btn-about").addEventListener("click", () => {
  ui.sheet = { type: "about" };
  render();
});

document.getElementById("btn-export").addEventListener("click", doExport);

document.getElementById("btn-import").addEventListener("click", () => {
  document.getElementById("import-file").click();
});

document.getElementById("import-file").addEventListener("change", (ev) => {
  const file = ev.target.files[0];
  ev.target.value = "";
  if (file) doImport(file);
});

document.addEventListener("keydown", (ev) => {
  if (ev.key !== "Escape") return;
  if (ui.dialog) { ui.dialog = null; render(); }
  else if (ui.glossaryOpen) { ui.glossaryOpen = false; render(); }
  else if (ui.sheet) closeSheet();
});

render();
