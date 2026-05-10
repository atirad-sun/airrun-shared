/**
 * Thai PCD Air Quality Index — PM2.5 (24-hour) computation.
 *
 * Source: กรมควบคุมมลพิษ (Pollution Control Department) Thailand
 * https://www.pcd.go.th/air-quality/
 *
 * เกณฑ์ PM2.5 มาตรฐานไทย (ค่าเฉลี่ย 24 ชั่วโมง):
 *   ดีมาก   0.0 – 15.0 μg/m³  → Thai AQI   0–25
 *   ดี      15.1 – 25.0 μg/m³  → Thai AQI  26–50
 *   ปานกลาง 25.1 – 37.5 μg/m³  → Thai AQI  51–100
 *   เริ่มมีผลต่อสุขภาพ 37.6 – 75.0 μg/m³ → Thai AQI 101–200
 *   มีผลต่อสุขภาพ     75.1+  μg/m³       → Thai AQI 201+
 *
 * Data sources wired by backend: PCD Thailand, WAQI, OpenWeatherMap.
 * All three provide raw PM2.5 μg/m³ — pass it directly to computeAqi().
 *
 * Note: aqi field in AqiResult is now Thai AQI (0–201+ scale), not US EPA (0–500).
 */

export type AqiBand =
  | "VeryGood"   // ดีมาก  — ฟ้า
  | "Good"       // ดี     — เขียว
  | "Moderate"   // ปานกลาง — เหลือง
  | "Sensitive"  // เริ่มมีผลต่อสุขภาพ — ส้ม
  | "Unhealthy"; // มีผลต่อสุขภาพ — แดง

export interface AqiResult {
  aqi: number;   // Thai AQI integer (0–201+)
  band: AqiBand;
  pm25: number;  // truncated to 1 decimal
}

interface Breakpoint {
  cLo: number;
  cHi: number;
  iLo: number;
  iHi: number;
  band: AqiBand;
}

/**
 * Thai PCD PM2.5 breakpoints mapped to Thai AQI index.
 * Linear interpolation within each band (same formula as EPA Equation 1).
 */
const PM25_BREAKPOINTS: readonly Breakpoint[] = [
  { cLo: 0.0,  cHi: 15.0, iLo: 0,   iHi: 25,  band: "VeryGood"  },
  { cLo: 15.1, cHi: 25.0, iLo: 26,  iHi: 50,  band: "Good"      },
  { cLo: 25.1, cHi: 37.5, iLo: 51,  iHi: 100, band: "Moderate"  },
  { cLo: 37.6, cHi: 75.0, iLo: 101, iHi: 200, band: "Sensitive" },
  { cLo: 75.1, cHi: 300,  iLo: 201, iHi: 500, band: "Unhealthy" },
] as const;

function truncatePm25(pm25: number): number {
  return Math.floor(pm25 * 10) / 10;
}

/**
 * Convert PM2.5 (μg/m³) to Thai AQI integer.
 * Formula: I_p = ((I_Hi - I_Lo) / (BP_Hi - BP_Lo)) * (C_p - BP_Lo) + I_Lo
 */
export function pm25ToAqi(pm25: number): number {
  if (!Number.isFinite(pm25) || pm25 < 0) return 0;
  if (pm25 > 300) return 500;

  const cp = truncatePm25(pm25);

  for (const bp of PM25_BREAKPOINTS) {
    if (cp >= bp.cLo && cp <= bp.cHi) {
      const aqi =
        ((bp.iHi - bp.iLo) / (bp.cHi - bp.cLo)) * (cp - bp.cLo) + bp.iLo;
      return Math.round(aqi);
    }
  }

  return 500;
}

/** Map Thai AQI integer to Thai PCD band. */
export function aqiToBand(aqi: number): AqiBand {
  if (aqi <= 25)  return "VeryGood";
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 200) return "Sensitive";
  return "Unhealthy";
}

/**
 * One-shot helper for components: take a possibly-null PM2.5 reading and
 * return an AqiResult or null (when no data is available).
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
  VeryGood:  "ดีมาก",
  Good:      "ดี",
  Moderate:  "ปานกลาง",
  Sensitive: "เริ่มมีผลต่อสุขภาพ",
  Unhealthy: "มีผลต่อสุขภาพ",
};

/**
 * Thai PCD official colors.
 * Also update src/styles/theme.css --aqi-* variables to match.
 */
