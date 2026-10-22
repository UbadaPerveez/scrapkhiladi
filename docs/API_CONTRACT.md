# EcoScan API Contract

## Status and compatibility

This is the proposed stable interface for the next phase. The logical operations are documented now so the frontend, Edge Functions, AI analysis, decision engine, and location service share one vocabulary.

They are not separate deployed routes yet. The current application continues to use the existing Supabase Edge Function `analyze-waste` and the existing direct Supabase queries. Future implementation should adapt these operations to Supabase Edge Functions rather than adding a separate FastAPI server.

All JSON responses use `Content-Type: application/json`.

## Common types

### Explicit unknown values

Missing or insufficient evidence must be represented as `unknown`, `not_provided`, or an empty list with a reason. It must never be interpreted as positive or negative evidence.

```json
{
  "value": "unknown",
  "reason": "The image does not show the serial label or internal mechanism."
}
```

For typed fields, the contract uses either a nullable value plus an explanation or an explicit status object. `unknown` means not enough evidence; `not_provided` means the user has not supplied the requested evidence; `not_applicable` means the field does not apply.

### Evidence source

```json
{
  "id": "evidence_01",
  "kind": "image",
  "source": "user_upload",
  "description": "Front and side view of a small countertop appliance",
  "captured_at": "2026-10-21T12:00:00Z",
  "reliability": "medium"
}
```

Allowed `kind` values: `image`, `user_answer`, `manual_correction`, `barcode`, `ocr`, `external_lookup`.

Allowed `reliability` values: `high`, `medium`, `low`, `unknown`.

### Analysis result

```json
{
  "item": {
    "type": { "value": "small kitchen appliance", "confidence": 0.82 },
    "brand": { "value": "unknown", "confidence": 0, "reason": "No readable brand mark is visible." },
    "model": { "value": "unknown", "confidence": 0, "reason": "No model label is visible." }
  },
  "condition": {
    "visible": {
      "status": "partially_observed",
      "summary": "Exterior appears intact with light surface wear.",
      "damage": ["minor_surface_scratches"],
      "evidence_ids": ["evidence_01"]
    },
    "functional": {
      "status": "unknown",
      "summary": "Function cannot be verified from the image.",
      "evidence_ids": []
    }
  },
  "evidence": [
    {
      "id": "evidence_01",
      "kind": "image",
      "source": "user_upload",
      "description": "Front and side view",
      "captured_at": "2026-10-21T12:00:00Z",
      "reliability": "medium"
    }
  ],
  "confidence": {
    "overall": 0.68,
    "level": "medium",
    "uncertainties": ["brand", "model", "functional_condition"]
  },
  "missing_information": [
    {
      "field": "functional_condition",
      "question": "Does the item turn on and work normally?",
      "priority": "high"
    }
  ]
}
```

Allowed status values for observed fields include `observed`, `partially_observed`, `unknown`, `not_provided`, and `not_applicable`.

### Recommendation

```json
{
  "action": "repair",
  "explanation": "The item appears structurally intact, but its function is unverified. Confirm whether it works before choosing donation or recycling.",
  "confidence": 0.61,
  "uncertainty": ["functional_condition"],
  "next_question": "Does the item turn on and work normally?",
  "alternatives": [
    {
      "action": "donate",
      "when": "Use this option if it is confirmed working.",
      "confidence": 0.55
    },
    {
      "action": "recycle",
      "when": "Use this option if it is non-working and accepted by an electronics recycler.",
      "confidence": 0.64
    }
  ]
}
```

Allowed actions for the upgraded decision engine: `repair`, `reuse`, `donate`, `recycle`, `trash`, and `hazardous`.

The existing UI currently understands only `recycle`, `donate`, `trash`, and `hazardous`. The new actions must not be written into the existing constrained `scan_history.action` column until the database and UI transition is approved.

### Nearby service

```json
{
  "id": "osm_node_123",
  "name": "Example Repair Cafe",
  "service_type": "repair",
  "latitude": 12.345,
  "longitude": 67.89,
  "distance_meters": 1240,
  "accepted_materials": ["small_appliances"],
  "acceptance_status": "unknown",
  "source": "openstreetmap_overpass",
  "source_url": "https://www.openstreetmap.org/",
  "uncertainty": ["opening_hours", "accepted_materials"]
}
```

