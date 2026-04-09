-- ============================================
-- V8 SQL - Run these in Supabase SQL Editor
-- ============================================

-- 1. Add deleted column to messages (if not already done)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- 2. Slug columns
ALTER TABLE qa_profiles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS slug TEXT;

-- 3. Create unique index on slug (allows nulls)
CREATE UNIQUE INDEX IF NOT EXISTS qa_profiles_slug_idx ON qa_profiles(slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS company_profiles_slug_idx ON company_profiles(slug) WHERE slug IS NOT NULL;

-- 4. Slug generation function for QA
CREATE OR REPLACE FUNCTION generate_qa_slug() RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  IF NEW.full_name IS NOT NULL AND NEW.full_name != '' AND (TG_OP = 'INSERT' OR OLD.full_name IS DISTINCT FROM NEW.full_name) THEN
    base_slug := lower(
      regexp_replace(
        regexp_replace(trim(NEW.full_name), '[^a-zA-Z0-9\s]', '', 'g'),
        '\s+', '-', 'g'
      )
    );
    IF base_slug = '' OR base_slug = '-' THEN
      RETURN NEW;
    END IF;
    final_slug := base_slug;
    WHILE EXISTS (
      SELECT 1 FROM qa_profiles WHERE slug = final_slug AND user_id != NEW.user_id
    ) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS qa_profile_slug ON qa_profiles;
CREATE TRIGGER qa_profile_slug
  BEFORE INSERT OR UPDATE OF full_name ON qa_profiles
  FOR EACH ROW EXECUTE FUNCTION generate_qa_slug();

-- 5. Slug generation function for Companies
CREATE OR REPLACE FUNCTION generate_company_slug() RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  IF NEW.company_name IS NOT NULL AND NEW.company_name != '' AND (TG_OP = 'INSERT' OR OLD.company_name IS DISTINCT FROM NEW.company_name) THEN
    base_slug := lower(
      regexp_replace(
        regexp_replace(trim(NEW.company_name), '[^a-zA-Z0-9\s]', '', 'g'),
        '\s+', '-', 'g'
      )
    );
    IF base_slug = '' OR base_slug = '-' THEN
      RETURN NEW;
    END IF;
    final_slug := base_slug;
    WHILE EXISTS (
      SELECT 1 FROM company_profiles WHERE slug = final_slug AND user_id != NEW.user_id
    ) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS company_profile_slug ON company_profiles;
CREATE TRIGGER company_profile_slug
  BEFORE INSERT OR UPDATE OF company_name ON company_profiles
  FOR EACH ROW EXECUTE FUNCTION generate_company_slug();

-- 6. Admin can see all profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admin read all profiles'
  ) THEN
    CREATE POLICY "Admin read all profiles" ON profiles FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles p2 WHERE p2.user_id = auth.uid() AND p2.role = 'admin')
    );
  END IF;
END $$;

-- 7. Add display_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_id SERIAL;

-- 8. Allow chat-files storage for authenticated users (run in Storage → Policies if not done)
-- INSERT: (auth.role() = 'authenticated')
-- SELECT: (auth.role() = 'authenticated')

-- 9. Realtime for group_messages
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 10. Performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_group_msgs_group_created ON group_messages(group_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conn_requests_receiver ON connection_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_qa_profiles_verified ON qa_profiles(verification_status);
