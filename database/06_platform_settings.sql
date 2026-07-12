-- ==============================================================================
-- 06_platform_settings.sql
-- Creates a global settings table to toggle registration platforms on/off
-- ==============================================================================

-- Create the platform_settings table
CREATE TABLE platform_settings (
    id SERIAL PRIMARY KEY,
    whatsapp_enabled BOOLEAN DEFAULT true NOT NULL,
    instagram_enabled BOOLEAN DEFAULT true NOT NULL,
    messenger_enabled BOOLEAN DEFAULT true NOT NULL,
    sms_enabled BOOLEAN DEFAULT true NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the single default row
INSERT INTO platform_settings (id, whatsapp_enabled, instagram_enabled, messenger_enabled, sms_enabled)
VALUES (1, true, true, true, true)
ON CONFLICT DO NOTHING;

-- Set up Row Level Security
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access so the landing page can fetch the settings
CREATE POLICY "Public can view platform_settings" 
ON platform_settings FOR SELECT 
TO public 
USING (true);

-- Optional: If you want to secure updates, you can add a policy here,
-- but since we use the service_role key for admin actions on the backend/server-side,
-- the service_role bypasses RLS automatically.
