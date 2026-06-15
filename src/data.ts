import type { Day, TemplateKey, Templates } from "./types";

/* ---------- domain data ---------- */

export const DAYS: readonly Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Mon–Sat map to the weekday template; Sunday has its own. */
export const DAY_TEMPLATE: Record<Day, TemplateKey> = {
  Mon: "wk", Tue: "wk", Wed: "wk", Thu: "wk", Fri: "wk", Sat: "wk", Sun: "sun",
};

/** Build a per-day availability map, defaulting on except listed `off` days. */
export const availFrom = (off: Day[] = []): Record<Day, boolean> =>
  Object.fromEntries(DAYS.map((d) => [d, !off.includes(d)])) as Record<Day, boolean>;

/** All days set to the same value. */
export const allDays = (val: boolean): Record<Day, boolean> =>
  Object.fromEntries(DAYS.map((d) => [d, val])) as Record<Day, boolean>;

// baristaGroup: positions sharing a value require >=1 assigned barista among them.
export const DEFAULT_TEMPLATES: Templates = {
  wk: {
    label: "Weekday & Saturday",
    positions: [
      { id: "wk-open1", name: "Opener 1", start: "05:45", end: "13:00", kind: "open", baristaGroup: "wk-open", guess: true },
      { id: "wk-open2", name: "Opener 2", start: "05:45", end: "12:00", kind: "open", baristaGroup: "wk-open", guess: true },
      { id: "wk-close-front", name: "Close · front", start: "08:00", end: "15:00", kind: "close", baristaGroup: null },
      { id: "wk-close-floor", name: "Close · floor", start: "09:00", end: "16:00", kind: "close", baristaGroup: "wk-closeMF" },
      { id: "wk-close-machine", name: "Close · machine", start: "09:30", end: "16:00", kind: "close", baristaGroup: "wk-closeMF" },
    ],
  },
  sun: {
    label: "Sunday",
    positions: [
      { id: "sun-open1", name: "Opener 1", start: "07:45", end: "14:00", kind: "open", baristaGroup: "sun-open" },
      { id: "sun-open2", name: "Opener 2", start: "07:45", end: "12:00", kind: "open", baristaGroup: "sun-open" },
      { id: "sun-close-front", name: "Close · front", start: "08:30", end: "15:00", kind: "close", baristaGroup: null },
      { id: "sun-close-floor", name: "Close · floor", start: "10:00", end: "15:00", kind: "close", baristaGroup: null },
    ],
  },
};

export const BARISTA_GROUP_LABEL: Record<string, string> = {
  "wk-open": "Openers",
  "wk-closeMF": "Floor + machine close",
  "sun-open": "Openers",
};

export const WEEK_CAP = 38;

/* ---------- sample team ---------- */
export interface SampleName {
  n: string;
  b: boolean;
  off?: Day[];
}

export const SAMPLE_NAMES: SampleName[] = [
  { n: "Mia", b: true },
  { n: "Jack", b: true },
  { n: "Ella", b: true },
  { n: "Noah", b: true },
  { n: "Zoe", b: false },
  { n: "Liam", b: false, off: ["Sun"] },
  { n: "Ava", b: false, off: ["Wed"] },
  { n: "Tom", b: false },
];