`acceptance_status` must be one of `confirmed`, `not_confirmed`, or `unknown`. Nearby results are suggestions and must not claim acceptance unless the source confirms it.

## POST `/analysis/start`

### Purpose

Start an analysis from the current image upload. In the existing app, this maps to the current `analyze-waste` Edge Function call.

### Request

```json
{
  "image": {
    "base64": "<base64 image data>",
    "mime_type": "image/jpeg",
    "width": 1024,
    "height": 768
  },
  "client_context": {
    "locale": "en-US",
    "timezone": "Asia/Kolkata"
  }
}
```

The future server-side function must reject unsupported MIME types, malformed base64, oversized payloads, and missing images. The current function also receives a browser-supplied API key; that compatibility behavior remains until the credential migration is approved, but the target contract must not require an API key from the browser.

### Response `202 Accepted`

```json
{
  "analysis_id": "analysis_01J...",
  "status": "analyzing",
  "created_at": "2026-10-21T12:00:00Z"
}
```

If the current synchronous function is retained temporarily, it may return the completed analysis in the response while the frontend migrates to the resource-based contract.

## POST `/analysis/{id}/evidence`

### Purpose

Add evidence after the initial scan, such as another image, a user answer, a barcode, or a manual correction.

### Request

```json
{
  "evidence": {
    "kind": "user_answer",
    "source": "user_answer",
    "field": "functional_condition",
    "value": "works_normally",
    "description": "The item turns on and operates normally."
  }
}
```

### Response `200 OK`

```json
{
  "analysis_id": "analysis_01J...",
  "status": "evidence_added",
  "evidence_id": "evidence_02",
  "updated_fields": ["condition.functional"]
}
```

Evidence must be associated with the analysis owner. It must not silently overwrite the original evidence; corrections should be recorded as new evidence.

## GET `/analysis/{id}`

### Purpose

Retrieve the current analysis, evidence, confidence, uncertainty, and missing information.

### Response `200 OK`

```json
{
  "analysis_id": "analysis_01J...",
  "status": "complete",
  "analysis": {
    "item": {
      "type": { "value": "glass bottle", "confidence": 0.94 },
      "brand": { "value": "unknown", "confidence": 0 },
      "model": { "value": "not_applicable", "confidence": 1 }
    },
    "condition": {
      "visible": {
        "status": "observed",
        "summary": "Bottle appears intact.",
        "damage": [],
        "evidence_ids": ["evidence_01"]
      },
      "functional": {
        "status": "not_applicable",
        "summary": "Function does not apply to this item.",
        "evidence_ids": []
      }
    },
    "evidence": [],
    "confidence": {
      "overall": 0.91,
      "level": "high",
      "uncertainties": []
    },
    "missing_information": []
  }
}
```

## POST `/analysis/{id}/recommend`

### Purpose

Run the decision engine using the current analysis and all available evidence.

### Request

```json
{
  "requested_goal": "keep_item_out_of_landfill"
}
```

### Response `200 OK`

```json
{
  "analysis_id": "analysis_01J...",
  "recommendation": {
    "action": "recycle",
    "explanation": "The clean glass bottle is suitable for glass recycling where accepted.",
    "confidence": 0.89,
    "uncertainty": ["local_acceptance_rules"],
    "next_question": null,
    "alternatives": []
  }
}
```

If required evidence is missing, the response must say so and return a question rather than pretending the item is functional or broken.

## GET `/analysis/{id}/nearby`

### Purpose

Find nearby services relevant to the recommendation.

### Query parameters

- `latitude`: required decimal latitude.
- `longitude`: required decimal longitude.
- `radius_meters`: optional integer, default 5000, capped by the server.
- `service_type`: optional `repair`, `reuse`, `donate`, `recycle`, or `hazardous`.

### Response `200 OK`

```json
{
  "analysis_id": "analysis_01J...",
  "center": { "latitude": 12.345, "longitude": 67.89 },
  "services": [
    {
      "id": "osm_node_123",
      "name": "Example Recycling Center",
      "service_type": "recycle",
      "latitude": 12.35,
      "longitude": 67.88,
      "distance_meters": 1240,
      "accepted_materials": ["glass"],
      "acceptance_status": "unknown",
      "source": "openstreetmap_overpass",
      "source_url": "https://www.openstreetmap.org/",
      "uncertainty": ["opening_hours"]
    }
  ]
}
```

