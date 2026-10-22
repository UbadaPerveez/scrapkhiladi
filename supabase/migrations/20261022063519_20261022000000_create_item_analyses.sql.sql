/*
# Create item_analyses and analysis_evidence tables

1. New Tables
- `item_analyses`
  - `id` (uuid, primary key)
  - `image_data` (text, base64 thumbnail of scanned image)
  - `analysis_json` (jsonb, full structured analysis from Gemini)
  - `item_type` (text, identified item type or 'unknown')
  - `broad_category` (text, broad category like 'appliance', 'electronics', 'packaging')
  - `functional_condition` (text, one of: working, partially_working, not_working, intermittent, unknown)
  - `visible_condition` (text, description of visible condition)
  - `needs_more_information` (boolean, true if follow-up questions are needed)
  - `recommendation_json` (jsonb, full recommendation from decision engine)
  - `recommended_action` (text, one of: REPAIR, REUSE, DONATE, RESELL, RECYCLE, REPLACE, SPECIAL_DISPOSAL, NEEDS_MORE_INFORMATION)
  - `condition_assessment` (text, human-readable summary)
  - `latitude` (float8, optional geolocation lat)
  - `longitude` (float8, optional geolocation lng)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
- `analysis_evidence`
  - `id` (uuid, primary key)
  - `analysis_id` (uuid, foreign key to item_analyses.id ON DELETE CASCADE)
  - `kind` (text, evidence kind: image, user_answer, manual_correction, ocr, barcode)
  - `source` (text, where evidence came from: user_upload, user_answer, ai_inference)
  - `field` (text, which analysis field this evidence relates to)
  - `value` (text, the evidence value or answer)
  - `description` (text, human-readable description)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on both tables.
- Single-tenant app with no sign-in: allow anon + authenticated full CRUD.
- USING (true) is acceptable because the data is intentionally public/shared (no auth).

3. Notes
- The existing scan_history table is NOT modified.
- item_analyses stores the richer structured analysis separately.
- analysis_evidence stores user answers and additional photos linked to an analysis.
- updated_at is set to now() by default but should be updated when evidence is added or recommendation changes.
*/
CREATE TABLE IF NOT EXISTS item_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_data text,
  analysis_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  item_type text NOT NULL DEFAULT 'unknown',
  broad_category text NOT NULL DEFAULT 'unknown',
  functional_condition text NOT NULL DEFAULT 'unknown' CHECK (functional_condition IN ('working', 'partially_working', 'not_working', 'intermittent', 'unknown')),
  visible_condition text NOT NULL DEFAULT '',
  needs_more_information boolean NOT NULL DEFAULT false,
  recommendation_json jsonb,
  recommended_action text,
  condition_assessment text NOT NULL DEFAULT '',
  latitude float8,
  longitude float8,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE item_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_item_analyses" ON item_analyses;
CREATE POLICY "anon_select_item_analyses" ON item_analyses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_item_analyses" ON item_analyses;
CREATE POLICY "anon_insert_item_analyses" ON item_analyses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_item_analyses" ON item_analyses;
CREATE POLICY "anon_update_item_analyses" ON item_analyses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_item_analyses" ON item_analyses;
CREATE POLICY "anon_delete_item_analyses" ON item_analyses FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS analysis_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES item_analyses(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'user_answer',
  source text NOT NULL DEFAULT 'user_answer',
  field text NOT NULL DEFAULT '',
  value text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE analysis_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_analysis_evidence" ON analysis_evidence;
CREATE POLICY "anon_select_analysis_evidence" ON analysis_evidence FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_analysis_evidence" ON analysis_evidence;
CREATE POLICY "anon_insert_analysis_evidence" ON analysis_evidence FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_analysis_evidence" ON analysis_evidence;
CREATE POLICY "anon_update_analysis_evidence" ON analysis_evidence FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_analysis_evidence" ON analysis_evidence;
CREATE POLICY "anon_delete_analysis_evidence" ON analysis_evidence FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_item_analyses_created_at ON item_analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_evidence_analysis_id ON analysis_evidence (analysis_id);
