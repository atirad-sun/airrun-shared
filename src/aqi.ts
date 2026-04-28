/**
 * US EPA Air Quality Index (AQI) — PM2.5 (24-hour) computation.
 *
 * Source: EPA-454/B-24-002 (May 2024) "Technical Assistance Document for the
 * Reporting of Daily Air Quality – the Air Quality Index (AQI)", Table 6 and
 * Equation 1. Effective May 6, 2024 (89 FR 16202).
 *
 * Bangkok runners are the target audience: pollution data comes from Air4Thai
 * stations as raw PM2.5 μg/m³, and we display a unified EPA AQI computed from
 * those values so the number matches what users see on iqair.com / aqicn.org.
 *
 * Backend (`fetch-aqi` cron) still writes a legacy Thai PCD `aqi_status` enum
 * to the DB, which the frontend now ignores in favor of the band derived here.
 */

export type AqiBand =
  | "Good"
  | "Moderate"
  | "USG"
  | "Unhealthy"
  | "VeryUnhealthy"
  | "Hazardous";

export interface AqiResult {
  aqi: number; // integer 0–500
  band: AqiBand;
  pm25: number; // truncated to 1 decimal
}

/**
 * EPA Table 6 — PM2.5 24-hour breakpoints (post-May 2024).
 *
 * Each row: { cLo, cHi, iLo, iHi, band }
 *  - cLo / cHi: PM2.5 concentration breakpoints in μg/m³ (truncated to 1 decimal)
 *  - iLo / iHi: AQI index breakpoints
 */
interface Breakpoint {
  cLo: number;
  cHi: number;
  iLo: number;
  iHi: number;
  band: AqiBand;
}

const PM25_BREAKPOINTS: readonly Breakpoint[] = [
  { cLo: 0.0,   cHi: 9.0,   iLo: 0,   iHi: 50,  band: "Good" },
  { cLo: 9.1,   cHi: 35.4,  iLo: 51,  iHi: 100, band: "Moderate" },
  { cLo: 35.5,  cHi: 55.4,  iLo: 101, iHi: 150, band: "USG" },
  { cLo: 55.5,  cHi: 125.4, iLo: 151, iHi: 200, band: "Unhealthy" },
  { cLo: 125.5, cHi: 225.4, iLo: 201, iHi: 300, band: "VeryUnhealthy" },
  { cLo: 225.5, cHi: 325.4, iLo: 301, iHi: 500, band: "Hazardous" },
] as const;

/**
 * Truncate PM2.5 to 1 decimal place per EPA spec (not round — truncate toward
 * negative infinity equivalent for non-negative values).
 */
function truncatePm25(pm25: number): number {
  return Math.floor(pm25 * 10) / 10;
}

/**
 * Convert a PM2.5 24-hour concentration (μg/m³) to an EPA AQI integer.
 *
 * Algorithm (EPA Equation 1):
 *   I_p = ((I_Hi - I_Lo) / (BP_Hi - BP_Lo)) * (C_p - BP_Lo) + I_Lo
 *
 * Edge cases:
 *  - pm25 < 0      → clamp to 0  (defensive; sensors should never report this)
 *  - pm25 > 325.4  → clamp to AQI 500 (Hazardous category capped for display)
 */
export function pm25ToAqi(pm25: number): number {
  if (!Number.isFinite(pm25) || pm25 < 0) return 0;
  if (pm25 > 325.4) return 500;

  const cp = truncatePm25(pm25);

  for (const bp of PM25_BREAKPOINTS) {
    if (cp >= bp.cLo && cp <= bp.cHi) {
      const aqi =
        ((bp.iHi - bp.iLo) / (bp.cHi - bp.cLo)) * (cp - bp.cLo) + bp.iLo;
      return Math.round(aqi);
    }
  }

  // Unreachable: PM25_BREAKPOINTS spans [0, 325.4] and we clamped above.
  return 500;
}

/**
 * Map an AQI integer to its EPA band. Mirrors the boundaries in PM25_BREAKPOINTS
 * but accepts any AQI integer (e.g., from a different pollutant).
 */
export function aqiToBand(aqi: number): AqiBand {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "USG";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "VeryUnhealthy";
  return "Hazardous";
}

/**
 * One-shot helper for components: take a possibly-null PM2.5 reading and
 * return an `AqiResult` or `null` (when no data is available).
 *
 * Strict null check — `pm25 === 0` is a valid reading (extremely clean air).
 */
