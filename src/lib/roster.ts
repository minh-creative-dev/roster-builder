import type { Assignments, Day, Position, Staff, Templates } from "../types";
import { DAYS, DAY_TEMPLATE } from "../data";
import { shiftMath } from "./time";

/**
 * Greedy assigner: guarantees a barista in each required group,
 * spreads hours by always picking the lowest-loaded available person,
 * and never double-books anyone on the same day.
 */
export function buildSampleWeek(team: Staff[], templates: Templates): Assignments {
  const assign: Assignments = {};
  const hours: Record<string, number> = Object.fromEntries(team.map((s) => [s.id, 0]));
  const paid = (p: Position) => shiftMath(p.start, p.end).paid;

  const pick = (pool: Staff[], day: Day, used: Set<string>): Staff | null =>
    pool
      .filter((s) => s.avail[day] && !used.has(s.id))
      .sort((a, b) => hours[a.id] - hours[b.id])[0] || null;

  for (const day of DAYS) {
    assign[day] = {};
    const used = new Set<string>();
    const tpl = templates[DAY_TEMPLATE[day]];
    const groups: Record<string, Position[]> = {};
    for (const pos of tpl.positions) {
      if (pos.baristaGroup) (groups[pos.baristaGroup] = groups[pos.baristaGroup] || []).push(pos);
    }

    // 1) put a barista in each group that needs one
    for (const g of Object.keys(groups)) {
      const b = pick(team.filter((s) => s.barista), day, used);
      if (b) {
        const slot = groups[g][0];
        assign[day][slot.id] = b.id;
        used.add(b.id);
        hours[b.id] += paid(slot);
      }
    }
    // 2) fill everything else with the least-loaded available person
    for (const pos of tpl.positions) {
      if (assign[day][pos.id]) continue;
      const who = pick(team, day, used);
      if (who) {
        assign[day][pos.id] = who.id;
        used.add(who.id);
        hours[who.id] += paid(pos);
      } else {
        assign[day][pos.id] = null;
      }
    }
  }
  return assign;
}
