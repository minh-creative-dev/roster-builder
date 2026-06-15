import { useState, useEffect, useMemo, useCallback } from "react";
import type { Assignments, Day, Staff, StoredState, TemplateKey } from "../types";
import {
  DAYS, DAY_TEMPLATE, DEFAULT_TEMPLATES, BARISTA_GROUP_LABEL, WEEK_CAP,
  SAMPLE_NAMES, availFrom, allDays,
} from "../data";
import { T } from "../theme";
import { fmt, round, shiftMath, shiftCompact } from "../lib/time";
import { buildSampleWeek } from "../lib/roster";
import { hasStore, storage } from "../storage";
import { Chip, Dot, DayToggle, Section } from "./ui";
import {
  thS, tdS, inputS, timeS, selectS, dayCard, miniErr, miniWarn,
  btnSolid, btnGhost, linkBtn, gridHead, gridName, gridCell,
} from "./styles";

/* ---------- persistence ---------- */
const STORE_KEY = "roster-v1-state";

/** Five blank staff rows, first two pre-marked as baristas. */
const seedStaff = (): Staff[] =>
  Array.from({ length: 5 }, (_, i) => ({
    id: `s${i}_${Date.now()}`,
    name: "",
    barista: i < 2,
    avail: allDays(true),
  }));

/** Restore persisted state once, falling back to a fresh seeded week. */
function loadInitial(): Required<StoredState> {
  if (hasStore) {
    try {
      const r = storage.get(STORE_KEY);
      if (r && r.value) {
        const p = JSON.parse(r.value) as StoredState;
        return {
          staff: p.staff ?? seedStaff(),
          assign: p.assign ?? {},
          templates: p.templates ?? DEFAULT_TEMPLATES,
        };
      }
    } catch {
      /* fall through to seed */
    }
  }
  return { staff: seedStaff(), assign: {}, templates: DEFAULT_TEMPLATES };
}

