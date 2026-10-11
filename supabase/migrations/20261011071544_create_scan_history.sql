/*
# Create scan_history table (single-tenant, no auth)

1. New Tables
- `scan_history`
  - `id` (uuid, primary key)
  - `item_name` (text, name of scanned item)
  - `material` (text, material type identified)
  - `action` (text, one of: recycle, donate, trash, hazardous)
  - `condition_assessment` (text, AI condition assessment)
  - `image_data` (text, base64 thumbnail of scanned image, optional)
  - `latitude` (float8, optional geolocation lat)
  - `longitude` (float8, optional geolocation lng)
  - `saved_from_landfill` (boolean, true if action is recycle/donate/hazardous)
  - `created_at` (timestamptz, default now)

2. Security
- Enable RLS on `scan_history`.
- Single-tenant app with no sign-in: allow anon + authenticated full CRUD.
- `USING (true)` is acceptable here because the data is intentionally public/shared (no auth).

3. Notes
- The `saved_from_landfill` column lets us quickly count items diverted from landfill.
- `image_data` stores a small base64 thumbnail so history entries show what was scanned.
*/

CREATE TABLE IF NOT EXISTS scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  material text NOT NULL,
  action text NOT NULL CHECK (action IN ('recycle', 'donate', 'trash', 'hazardous')),
  condition_assessment text NOT NULL DEFAULT '',
  image_data text,
  latitude float8,
  longitude float8,
  saved_from_landfill boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scan_history" ON scan_history;
CREATE POLICY "anon_select_scan_history" ON scan_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scan_history" ON scan_history;
CREATE POLICY "anon_insert_scan_history" ON scan_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scan_history" ON scan_history;
CREATE POLICY "anon_update_scan_history" ON scan_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scan_history" ON scan_history;
CREATE POLICY "anon_delete_scan_history" ON scan_history FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON scan_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_history_action ON scan_history (action);
