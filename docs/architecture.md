# EcoScan Architecture

## Purpose

EcoScan is an existing mobile-first React application that analyzes a waste-item image, recommends a disposal action, saves scan history, and optionally finds nearby facilities. This document defines the stable boundaries for the next product phase without replacing the current frontend, Gemini integration, Supabase project, or Leaflet map flow.

## Current architecture

```text
Camera or image upload
        |
        v
React application (Vite + TypeScript)
        |
        | POST image + user-supplied Gemini key
        v
Supabase Edge Function: analyze-waste
        |
        | Gemini REST API
        v
Strict JSON analysis
        |
        +--> React result view
        +--> Supabase public.scan_history
        +--> Browser geolocation -> Overpass API -> Leaflet map
```

### Frontend

- `src/main.tsx` mounts the React application.
- `src/App.tsx` owns the current scan lifecycle, image preprocessing, error state, settings state, history loading, and map visibility.
- `src/components/ScanResult.tsx` displays the current analysis and starts nearby-service lookup.
- `src/components/HistoryView.tsx` displays stored scan history and impact totals.
- `src/components/SettingsModal.tsx` collects the Gemini key.
- `src/components/MapOverlay.tsx` renders Leaflet and queries OpenStreetMap Overpass facilities.
- `src/lib/supabase.ts` is the Supabase client and current analysis/history access layer.
- `src/lib/apiKey.ts` stores the Gemini key in browser `localStorage`.
- `src/lib/constants.ts` contains current action labels and map query values.

There is no client-side router. The current app uses conditional views and overlays inside `App.tsx`.

### Backend

- `supabase/functions/analyze-waste/index.ts` is the only deployed Edge Function.
- It accepts a base64 image, MIME type, and API key.
- It calls the Gemini REST API using the configured model.
- It asks Gemini for `item_name`, `material`, `action`, and `condition_assessment`.
- It parses the response and normalizes an invalid action to `trash`.
- JWT verification is currently disabled in `supabase/config.toml`.

The logical operations in `API_CONTRACT.md` are a stable interface for future work. They are not separate HTTP servers or separate deployed functions yet. Until Phase 1 implementation is approved, the existing `analyze-waste` function remains the only analysis endpoint and the frontend continues using its current call path.

### Data

The existing database contains one public table:

- `public.scan_history`
  - `id` uuid primary key
  - `item_name` text
  - `material` text
  - `action` text constrained to `recycle`, `donate`, `trash`, or `hazardous`
  - `condition_assessment` text
  - `image_data` text containing an optional base64 image
  - `latitude` and `longitude` optional coordinates
  - `saved_from_landfill` boolean
  - `created_at` timestamptz

RLS is enabled, but the current no-auth application grants anonymous and authenticated users full CRUD access with unconditional policies. This is intentional for the current shared/no-login design, but it does not provide personal ownership.

There is no authentication flow, no Supabase Storage integration, and no user ownership column.

## Stable boundaries for the upgrade

### Analysis boundary

The analysis boundary accepts normalized image evidence and returns an explicit analysis object. It must not infer functionality from missing visual evidence. Every uncertain property uses an explicit unknown state.

### Decision boundary

The decision engine consumes analysis and evidence, then returns a recommended action plus explanation, confidence, uncertainty, missing information, and the next best question. The decision engine must not silently convert unknown evidence into a positive or negative condition.

### Location boundary

The location service accepts an action, material, item type, and user coordinates. It returns nearby services with source, distance, service type, accepted-material information when available, and uncertainty when the data is incomplete.

### Persistence boundary

The existing scan-history write remains compatible during the transition. Future richer analysis records should be added separately rather than changing or deleting existing columns. Proposed future records are documented separately in `API_CONTRACT.md` and must be approved before any migration.

## Components to extend later

- Extend `src/App.tsx` only as an orchestration layer; move richer request logic into a dedicated client module rather than adding more workflow branches here.
- Extend `src/lib/supabase.ts` with typed clients for the approved logical operations.
- Extend `src/components/ScanResult.tsx` to show recommendation explanations, confidence, uncertainty, and follow-up questions.
- Extend `src/components/HistoryView.tsx` only after the persistence model supports the richer records.
- Extend `src/components/MapOverlay.tsx` to consume typed nearby-service results and safely render external facility names.
- Extend `supabase/functions/analyze-waste/index.ts` or add a clearly separated function only when the approved contract requires a separate execution boundary.
- Add a decision-engine module under `src/lib` or the Edge Function boundary after the response contract is approved.

## Security and validation rules

### Current state

- The browser stores the Gemini API key in `localStorage` and sends it to the Edge Function. It is not hard-coded in the compiled source, but it is still browser-controlled and exposed to same-origin scripts or browser compromise.
- The Edge Function is public and has JWT verification disabled.
- CORS currently allows all origins.
- Scan history is public/shared under the current RLS policies.

These are documented constraints, not changes made by this phase. A future security phase should move Gemini credentials to server-side secret storage, add request limits, and decide whether authentication is required.

### Required future behavior

- Validate request size, MIME type, image encoding, and required fields at the Edge Function boundary.
- Validate every AI response field and allowed enum before persistence or display.
- Preserve unknown values explicitly; never use a missing field as evidence that an item is functional, broken, recyclable, or safe.
- Treat AI output and external facility data as untrusted input.
- Escape or safely bind facility names before rendering them in map popups.
- Return stable error codes and human-readable messages without exposing API keys, provider credentials, or raw internal traces.
- When authentication is introduced, require ownership checks for every analysis and history record.

## Non-goals for this phase

- No frontend rebuild.
- No new database tables or migrations.
- No authentication implementation.
- No full repair/reuse recommendation pipeline.
- No separate FastAPI server.
- No new UI behavior beyond documenting extension points.
