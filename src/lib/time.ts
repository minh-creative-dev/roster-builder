/* ---------- time + break helpers ---------- */

export const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const fmt = (hhmm: string): string => {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h < 12 ? "am" : "pm";
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return m === 0 ? `${hr}${ap}` : `${hr}:${String(m).padStart(2, "0")}${ap}`;
};

// break: shift over 5h -> 30m; over 8h -> another 30m
export const breakMins = (durH: number): number => {
  let b = 0;
  if (durH > 5) b += 30;
  if (durH > 8) b += 30;
  return b;
};

export interface ShiftMath {
  dur: number;
  br: number;
  paid: number;
}

export const shiftMath = (start: string, end: string): ShiftMath => {
  const dur = (toMin(end) - toMin(start)) / 60;
  const br = breakMins(dur) / 60;
  return { dur, br, paid: Math.max(0, dur - br) };
};

export const round = (n: number): number => Math.round(n * 100) / 100;
