-- ═══════════════════════════════════════════════════
--  TownReport — Supabase Database Schema
--  Run this in your Supabase SQL Editor:
--  https://app.supabase.com → Your Project → SQL Editor
-- ═══════════════════════════════════════════════════

-- Create the reports table
CREATE TABLE IF NOT EXISTS reports (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  location      TEXT NOT NULL,
  category      TEXT,              -- AI-assigned: Water, Electricity, Roads, Waste, Other
  priority      TEXT,              -- AI-assigned: Low, Medium, High
  status        TEXT DEFAULT 'Open',  -- Open, In Progress, Resolved
  image_url     TEXT,              -- Optional uploaded image URL
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update the updated_at column on changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Allow anonymous reads and inserts (for the public form)
-- In production, you'd lock this down with Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a report"
  ON reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view reports"
  ON reports FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update report status"
  ON reports FOR UPDATE
  USING (true);

-- Helpful index for filtering
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority);
CREATE INDEX IF NOT EXISTS idx_reports_status   ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created  ON reports(created_at DESC);
