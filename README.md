# Cafe Roster Builder

Build a weekly cafe roster: add staff, set availability, fill shifts, and have
breaks, the weekly hours cap, and barista coverage checked automatically.

Vite + React 19 + TypeScript. State persists to `localStorage` — no backend.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check (tsc -b) + production build to dist/
npm run preview   # serve the production build
npm run lint
```

## What it does

- **Team management** — add/remove staff, mark baristas, set per-day availability.
- **Editable shift times** — every shift start/end can be edited in the UI.
- **Week grid** — every shift for every day, filled from a dropdown of staff.
- **Auto break calculation** — paid hours per shift, break deducted per the rule below.
- **Live validation:**
  - Barista group missing a barista (red/green chip per day).
  - Same person double-booked on the same day (red highlight).
  - Anyone over the 38h cap (red bar + "over cap" chip).
  - Person assigned on a day they're marked off (amber warning).
- **Availability removes assignments** — unticking a day pulls that person off
  that day's shifts and leaves the slot empty (deliberately does *not* auto-swap).
- **Sample team + auto-fill** — loads 8 named staff and fills a valid week
  (guarantees a barista per group, spreads hours, no double-booking). Greedy heuristic.
- **Weekly hours summary** — paid hours per person against the cap.
- **Export** — copy as text, download CSV, export/import full setup as JSON.
- **Persistence** — everything is saved to `localStorage` (debounced) and restored on load.

## Domain rules

The hard-won knowledge — the rest is just code.

### Daily headcount
- **Weekday (Mon–Fri) & Saturday:** 5 staff — 2 openers, 3 closers.
- **Sunday:** 4 staff — 2 openers, 2 closers.

### Break rule
- Shift **over 5h** → 30 min unpaid break.
- Shift **over 8h** → another 30 min (1h total).
- Exactly 5h takes no break — "over" is strict.

### Barista coverage (group rule, not per-shift)
At least one person in the *group* must be a barista (doesn't matter which):
- **Openers** (both opener shifts) → ≥1 barista.
- **Floor + machine close** → ≥1 barista.
- Front close and Sunday closers have no barista requirement.

### Hard cap
- No one works **over 38h** per week (paid hours, after breaks).

## Project structure

```
src/
  types.ts               domain types (Staff, Assignments, Templates, …)
  data.ts                DAYS, templates, barista groups, sample team, helpers
  theme.ts               design tokens (T)
  storage.ts             localStorage wrapper (get/set/delete) + availability probe
  lib/
    time.ts              toMin, fmt, breakMins, shiftMath, round
    roster.ts            buildSampleWeek — the greedy assigner
  components/
    ui.tsx               Chip, Dot, Section
    styles.ts            shared inline-style atoms
    RosterBuilder.tsx    the app
  App.tsx, main.tsx, index.css
```

**Data model:**

```ts
Staff       = { id, name, barista: boolean, avail: Record<Day, boolean> }
Assignments = { [day]: { [shiftId]: staffId | null } }
Templates   = { wk: {...}, sun: {...} }   // each with a positions[] array
```

A position's `baristaGroup` string ties it to others that share the requirement.

## Roadmap / known gaps

- **No pay rates / labour cost.** Hours are the foundation; cost is the next layer.
- **No Australian payroll reality** — weekend penalty rates, public holiday loading,
  casual vs part-time, minimum shift lengths. Needed before a cost figure is *true*.
- **Auto-fill is a greedy heuristic, not optimisation.** Fine at cafe scale; see
  `buildSampleWeek` if you want to close the gap to mathematically optimal.
- **No replacement suggestions** — gaps are flagged but not filled.
- **Whole-day availability only** — no "mornings only", split shifts, or swaps.
- **The real test:** run a real week beside how the roster is built by hand today and
  close the gaps. The greedy "spread hours evenly" default doesn't know who's trusted
  on a solo close or who pairs well on a busy morning — capturing enough of that
  judgment that the roster needs no manual rework is the actual work.
