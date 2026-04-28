# @airrun/shared

Tiny shared package consumed by both the airrun LIFF app (`atirad-sun/run-and-dust-app`) and the airrun admin dashboard (`atirad-sun/airrun-admin`).

## Contents

- `src/aqi.ts` — canonical EPA AQI computation + band labels/colors. Source of truth for both apps.
- `src/types.ts` — Postgres row types for the airrun Supabase schema (parks, users, reports, bugs, admins, ...).
- `src/constants.ts` — brand color and AQI band cutoffs.

## Distribution

This package is **not** published to npm. Both consuming apps install it directly from this private GitHub repo, pinned to a tag:

```json
"@airrun/shared": "github:atirad-sun/airrun-shared#v0.1.0"
```

## Bumping versions

When you change anything in `src/`:

1. Bump `version` in `package.json` (semver).
2. Commit, then tag:
   ```bash
   git tag v0.2.0
   git push origin main --tags
   ```
3. In each consuming repo (`run-and-dust-app`, `airrun-admin`), bump the git ref in `package.json` and run `npm install`.

There is no build step — the package is consumed as raw TypeScript via the `main`/`exports` fields in `package.json`. Both consumers compile it through their own bundler (Vite).
