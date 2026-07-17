# Niggle Log

A static, local-first web tool for logging small physical complaints that have not stopped you, so that a pattern across weeks becomes visible instead of forgettable. Part of the DecisionBuilder / Skill Tree family of tools and built to `FAMILY-CHARTER.md` v1.0.

Most overuse injuries have a prodromal phase of days to weeks. People feel it. What they lack is a cumulative register: a 1 of 3 twinge on Tuesday and a 2 of 3 twinge on Saturday do not feel like the same event in memory. This tool is that register. It records, and it points at patterns. It does not diagnose, predict, score risk, or advise. The tool describes; the user concludes.

## Files

Vanilla HTML, CSS and JavaScript as ES modules. No frameworks, no build step, no npm, no network requests at runtime.

| File | Role |
|---|---|
| `index.html` | The shell: header, tabs, containers. |
| `styles.css` | Family design tokens plus this tool's components. |
| `app.js` | All DOM work: views, forms, dialogs, export and import. |
| `engine.js` | Pure functions only, no DOM. All derivation and detection. `today` is always injected as a string, never read from the clock, which is what makes it testable. |
| `storage.js` | localStorage load and save, validation, merge, backup age. |
| `taxonomy.js` | The controlled body-site vocabulary, the other enums, and the glossary text. |

## The model

An entry is either a **niggle** (site, severity, one or more contexts for when it was felt, optional sensation and note) or a **clear day** (you checked, nothing to report). Clear days are data: they are how the tool tells the difference between no pain and no logging, and they are the honest denominator behind every count.

A **site** is `region:subsite:side`, for example `knee:anterior:left`. Left and right are never merged. Side is never auto-defaulted. There is deliberately no "Other" region: an escape hatch destroys a controlled vocabulary.

**Severity** is behavioural, not a pain scale: 1 of 3 noticed (you changed nothing), 2 of 3 adapted (you changed something), 3 of 3 stopped (it ended the activity). Behaviour is stable across months in a way a 10-point scale is not.

**Sessions** are only ever collected through a three-tap prompt after saving an entry whose contexts include "after activity", plus a one-tap prompt that links a "next morning" entry to a session logged the day before, when one exists. Nothing uses them in v1; they exist because the load-coupling rule planned for v3 needs months of history that cannot be collected retroactively.

## The detection rules (Escalation and Persistence)

Two rules, chosen to fire rarely, computed fresh on every render and never stored.

**Escalation** (a site getting worse). For one site over a 14-day window, it fires when all four hold:

1. Niggles on at least 3 distinct days in the window.
2. The most recent entry falls within the last 5 days.
3. The most recent entry is severity 2 or 3.
4. Max severity in the last 7 days is strictly greater than max severity in the prior 7 days (an empty half counts as 0, so a rapid onset fires).

**Persistence** (a site that will not go away). For one site over the same 14-day window, it fires when both hold:

1. At least 10 of the 14 days are observed, so the window is trustworthy.
2. Niggles at the site on at least 5 distinct days, at any severity.

Next-morning days are not weighted into the threshold; the flag copy states how many of the logged days were already present on waking, and the reader concludes.

At most one flag is active at a time, ranked escalation before persistence, then by latest severity, recency, distinct days, and site key so the card never flickers. Dismissing it ("Not now") suppresses that site and rule for 7 days, except that the flag re-fires immediately if severity climbs above what it was at dismissal. The flag states facts only: no risk numbers, no verdicts, no advice.

A design note worth keeping: the flag card gets no animation. The one signature animation in this tool is the mark dropping into the last-7-days strip. Drama is precisely what a health flag must not have; the moment the tool exists for is the moment it must be quietest.

The spec's alert budget of "no more than one new flag per week" is treated as design intent rather than a stored mechanism: flags are derived values and the single-flag maximum plus the 7-day dismissal cooldown deliver it by construction.

## Coverage gate

The Body view refuses to show frequency numbers below 14 observed days in its 90-day window, because "left knee, 6 times" is meaningless without knowing how many days were observed at all. Below the gate it shows progress toward 14, nothing else.

## Data, storage, privacy

- Everything lives in one localStorage key, **`niggle-log:v1`**. Device-only state (when this browser last exported) lives in `niggle-log:backup` and never appears in an export.
- This data is stored in your browser and is readable by any page on this domain. It is not encrypted and it is not private from software running on this machine.
- localStorage is evictable. Safari clears it after roughly 7 days of disuse, and a tool used sporadically for months is exactly this tool's usage pattern. **The export file is the real home of the data.** The header shows the standing nudge "Last backup: never / X days ago".
- Import checks `schemaVersion`, validates every record, and offers merge or replace. Merge matches on id, the incoming file wins on conflict, and the result is the union of both sets.

## Verifying the engine

`engine.js` has no DOM and no clock, so any Node (v22 or newer) can exercise it. The escalation rule was verified against the 12-row truth table in the PRD (section 16); the same fixtures can be re-run by importing `detectEscalation` and calling it with hand-built entries and an injected `today` string.

## Versions

- **v1 (this)**: the log. Taxonomy, recent-site chips, clear days, back-dating, edit and delete, the after-activity session prompt, glossary, Today / Log / Body views, site detail timeline, escalation rule, coverage gate, export and import.
- **v2**: the SVG body map (input and heatmap), persistence rule with morning-after weighting, linking next-morning entries to yesterday's session, print stylesheet for sharing with a physio.
- **v3**: kinetic-chain adjacency, migration rule, load coupling.