/* ---------- main ---------- */
export default function RosterBuilder() {
  // Storage is synchronous, so seed state directly — no load effect / flash needed.
  const [boot] = useState(loadInitial);
  const [staff, setStaff] = useState<Staff[]>(boot.staff);
  const [assign, setAssign] = useState<Assignments>(boot.assign);
  const [templates, setTemplates] = useState(boot.templates);
  const [showShiftEditor, setShowShiftEditor] = useState(false);
  const [toast, setToast] = useState("");

  /* save on change (debounced) */
  useEffect(() => {
    if (!hasStore) return;
    const id = setTimeout(() => {
      storage.set(STORE_KEY, JSON.stringify({ staff, assign, templates }));
    }, 400);
    return () => clearTimeout(id);
  }, [staff, assign, templates]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 1800);
  };

  const loadSample = () => {
    const team: Staff[] = SAMPLE_NAMES.map((p, i) => ({
      id: "samp" + i,
      name: p.n,
      barista: !!p.b,
      avail: availFrom(p.off),
    }));
    setStaff(team);
    setAssign(buildSampleWeek(team, templates));
    flash("Sample team & week loaded");
  };

  const resetAll = () => {
    if (hasStore) storage.delete(STORE_KEY);
    setTemplates(DEFAULT_TEMPLATES);
    setAssign({});
    setStaff(seedStaff());
    flash("Reset to a clean slate");
  };

  /* ---- staff ops ---- */
  const addStaff = () =>
    setStaff((s) => [...s, {
      id: "s_" + Date.now(), name: "", barista: false, avail: allDays(true),
    }]);

  const removeStaff = (id: string) => {
    setStaff((s) => s.filter((x) => x.id !== id));
    setAssign((a) => {
      const n: Assignments = JSON.parse(JSON.stringify(a));
      for (const d of Object.keys(n)) for (const p of Object.keys(n[d]))
        if (n[d][p] === id) n[d][p] = null;
      return n;
    });
  };

  const patchStaff = (id: string, patch: Partial<Staff>) =>
    setStaff((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const toggleAvail = (id: string, day: Day) => {
    const cur = staff.find((x) => x.id === id);
    if (!cur) return;
    const nowAvail = !cur.avail[day];
    setStaff((s) => s.map((x) => x.id === id
      ? { ...x, avail: { ...x.avail, [day]: nowAvail } } : x));
    // marking someone off a day removes them from any shift they hold that day
    if (!nowAvail) {
      setAssign((a) => {
        if (!a[day]) return a;
        const dayMap = { ...a[day] };
        let changed = false;
        for (const k of Object.keys(dayMap))
          if (dayMap[k] === id) { dayMap[k] = null; changed = true; }
        return changed ? { ...a, [day]: dayMap } : a;
      });
    }
  };

  const setCell = (day: Day, posId: string, staffId: string) =>
    setAssign((a) => ({ ...a, [day]: { ...(a[day] || {}), [posId]: staffId || null } }));

  const staffById = useMemo(
    () => Object.fromEntries(staff.map((s) => [s.id, s])) as Record<string, Staff>,
    [staff],
  );

  /* ---- weekly hours per staff ---- */
  const weeklyHours = useMemo(() => {
    const h: Record<string, number> = Object.fromEntries(staff.map((s) => [s.id, 0]));
    for (const day of DAYS) {
      const tpl = templates[DAY_TEMPLATE[day]];
      for (const pos of tpl.positions) {
        const who = assign[day]?.[pos.id];
        if (who && h[who] != null) h[who] += shiftMath(pos.start, pos.end).paid;
      }
    }
    return h;
  }, [staff, assign, templates]);

  /* ---- staff × day grid (live review + CSV source) ---- */
  const rosterGrid = useMemo(
    () =>
      staff.map((s) => ({
        staff: s,
        cells: DAYS.map((day) => {
          const tpl = templates[DAY_TEMPLATE[day]];
          const mine = tpl.positions.filter((p) => assign[day]?.[p.id] === s.id);
          if (mine.length === 0) {
            return { text: s.avail[day] ? "" : "N/A", off: !s.avail[day], clash: false };
          }
          return {
            text: mine.map((p) => shiftCompact(p.start, p.end)).join(" / "),
            off: false,
            clash: mine.length > 1,
          };
        }),
      })),
    [staff, assign, templates],
  );

  /* ---- per-day issues ---- */
  const dayIssues = useCallback((day: Day) => {
    const tpl = templates[DAY_TEMPLATE[day]];
    const seen: Record<string, string> = {};
    const dbl = new Set<string>();
    for (const pos of tpl.positions) {
      const who = assign[day]?.[pos.id];
      if (!who) continue;
      if (seen[who]) { dbl.add(who); } else seen[who] = pos.id;
    }
    // barista groups
    const groups: Record<string, { any: boolean; ok: boolean }> = {};
    for (const pos of tpl.positions) {
      if (!pos.baristaGroup) continue;
      groups[pos.baristaGroup] = groups[pos.baristaGroup] || { any: false, ok: false };
      const who = assign[day]?.[pos.id];
      if (who) {
        groups[pos.baristaGroup].any = true;
        if (staffById[who]?.barista) groups[pos.baristaGroup].ok = true;
      }
    }
    return { dbl, groups };
  }, [assign, templates, staffById]);

  /* ---- export ---- */
  const rosterText = useCallback(() => {
    let out = "ROSTER\n";
    for (const day of DAYS) {
      const tpl = templates[DAY_TEMPLATE[day]];
      out += `\n${day}\n`;
      for (const pos of tpl.positions) {
        const who = assign[day]?.[pos.id];
        const nm = who ? (staffById[who]?.name || "?") : "— unfilled —";
        out += `  ${fmt(pos.start)}–${fmt(pos.end)}  ${pos.name.padEnd(16)}  ${nm}\n`;
      }
    }
    out += "\nWeekly hours\n";
    for (const s of staff) out += `  ${(s.name || "(unnamed)").padEnd(16)} ${round(weeklyHours[s.id] || 0)}h\n`;
    return out;
  }, [assign, templates, staff, staffById, weeklyHours]);

  const copyText = async () => {
    try { await navigator.clipboard.writeText(rosterText()); flash("Roster copied"); }
    catch { flash("Copy failed — select & copy manually"); }
  };

  const download = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  // CSV mirrors the live grid above: a row per person, a column per day.
  const csvRows = useCallback((): string[][] => {
    const header = ["Name", ...DAYS];
    const body = rosterGrid.map(({ staff: s, cells }) =>
      [s.name || "(unnamed)", ...cells.map((c) => c.text)]);
    return [header, ...body];
  }, [rosterGrid]);

  const downloadCSV = () => {
    const rows = csvRows();
    download("roster.csv", rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n"), "text/csv");
    flash("CSV downloaded");
  };

  const exportSetup = () =>
    download("roster-setup.json", JSON.stringify({ staff, assign, templates }, null, 2), "application/json");

  const importSetup = () => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".json";
    inp.onchange = () => {
      const f = inp.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const p = JSON.parse(r.result as string) as StoredState;
          if (p.staff) setStaff(p.staff);
          if (p.assign) setAssign(p.assign);
          if (p.templates) setTemplates(p.templates);
          flash("Setup imported");
        } catch { flash("Could not read that file"); }
      };
      r.readAsText(f);
    };
    inp.click();
  };

  const editShiftTime = (tplKey: TemplateKey, posId: string, field: "start" | "end", val: string) =>
    setTemplates((t) => ({
      ...t,
      [tplKey]: {
        ...t[tplKey],
        positions: t[tplKey].positions.map((p) =>
          p.id === posId ? { ...p, [field]: val, guess: false } : p),
      },
    }));

  /* ---------- render ---------- */
  return (
    <div style={{ background: T.bg, minHeight: "100%", fontFamily: T.sans, color: T.ink, padding: "20px 16px 60px", textAlign: "left" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>

        {/* header */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.barista, letterSpacing: 1, fontWeight: 600 }}>
            CAFE ROSTER · v1
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "4px 0 2px", letterSpacing: -0.4 }}>
            Weekly roster builder
          </h1>
          <p style={{ color: T.muted, fontSize: 14, margin: 0, maxWidth: 620 }}>
            Add your team, set who can work which days, then fill each shift. Breaks and the {WEEK_CAP}h cap are
            worked out automatically. A <Dot />marks a barista.
          </p>
        </div>

        {/* STAFF */}
        <Section
          title="Your team"
          sub="Mark baristas and untick any days a person can't work."
          right={<button onClick={loadSample} style={btnGhost}>Fill with sample team</button>}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={thS}>Name</th>
                  <th style={{ ...thS, textAlign: "center" }}>Barista</th>
                  {DAYS.map((d) => <th key={d} style={{ ...thS, textAlign: "center", width: 44 }}>{d}</th>)}
                  <th style={thS}></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                    <td style={tdS}>
                      <input value={s.name} placeholder="Name"
                        onChange={(e) => patchStaff(s.id, { name: e.target.value })}
                        style={inputS} />
                    </td>
                    <td style={{ ...tdS, textAlign: "center" }}>
                      <input type="checkbox" checked={s.barista}
                        onChange={(e) => patchStaff(s.id, { barista: e.target.checked })}
                        style={{ accentColor: T.barista, width: 16, height: 16 }} />
                    </td>
                    {DAYS.map((d) => (
                      <td key={d} style={{ ...tdS, textAlign: "center" }}>
                        <DayToggle
                          on={!!s.avail[d]}
                          onToggle={() => toggleAvail(s.id, d)}
                          label={`${s.name || "This person"} ${s.avail[d] ? "works" : "off"} ${d}`}
                        />
                      </td>
                    ))}
                    <td style={{ ...tdS, textAlign: "right" }}>
                      <button onClick={() => removeStaff(s.id)} style={linkBtn}>remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={addStaff} style={btnGhost}>+ Add person</button>
        </Section>

        {/* SHIFT EDITOR (collapsible) */}
        <Section
          title="Shift times"
          sub="These match what you gave me. Weekday opening times were the one thing you didn't specify — they're a guess, edit them here."
          right={
            <button onClick={() => setShowShiftEditor((v) => !v)} style={btnGhost}>
              {showShiftEditor ? "Hide" : "Edit times"}
            </button>
          }
        >
          {showShiftEditor ? (
            <div style={{ display: "grid", gap: 18 }}>
              {(["wk", "sun"] as const).map((k) => (
                <div key={k}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: T.muted }}>
                    {templates[k].label}
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {templates[k].positions.map((p) => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ width: 130, fontSize: 13 }}>{p.name}</span>
                        <input type="time" value={p.start}
                          onChange={(e) => editShiftTime(k, p.id, "start", e.target.value)}
                          style={timeS} />
                        <span style={{ color: T.faint }}>→</span>
                        <input type="time" value={p.end}
                          onChange={(e) => editShiftTime(k, p.id, "end", e.target.value)}
                          style={timeS} />
                        {p.guess && <Chip tone="warn">guess · confirm</Chip>}
                        {p.baristaGroup && <Chip tone="muted">barista group</Chip>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: T.faint, fontSize: 13 }}>
              Weekday & Saturday: 2 openers, 3 closers (front / floor / machine). Sunday: 2 openers, 2 closers.
            </p>
          )}
        </Section>

        {/* ROSTER GRID */}
        <Section title="The week" sub="Pick who works each shift. Watch the badges — they flag a missing barista, a clash, or anyone over the cap.">
          <div style={{ display: "grid", gap: 12 }}>
            {DAYS.map((day) => {
              const tpl = templates[DAY_TEMPLATE[day]];
              const { dbl, groups } = dayIssues(day);
              return (
                <div key={day} style={dayCard}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{day}</span>
                      <span style={{ color: T.faint, fontSize: 12 }}>{tpl.label}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Object.entries(groups).map(([g, st]) => (
                        <Chip key={g} tone={!st.any ? "muted" : st.ok ? "ok" : "error"}>
                          {BARISTA_GROUP_LABEL[g] || g}: {!st.any ? "empty" : st.ok ? "barista ✓" : "no barista"}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8 }}>
                    {tpl.positions.map((pos) => {
                      const m = shiftMath(pos.start, pos.end);
                      const who = assign[day]?.[pos.id] || "";
                      const clash = !!who && dbl.has(who);
                      const unavail = !!who && staffById[who] && !staffById[who].avail[day];
                      const selBarista = !!who && !!staffById[who]?.barista;
                      return (
                        <div key={pos.id} style={{
                          border: `1px solid ${clash ? T.error : T.line}`,
                          background: clash ? T.errorBg : "#FCFDFD",
                          borderRadius: 8, padding: "9px 10px",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{pos.name}</span>
                            {pos.baristaGroup && <span style={{ fontSize: 10, color: T.barista, fontWeight: 600 }}>needs barista</span>}
                          </div>
                          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.muted, margin: "2px 0 6px" }}>
                            {fmt(pos.start)}–{fmt(pos.end)}
                            <span style={{ color: T.faint }}>
                              {"  "}· {round(m.paid)}h{m.br > 0 ? ` (−${(m.br * 60) | 0}m)` : ""}
                            </span>
                          </div>
                          <select
                            value={who}
                            onChange={(e) => setCell(day, pos.id, e.target.value)}
                            style={{ ...selectS, color: selBarista ? T.barista : T.ink, fontWeight: selBarista ? 600 : 400 }}
                          >
                            <option value="" style={{ color: T.ink, fontWeight: 400 }}>— unfilled —</option>
                            {staff.map((s) => (
                              <option
                                key={s.id}
                                value={s.id}
                                style={{ color: s.barista ? T.barista : T.ink, fontWeight: s.barista ? 600 : 400 }}
                              >
                                {(s.barista ? "● " : "") + (s.name || "(unnamed)") + (s.avail[day] ? "" : "  [off]")}
                              </option>
                            ))}
                          </select>
                          {clash && <div style={miniErr}>working twice today</div>}
                          {unavail && !clash && <div style={miniWarn}>marked off this day</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* WEEKLY HOURS */}
        <Section title="Weekly hours" sub={`Paid hours after breaks. Cap is ${WEEK_CAP}h.`}>
          <div style={{ display: "grid", gap: 6 }}>
            {staff.map((s) => {
              const h = round(weeklyHours[s.id] || 0);
              const over = h > WEEK_CAP;
              const pct = Math.min(100, (h / WEEK_CAP) * 100);
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 130, fontSize: 13, display: "flex", alignItems: "center" }}>
                    {s.barista && <Dot />}{s.name || <span style={{ color: T.faint }}>(unnamed)</span>}
                  </span>
                  <div style={{ flex: 1, height: 8, background: T.lineSoft, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: over ? T.error : T.ok }} />
                  </div>
                  <span style={{ width: 64, textAlign: "right", fontFamily: T.mono, fontSize: 13, color: over ? T.error : T.ink }} data-testid={"wk-hours-" + s.id}>
                    {h}h
                  </span>
                  {over && <Chip tone="error">over cap</Chip>}
                </div>
              );
            })}
          </div>
        </Section>

        {/* ROSTER GRID (live review = the CSV) */}
        <Section
          title="Roster grid"
          sub="Names down the side, days across the top — the at-a-glance view. It updates live as you fill shifts, and it's exactly what “Download CSV” saves. N/A = marked off, blank = free."
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}>
              <thead>
                <tr>
                  <th style={{ ...gridHead, textAlign: "left" }}>Name</th>
                  {DAYS.map((d) => (
                    <th key={d} style={{ ...gridHead, textAlign: "center" }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rosterGrid.map(({ staff: s, cells }) => (
                  <tr key={s.id}>
                    <td style={gridName}>
                      <span style={{ display: "flex", alignItems: "center" }}>
                        {s.barista && <Dot />}
                        {s.name || <span style={{ color: T.faint }}>(unnamed)</span>}
                      </span>
                    </td>
                    {cells.map((c, i) => (
                      <td key={i} style={{
                        ...gridCell,
                        background: c.clash ? T.errorBg : "transparent",
                        color: c.off ? T.faint : c.clash ? T.error : T.ink,
                        fontWeight: c.clash ? 700 : 400,
                      }}>{c.text}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* EXPORT */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
          <button onClick={copyText} style={btnSolid}>Copy roster</button>
          <button onClick={downloadCSV} style={btnGhost}>Download CSV</button>
          <button onClick={exportSetup} style={btnGhost}>Export setup</button>
          <button onClick={importSetup} style={btnGhost}>Import setup</button>
          <button onClick={resetAll} style={{ ...btnGhost, color: T.error, borderColor: T.line }}>Reset everything</button>
        </div>

        <p style={{ color: T.faint, fontSize: 12, marginTop: 22, lineHeight: 1.6 }}>
          Break rule applied: shift over 5h takes 30m, over 8h takes another 30m. Pay rates aren't in this version —
          hours are the foundation; cost (incl. weekend penalty rates) is the next layer.
        </p>
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)",
          background: T.ink, color: "#fff", padding: "9px 16px", borderRadius: 8,
          fontSize: 13, fontFamily: T.sans, boxShadow: "0 6px 20px rgba(0,0,0,.18)",
        }}>{toast}</div>
      )}
    </div>
  );
}
