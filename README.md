# @airrun/shared

Tiny shared package consumed by both the airrun LIFF app (`atirad-sun/run-and-dust-app`) and the airrun admin dashboard (`atirad-sun/airrun-admin`).

## Contents

- `src/aqi.ts` — canonical Thai PCD AQI computation + band labels/colors. Source of truth for both apps.
- `src/types.ts` — Postgres row types for the airrun Supabase schema (parks, users, reports, bugs, admins, ...).
- `src/constants.ts` — brand color and AQI band cutoffs.

## Distribution

This package is **not** published to npm. Both consuming apps install it directly from this private GitHub repo, pinned to a tag:

```json
"@airrun/shared": "github:atirad-sun/airrun-shared#v0.2.0"
```

## Versions

### v0.2.0 (Thai PCD) — breaking

Switched AQI standard from US EPA (6 bands, 0–500) to Thai PCD / กรมควบคุมมลพิษ (5 bands, 0–201+).

- `AqiBand` union changed: `"VeryGood" | "Good" | "Moderate" | "Sensitive" | "Unhealthy"` (was 6 EPA bands including `"USG"`, `"VeryUnhealthy"`, `"Hazardous"`).
- `AQI_BAND_LIMITS` keys updated to Thai PCD bands.
- Colors, labels, advisory thresholds, and trend sensitivity all updated to Thai PCD standard.
- Any consumer hard-coding old band names will fail to typecheck — bump with care.

### v0.1.0 (US EPA)

Initial release. US EPA 6-band AQI (0–500 scale, May 2024 breakpoints).

## Bumping versions

When you change anything in `src/`:

1. Bump `version` in `package.json` (semver).
2. Commit, then tag:
   ```bash
   git tag v0.x.0
   git push origin main --tags
   ```
3. In each consuming repo (`run-and-dust-app`, `airrun-admin`), bump the git ref in `package.json` and run `npm install`.

There is no build step — the package is consumed as raw TypeScript via the `main`/`exports` fields in `package.json`. Both consumers compile it through their own bundler (Vite).
