# Niggle Log

A log for the small physical complaints that have not stopped you.

Most overuse injuries build for days or weeks before they stop anyone. People
usually feel that happening. What they lack is a cumulative register: a 1 of 3
twinge on Tuesday and a 2 of 3 twinge on Saturday do not feel like the same
event in memory, so the pattern is only obvious in hindsight.

This is that register. It records what you felt and where, and it points at
patterns across weeks. It describes; you conclude.

**[Open it here](https://evelinehansen.github.io/niggle-log/)**

## What it is not

It does not diagnose, predict, score your risk, or tell you what to do. It has
no idea what is wrong with you and does not guess. It is a notebook that can
count, and nothing it shows you is a medical opinion.

## What it does

- **Log a niggle** with a body site, a severity, and one or more contexts for
  when you felt it. A sensation and a note are optional.
- **Log a clear day** when you checked and there was nothing to report.
- **Back-date an entry** you forgot, and edit or delete anything later.
- **Recent-site chips** put the places you have logged lately within one tap.
- **Today, Log, and Body views** for what is current, the full history, and the
  view by body site.
- **A timeline per site**, so one knee has its own story rather than being
  buried in the general list.
- **A glossary** of every term the tool uses, in plain words.
- **Export and import** everything as a single JSON file, with a choice to merge
  or replace.

## The model

An entry is either a **niggle** or a **clear day**. Clear days are real data:
they are how the tool tells the difference between no pain and no logging, and
they are the honest denominator behind every count it shows you.

A **site** is a region, a subsite, and a side: `knee:anterior:left`. Left and
right are never merged and the side is never filled in for you. There is
deliberately no "Other" region, because an escape hatch would slowly destroy the
vocabulary that makes the counts mean anything.

**Severity is behavioural, not a pain scale.** 1 of 3 is noticed, and you
changed nothing. 2 of 3 is adapted, and you changed something. 3 of 3 is
stopped, and it ended the activity. What you did about it stays stable across
months in a way that a 10-point scale does not.

After an entry that mentions activity, the tool asks three quick taps about the
session. Nothing in the tool uses that yet. It is collected now because any
pattern linking niggles to training load needs months of history behind it, and
history cannot be gathered retroactively.

## When the tool speaks up

Two rules, both chosen to fire rarely, both worked out fresh every time the page
renders and never stored.

**Escalation** looks at one site over 14 days and fires only when all four of
these hold: you logged niggles there on at least 3 separate days, the most
recent one was within the last 5 days, that most recent one was severity 2 or 3,
and the worst of the last 7 days is worse than the worst of the 7 before it.

**Persistence** looks at the same 14 days and fires when the window is
trustworthy (at least 10 of the 14 days were observed) and you logged the site
on at least 5 separate days at any severity.

Only one flag shows at a time, escalation before persistence. Dismissing it
quiets that site and rule for a week, except that it comes straight back if the
severity climbs above what it was when you dismissed it. The flag states facts
and nothing else: no risk numbers, no verdicts, no advice.

The flag card is also the one thing in the tool with no animation. Drama is
precisely what a health flag must not have, and the moment the tool exists for
is the moment it should be quietest.

## Why the Body view sometimes shows nothing

It refuses to show frequency numbers until it has 14 observed days behind them.
"Left knee, 6 times" means nothing without knowing how many days you were
actually looking, and a number built on four days of logging would be worse than
no number. Below the threshold it shows how close you are to it, and nothing
else.

## Running it

Open it at [the link above](https://evelinehansen.github.io/niggle-log/). There
is nothing to install, no build step, and no account. It works offline once
loaded.

On an iPhone, open it in Safari and use Share, then Add to Home Screen. That
gives it its own icon and, importantly, stops Safari clearing your log after a
week of not opening it.

If you clone the repo instead, the scripts are ES modules, so serve the folder
over HTTP rather than opening `index.html` from the file system:

```
python3 -m http.server 8000
```

## Where your data lives

Everything is stored in your own browser, on your own device. There is no
server, no account, and no analytics. Nothing you type is sent anywhere, and the
page makes no network requests at all once it has loaded. This matters more here
than in most tools: a record of your own body is nobody else's business, and the
simplest way to keep it that way is for it never to leave your device.

That also means nobody else is keeping a copy for you:

- **Browsers clear their own storage.** Safari in particular clears data for
  sites you have not opened in about a week, and a log you only open when
  something twinges is exactly the usage pattern that triggers it. Adding it to
  your home screen prevents this; using it as an ordinary bookmarked page does
  not.
- **Export is the real backup.** The header always shows when you last exported.
  The export is a single JSON file you can keep anywhere and import back later,
  and importing checks the file and offers to merge with what is already there
  or replace it.
- **Browser storage is not private.** Anything stored this way can be read by
  other pages served from the same address, and by software running on your
  device. It is not encrypted. Do not keep passwords or anything sensitive in
  here.

## How it's built

Plain HTML, CSS, and JavaScript. No frameworks, no build step, and no packages
pulled in from anywhere else, so the files in this repo are the whole tool: what
you can read here is what runs in your browser. There is nothing to sign in to
and no API keys or hidden configuration.

Two files are worth knowing about. `taxonomy.js` holds the body-site vocabulary
and the glossary text, so the words the tool uses are all in one readable place.
`engine.js` holds every rule as pure functions with no access to the page and no
access to the clock: today's date is always handed to it, which is what makes
the detection rules testable without waiting two weeks.

## Credits

Idea and direction by Eveline, coding by Claude. Built for my own practice,
learning and use.

Personal project, shared as is.