Location permission remains a browser concern. The server must validate coordinate ranges and avoid treating a failed facility lookup as proof that no facility exists.

## GET `/history`

### Purpose

Retrieve the current user's analysis history. This is currently implemented by direct Supabase queries from `src/lib/supabase.ts` and is not yet an Edge Function route.

### Query parameters

- `limit`: optional integer, capped by the server.
- `cursor`: optional pagination cursor.
- `action`: optional action filter.

### Response `200 OK`

```json
{
  "items": [
    {
      "analysis_id": "analysis_01J...",
      "item_name": "glass bottle",
      "material": "glass",
      "action": "recycle",
      "condition_assessment": "Intact and empty.",
      "created_at": "2026-10-21T12:00:00Z"
    }
  ],
  "next_cursor": null
}
```

During the compatibility period, this response is derived from the existing `scan_history` columns. Rich analysis fields must be added through a future schema change rather than changing the existing table in this phase.

## Authentication and ownership

### Current application

- No authentication UI or session handling exists.
- The Edge Function has JWT verification disabled.
- The `scan_history` table is intentionally public/shared under the current RLS policies.
- The browser sends a user-supplied Gemini key to the Edge Function.

### Target behavior

Before private history or user-specific evidence is shipped:

1. Add a complete Supabase email/password authentication flow.
2. Require authenticated requests for analysis resources.
3. Add an owner field with a database default of `auth.uid()`.
4. Use separate SELECT, INSERT, UPDATE, and DELETE ownership policies.
5. Never trust an owner ID supplied by the browser.
6. Keep Gemini credentials in server-side secret storage rather than browser storage.

## Error contract

All logical operations should use this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The image MIME type is not supported.",
    "request_id": "req_01J...",
    "details": {
      "field": "image.mime_type"
    }
  }
}
```

Recommended codes:

- `VALIDATION_ERROR` — malformed or missing input.
- `UNAUTHORIZED` — no valid session when authentication is required.
- `FORBIDDEN` — resource belongs to another user.
- `NOT_FOUND` — analysis ID does not exist or is not visible to the caller.
- `AI_UNAVAILABLE` — Gemini is unavailable, overloaded, or timed out.
- `AI_INVALID_RESPONSE` — Gemini returned an unusable response.
- `LOCATION_UNAVAILABLE` — geolocation or facility provider failed.
- `RATE_LIMITED` — request quota exceeded.
- `INTERNAL_ERROR` — unexpected server failure.

The current `analyze-waste` function returns a simpler `{ "error": "..." }` shape. Existing behavior must remain compatible until the frontend and Edge Function are migrated together.

## Future schema separation

### Existing schema — unchanged in Phase 1

`public.scan_history` remains the only application table. No columns are added, removed, renamed, or changed in this phase.

### Proposed future schema — not implemented

A future migration may introduce separate resources such as:

- `analyses` — analysis status, owner, timestamps, current recommendation, and normalized item fields.
- `analysis_evidence` — images, user answers, corrections, evidence source, and reliability.
- `recommendations` — action, explanation, confidence, uncertainty, and decision-engine version.
- `nearby_services_cache` — normalized external facility results and source timestamps.

These names are proposals only. They require a security review, ownership model, retention policy, and migration plan before implementation.

## Files expected to change in the next implementation phase

- `src/lib/supabase.ts` — add typed contract clients while preserving existing functions during migration.
- `src/App.tsx` — orchestrate the new start/evidence/recommend flow without rebuilding the current UI.
- `src/components/ScanResult.tsx` — show recommendation explanation, confidence, uncertainty, and next question.
- `src/components/MapOverlay.tsx` — consume typed nearby services and safely render external text.
- `supabase/functions/analyze-waste/index.ts` — validate richer AI output and preserve the current response during transition, or split a new function only if approved.
- A future decision-engine module — only after the contract is accepted.
- A future database migration — only after schema and ownership approval.

No files in this list are changed by the documentation phase.
