-- ============================================================
-- THEMES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  plan_required VARCHAR(20) DEFAULT 'basic',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ALTER MERCHANTS
-- ============================================================
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES themes(id) ON DELETE SET NULL;

-- ============================================================
-- RLS FOR THEMES
-- ============================================================
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active themes"
  ON themes FOR SELECT TO anon
  USING (is_active = true);

CREATE TRIGGER update_themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
