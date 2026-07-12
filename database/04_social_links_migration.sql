-- ============================================================
-- 4. SOCIAL MEDIA LINKS MIGRATION
-- ============================================================

ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(100),
ADD COLUMN IF NOT EXISTS facebook_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS x_handle VARCHAR(100);

-- Update seed data to include dummy social links for testing
UPDATE merchants 
SET instagram_handle = 'goatech.tech',
    facebook_url = 'https://facebook.com/goatech',
    x_handle = 'goatechHQ'
WHERE phone_number IN ('919876543210', '919876543211');