export function computeAqi(pm25: number | null | undefined): AqiResult | null {
  if (pm25 == null || !Number.isFinite(pm25)) return null;
  const truncated = truncatePm25(Math.max(0, pm25));
  const aqi = pm25ToAqi(pm25);
  return {
    aqi,
    band: aqiToBand(aqi),
    pm25: truncated,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Band → label / color / Tailwind class helpers
// ──────────────────────────────────────────────────────────────────────────────

const BAND_THAI_LABEL: Record<AqiBand, string> = {
  Good: "ดี",
  Moderate: "ปานกลาง",
  USG: "กลุ่มเสี่ยง",
  Unhealthy: "มีผลกระทบ",
  VeryUnhealthy: "มีผลมาก",
  Hazardous: "อันตราย",
};

/**
 * Hex colors aligned with the project's Tailwind theme tokens
 * (see `src/styles/theme.css` `--aqi-*` variables). If you change these, update
 * theme.css too — they must stay in sync.
 */
const BAND_COLOR: Record<AqiBand, string> = {
  Good: "#0EA673",          // --aqi-good
  Moderate: "#FBBF24",      // --aqi-moderate
  USG: "#FB923C",           // --aqi-sensitive
  Unhealthy: "#F87171",     // --aqi-poor
  VeryUnhealthy: "#A855F7", // --aqi-bad
  Hazardous: "#991B1B",     // --aqi-hazardous
};

const BAND_TAILWIND_BG: Record<AqiBand, string> = {
  Good: "bg-aqi-good",
  Moderate: "bg-aqi-moderate",
  USG: "bg-aqi-sensitive",
  Unhealthy: "bg-aqi-poor",
  VeryUnhealthy: "bg-aqi-bad",
  Hazardous: "bg-aqi-hazardous",
};

const BAND_TAILWIND_TEXT: Record<AqiBand, string> = {
  Good: "text-aqi-good",
  Moderate: "text-aqi-moderate",
  USG: "text-aqi-sensitive",
  Unhealthy: "text-aqi-poor",
  VeryUnhealthy: "text-aqi-bad",
  Hazardous: "text-aqi-hazardous",
};

const BAND_EMOJI: Record<AqiBand, string> = {
  Good: "🟢",
  Moderate: "🟡",
  USG: "🟠",
  Unhealthy: "🔴",
  VeryUnhealthy: "🟣",
  Hazardous: "⚫",
};

export function getBandThaiLabel(band: AqiBand): string {
  return BAND_THAI_LABEL[band];
}

export function getBandColor(band: AqiBand): string {
  return BAND_COLOR[band];
}

export function getBandTailwindBg(band: AqiBand): string {
  return BAND_TAILWIND_BG[band];
}

export function getBandTailwindText(band: AqiBand): string {
  return BAND_TAILWIND_TEXT[band];
}

export function getBandEmoji(band: AqiBand): string {
  return BAND_EMOJI[band];
}

// ──────────────────────────────────────────────────────────────────────────────
// Running advice & trend helpers
// ──────────────────────────────────────────────────────────────────────────────

export type RunAdviceLevel = "go" | "caution" | "stop";

export interface RunAdvice {
  emoji: string;
  label: string;
  sublabel: string;
  level: RunAdviceLevel;
}

export function getRunAdvice(aqi: number): RunAdvice {
  if (aqi <= 50) return { emoji: "💚", label: "วิ่งได้เลย!", sublabel: "อากาศดี", level: "go" };
  if (aqi <= 100) return { emoji: "🌤", label: "วิ่งได้ ระวังตัวด้วย", sublabel: "อากาศปานกลาง", level: "caution" };
  if (aqi <= 150) return { emoji: "😷", label: "กลุ่มเสี่ยงควรงดวิ่ง", sublabel: "ลดความหนักลง", level: "caution" };
  return { emoji: "🚫", label: "วันนี้พักก่อนนะ", sublabel: "อากาศไม่ปลอดภัย", level: "stop" };
}

export type TrendDirection = "improving" | "stable" | "worsening";

export interface TrendInfo {
  arrow: string;
  direction: TrendDirection;
}

export function getTrendArrow(current: number, previous: number): TrendInfo {
  const diff = current - previous;
  if (diff > 10) return { arrow: "↑", direction: "worsening" };
  if (diff < -10) return { arrow: "↓", direction: "improving" };
  return { arrow: "→", direction: "stable" };
}

export function getExerciseAdvisory(aqi: number): string {
  if (aqi <= 50) return "ออกกำลังกายได้ตามปกติ";
  if (aqi <= 100) return "วิ่งเบาๆ ได้ หลีกเลี่ยงวิ่งหนัก";
  if (aqi <= 150) return "ลดเวลาออกกำลังกาย เลี่ยงกิจกรรมกลางแจ้ง";
  if (aqi <= 200) return "งดออกกำลังกายกลางแจ้ง";
  return "อยู่ในอาคาร งดกิจกรรมกลางแจ้งทั้งหมด";
}

// ──────────────────────────────────────────────────────────────────────────────
// Staleness & relative time
// ──────────────────────────────────────────────────────────────────────────────

const STALE_THRESHOLD_MS = 30 * 60 * 1000;

export function isStale(isoString: string | null | undefined): boolean {
  if (!isoString) return true;
  return Date.now() - new Date(isoString).getTime() > STALE_THRESHOLD_MS;
}

export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return "ไม่มีข้อมูล";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 5) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  return `${hours} ชั่วโมงที่แล้ว`;
}

// ──────────────────────────────────────────────────────────────────────────────
// AQI trend cache (localStorage-based for zero backend cost)
// ──────────────────────────────────────────────────────────────────────────────

const TREND_CACHE_KEY = "breeze_aqi_prev";

interface AqiSnapshot {
  values: Record<string, number>; // parkId → AQI
  ts: number; // epoch ms
}

export function saveTrendSnapshot(parkAqis: Record<string, number>): void {
  try {
    const snap: AqiSnapshot = { values: parkAqis, ts: Date.now() };
    localStorage.setItem(TREND_CACHE_KEY, JSON.stringify(snap));
  } catch { /* quota or SSR — ignore */ }
}

export function getPreviousAqi(parkId: string): number | null {
  try {
    const raw = localStorage.getItem(TREND_CACHE_KEY);
    if (!raw) return null;
    const snap: AqiSnapshot = JSON.parse(raw);
    // Only use if snapshot is 10+ min old (not the same fetch cycle)
    if (Date.now() - snap.ts < 10 * 60 * 1000) return null;
    return snap.values[parkId] ?? null;
  } catch { return null; }
}
