/* ---------- domain types ---------- */

export type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

/** Mon–Sat share one shift template ("wk"); Sunday is its own ("sun"). */
export type TemplateKey = "wk" | "sun";

export type ShiftKind = "open" | "close";

/** A single shift slot within a day's template. */
export interface Position {
  id: string;
  name: string;
  /** "HH:MM" 24h */
  start: string;
  /** "HH:MM" 24h */
  end: string;
  kind: ShiftKind;
  /**
   * Positions sharing a non-null group value must collectively contain
   * at least one assigned barista. `null` = no barista requirement.
   */
  baristaGroup: string | null;
  /** Start/end time is an assumption the user should confirm. */
  guess?: boolean;
}

export interface Template {
  label: string;
  positions: Position[];
}

export type Templates = Record<TemplateKey, Template>;

export interface Staff {
  id: string;
  name: string;
  barista: boolean;
  avail: Record<Day, boolean>;
}

/** assign[day][positionId] = staffId | null (unfilled). */
export type Assignments = Record<string, Record<string, string | null>>;

/** Shape persisted to / restored from storage. */
export interface StoredState {
  staff?: Staff[];
  assign?: Assignments;
  templates?: Templates;
}
