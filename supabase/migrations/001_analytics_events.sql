-- Analytics events table for tracking user actions
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  feature TEXT NOT NULL,
  user_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by event type and feature
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_feature ON analytics_events(event_type, feature);

-- Enable Row Level Security (optional - adjust as needed)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anon insert (service role bypasses RLS)
CREATE POLICY "Allow anon inserts" ON analytics_events
  FOR INSERT TO anon USING (true);

-- Allow service role all access
CREATE POLICY "Service role all" ON analytics_events
  FOR ALL TO service_role USING (true);
