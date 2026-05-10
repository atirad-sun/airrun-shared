/**
 * Cross-app constants. Keep this file SMALL — only put things here that both
 * LIFF and admin actually consume. App-specific UI tokens stay in app/admin.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Brand
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND_GREEN = "#04dc9a";

// ─────────────────────────────────────────────────────────────────────────────
// AQI band thresholds (Thai PCD)
//
// Authoritative breakpoints live in `aqi.ts` (PM25_BREAKPOINTS). These are
// the integer AQI cutoffs for band classification — exposed here for places
// that need to filter/group by band without importing the full computation.
// ─────────────────────────────────────────────────────────────────────────────

export const AQI_BAND_LIMITS = {
  VeryGood: 25,
  Good: 50,
  Moderate: 100,
  Sensitive: 200,
  Unhealthy: 500, // open-ended in PCD; capped for display
} as const;
