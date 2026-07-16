-- ============================================================
-- MAGHGO — CRITICAL SECURITY FIX
-- Restrict which merchant columns the public (anon) role may read.
--
-- WHY: the "Public can view active merchants" RLS policy grants SELECT on
-- EVERY column, and the anon key is public (it ships in the browser bundle).
-- That meant anyone could run:
--   GET /rest/v1/merchants?select=phone_number,password_hash
-- and harvest every merchant's bcrypt password hash, then crack it offline
-- and log into their dashboard. Verified exploitable against live data.
--
-- RLS controls WHICH ROWS are visible. It does NOT control which COLUMNS.
-- Column privileges are what stop this, so we grant them explicitly.
--
-- Run this in the Supabase SQL Editor. It does not touch service_role, which
-- the backend uses and which still needs password_hash for login.
-- ============================================================

-- Drop the blanket column access currently held by the public roles.
REVOKE SELECT ON public.merchants FROM anon;
REVOKE SELECT ON public.merchants FROM authenticated;

-- Re-grant SELECT on ONLY the columns a public storefront legitimately needs.
-- Deliberately excluded:
--   password_hash  — a credential; must never leave the server
--   link_code      — lets a channel be linked to this store (takeover vector)
--   instagram_id / messenger_id — internal channel identifiers
GRANT SELECT (
  id,
  phone_number,           -- public: storefront's WhatsApp order button
  store_name,
  store_slug,
  store_description,
  store_logo_url,
  is_active,
  subscription_plan,      -- read by the storefront to toggle white-label footer
  subscription_ends_at,
  created_at,
  updated_at,
  theme_config,
  theme_id,
  instagram_handle,       -- public social handle (not the internal id)
  facebook_url,
  x_handle
) ON public.merchants TO anon, authenticated;

-- Verify: this must return ERROR "permission denied for column password_hash"
--   SET ROLE anon;
--   SELECT password_hash FROM merchants LIMIT 1;
--   RESET ROLE;