const BAND_COLOR: Record<AqiBand, string> = {
  VeryGood:  "#38BDF8", // ฟ้า  — --aqi-good
  Good:      "#4ADE80", // เขียว — --aqi-moderate
  Moderate:  "#FACC15", // เหลือง — --aqi-sensitive
  Sensitive: "#FB923C", // ส้ม  — --aqi-poor
  Unhealthy: "#EF4444", // แดง  — --aqi-bad
};

const BAND_TAILWIND_BG: Record<AqiBand, string> = {
  VeryGood:  "bg-aqi-good",
  Good:      "bg-aqi-moderate",
  Moderate:  "bg-aqi-sensitive",
  Sensitive: "bg-aqi-poor",
  Unhealthy: "bg-aqi-bad",
};

const BAND_TAILWIND_TEXT: Record<AqiBand, string> = {
  VeryGood:  "text-aqi-good",
  Good:      "text-aqi-moderate",
  Moderate:  "text-aqi-sensitive",
  Sensitive: "text-aqi-poor",
  Unhealthy: "text-aqi-bad",
};

const BAND_EMOJI: Record<AqiBand, string> = {
  VeryGood:  "🔵",
  Good:      "🟢",
  Moderate:  "🟡",
  Sensitive: "🟠",
  Unhealthy: "🔴",
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
// Running advice & exercise advisory (based on Thai AQI)
// ──────────────────────────────────────────────────────────────────────────────

export type RunAdviceLevel = "go" | "caution" | "stop";

export interface RunAdvice {
  emoji: string;
  label: string;
  sublabel: string;
  level: RunAdviceLevel;
}

export function getRunAdvice(aqi: number): RunAdvice {
  if (aqi <= 25)  return { emoji: "💚", label: "วิ่งได้เลย!",          sublabel: "อากาศดีมาก",             level: "go"      };
  if (aqi <= 50)  return { emoji: "💚", label: "วิ่งได้เลย!",          sublabel: "อากาศดี",                level: "go"      };
  if (aqi <= 100) return { emoji: "🌤", label: "วิ่งได้ ระวังตัวด้วย", sublabel: "อากาศปานกลาง",           level: "caution" };
  if (aqi <= 200) return { emoji: "😷", label: "กลุ่มเสี่ยงควรงดวิ่ง", sublabel: "ลดความหนักลง ใส่หน้ากาก", level: "caution" };
  return           { emoji: "🚫", label: "วันนี้พักก่อนนะ",           sublabel: "อากาศไม่ปลอดภัย",         level: "stop"    };
}

export type TrendDirection = "improving" | "stable" | "worsening";

export interface TrendInfo {
  arrow: string;
  direction: TrendDirection;
}

export function getTrendArrow(current: number, previous: number): TrendInfo {
  const diff = current - previous;
  if (diff > 5)  return { arrow: "↑", direction: "worsening" };
  if (diff < -5) return { arrow: "↓", direction: "improving" };
  return              { arrow: "→", direction: "stable"    };
}

export function getExerciseAdvisory(aqi: number): string {
  if (aqi <= 25)  return "ออกกำลังกายได้ตามปกติ";
  if (aqi <= 50)  return "ออกกำลังกายได้ตามปกติ";
  if (aqi <= 100) return "วิ่งเบาๆ ได้ หลีกเลี่ยงวิ่งหนัก";
  if (aqi <= 200) return "ลดเวลาออกกำลังกาย ใส่หน้ากาก N95";
  return "งดออกกำลังกายกลางแจ้งทั้งหมด";
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
  if (mins < 5)  return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  return `${hours} ชั่วโมงที่แล้ว`;
}

// ──────────────────────────────────────────────────────────────────────────────
// AQI trend cache (localStorage-based for zero backend cost)
// ──────────────────────────────────────────────────────────────────────────────

const TREND_CACHE_KEY = "breeze_aqi_prev";

interface AqiSnapshot {
  values: Record<string, number>; // parkId → Thai AQI
  ts: number;                     // epoch ms
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
    if (Date.now() - snap.ts < 10 * 60 * 1000) return null;
    return snap.values[parkId] ?? null;
  } catch { return null; }
}
