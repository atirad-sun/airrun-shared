/**
 * DB row types for the airrun Supabase schema.
 *
 * Hand-written to match the SQL migrations in `app/supabase/`. When the schema
 * changes, update here and bump @airrun/shared so both app and admin pick it up.
 *
 * Naming: snake_case fields mirror Postgres columns. View shapes (e.g.
 * parks_with_aqi) live alongside their base table.
 */

// ─────────────────────────────────────────────────────────────────────────────
// parks (001_schema.sql)
// ─────────────────────────────────────────────────────────────────────────────

export interface Park {
  id: string;
  name: string;
  name_en: string;
  lat: number;
  lng: number;
  station_name: string;
  station_distance_km: number;
  track_length_km: number;
  open_time: string;
  close_time: string;
  created_at: string;
}

/**
 * Shape of the `parks_with_aqi` view (parks left-joined with latest_aqi +
 * weather columns added in 010). Both LIFF and admin read this view.
 */
export interface ParkWithAqi extends Park {
  current_aqi: number;
  aqi_status: AqiStatusEnum;
  pm25: number | null;
  pm10: number | null;
  temperature: number | null;
  uv_index: number | null;
  aqi_updated_at: string | null;
}

/**
 * Legacy 5-band enum still written by `fetch-aqi` to `parks_with_aqi.aqi_status`
 * (Good/Moderate/Poor/Bad/Hazardous on a 0–500 scale).
 *
 * The LIFF app ignores this column and re-derives Thai PCD bands from raw `pm25`
 * via `computeAqi()`.  The admin SPA still reads it for filter chips.
 *
 * TODO: align with Thai PCD bands when fetch-aqi is rewritten — see follow-up.
 */
export type AqiStatusEnum = "Good" | "Moderate" | "Poor" | "Bad" | "Hazardous";

// ─────────────────────────────────────────────────────────────────────────────
// users (001_schema.sql + 013_schedule_cooldown.sql)
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string; // LINE user ID (NOT a uuid)
  display_name: string;
  picture_url: string | null;
  status_message: string | null;
  run_time: "morning" | "evening" | "both";
  notify_enabled: boolean;
  notify_time: string;
  schedule_changed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// reports (001_schema.sql)
// ─────────────────────────────────────────────────────────────────────────────

export interface Report {
  id: number;
  user_id: string;
  park_id: string;
  weather: "Sun" | "Cloud" | "Haze" | "Rain" | "Wind" | null;
  air_quality: "good" | "ok" | "poor" | "bad" | null;
  crowd: "empty" | "light" | "moderate" | "packed" | null;
  photo_url: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// custom_spots (006_custom_spots.sql)
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomSpot {
  id: string; // uuid
  user_id: string;
  name: string;
  lat: number;
  lng: number;
  station_id: string;
  station_name: string;
  station_distance_km: number;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// feedback (014_feedback.sql)
// ─────────────────────────────────────────────────────────────────────────────

export interface Feedback {
  id: number;
  user_id: string | null;
  category: "bug" | "feature" | "general";
  rating: number; // 1..5
  message: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// bugs (015_bugs.sql)
// ─────────────────────────────────────────────────────────────────────────────

export type BugSeverity = "low" | "medium" | "high" | "critical";
export type BugStatus = "open" | "triaged" | "in_progress" | "fixed" | "closed";

export interface Bug {
  id: string;
  title: string;
  description: string | null;
  steps: string | null;
  device: string | null;
  logs: string | null;
  severity: BugSeverity;
  area: string;
  status: BugStatus;
  reporter_user_id: string | null;
  reporter_name: string | null;
  owner: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// admins + admin_audit (016_admin_auth.sql)
// ─────────────────────────────────────────────────────────────────────────────

export type AdminRole = "super_admin" | "editor" | "viewer";
export type AdminStatus = "active" | "inactive";

export interface Admin {
  user_id: string; // uuid (auth.users.id)
  email: string;
  name: string;
  role: AdminRole;
  status: AdminStatus;
  created_at: string;
  last_login: string | null;
}

export interface AdminAudit {
  id: number;
  admin_id: string | null; // uuid
  action: string;
  target_type: string | null;
  target_id: string | null;
  payload: unknown; // jsonb
  created_at: string;
}
