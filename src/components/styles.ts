import type { CSSProperties } from "react";
import { T } from "../theme";

/* ---------- shared style atoms ---------- */
export const thS: CSSProperties = { fontSize: 11, color: T.faint, fontWeight: 600, padding: "0 8px 8px", textTransform: "uppercase", letterSpacing: 0.4 };
export const tdS: CSSProperties = { padding: "8px" };
export const inputS: CSSProperties = { border: `1px solid ${T.line}`, borderRadius: 6, padding: "6px 8px", fontSize: 13, width: "100%", fontFamily: T.sans, color: T.ink, background: "#fff" };
export const timeS: CSSProperties = { border: `1px solid ${T.line}`, borderRadius: 6, padding: "5px 7px", fontSize: 13, fontFamily: T.mono };
export const selectS: CSSProperties = { width: "100%", border: `1px solid ${T.line}`, borderRadius: 6, padding: "5px 6px", fontSize: 12.5, fontFamily: T.sans, background: "#fff", color: T.ink };
export const dayCard: CSSProperties = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, padding: "12px 12px 14px" };
export const miniErr: CSSProperties = { color: T.error, fontSize: 11, fontWeight: 600, marginTop: 4 };
export const miniWarn: CSSProperties = { color: T.warn, fontSize: 11, fontWeight: 600, marginTop: 4 };
export const btnSolid: CSSProperties = { background: T.accent, color: "#fff", border: "none", borderRadius: 7, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.sans };
export const btnGhost: CSSProperties = { background: "#fff", color: T.ink, border: `1px solid ${T.line}`, borderRadius: 7, padding: "8px 13px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.sans, marginTop: 4 };
export const linkBtn: CSSProperties = { background: "none", border: "none", color: T.faint, fontSize: 12, cursor: "pointer", textDecoration: "underline", fontFamily: T.sans };
