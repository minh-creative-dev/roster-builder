import type { ReactNode } from "react";
import { T } from "../theme";

/* ---------- small UI atoms ---------- */

type Tone = "ok" | "warn" | "error" | "muted";

export function Chip({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  const map: Record<Tone, { c: string; b: string }> = {
    ok: { c: T.ok, b: T.okBg },
    warn: { c: T.warn, b: T.warnBg },
    error: { c: T.error, b: T.errorBg },
    muted: { c: T.muted, b: T.lineSoft },
  };
  const s = map[tone];
  return (
    <span style={{
      fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: s.c,
      background: s.b, borderRadius: 4, padding: "2px 7px", letterSpacing: 0.2,
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

/** Round radio-style availability toggle: filled espresso dot = on, empty ring = off. */
export function DayToggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={label}
      onClick={onToggle}
      style={{
        width: 18, height: 18, padding: 0, borderRadius: "50%", cursor: "pointer",
        background: "#fff", border: `1.5px solid ${on ? T.accent : T.line}`,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        verticalAlign: "middle", transition: "border-color 120ms",
      }}
    >
      {on && <span style={{ width: 9, height: 9, borderRadius: "50%", background: T.accent }} />}
    </button>
  );
}

export function Dot() {
  return (
    <span title="barista" style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: T.barista, marginRight: 6, verticalAlign: "middle",
    }} />
  );
}

export function Section(
  { title, sub, right, children }:
  { title: string; sub?: string; right?: ReactNode; children: ReactNode },
) {
  return (
    <section style={{
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12,
      padding: "16px 16px 18px", marginBottom: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
          {sub && <p style={{ color: T.muted, fontSize: 13, margin: "3px 0 0" }}>{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
