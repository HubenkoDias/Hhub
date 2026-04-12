-- ============================================================
-- HHUB v14 SQL — Run in Supabase SQL Editor
-- ============================================================

-- Fix message read policy (ROOT CAUSE of unread bug)
DROP POLICY IF EXISTS "msg_update" ON messages;
CREATE POLICY "msg_update" ON messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = messages.conversation_id
    AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
  )
);

-- Job postings (if not already created in v13)
CREATE TABLE IF NOT EXISTS job_postings (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  requirements     TEXT,
  skills           TEXT[] DEFAULT '{}',
  employment_type  TEXT,
  location         TEXT,
  remote           BOOLEAN DEFAULT true,
  salary_min       INTEGER,
  salary_max       INTEGER,
  currency         TEXT DEFAULT 'USD',
  is_active        BOOLEAN DEFAULT true,
  applications_count INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist and recreate
DROP POLICY IF EXISTS "jobs_select" ON job_postings;
DROP POLICY IF EXISTS "jobs_insert" ON job_postings;
DROP POLICY IF EXISTS "jobs_update" ON job_postings;
DROP POLICY IF EXISTS "jobs_delete" ON job_postings;

CREATE POLICY "jobs_select" ON job_postings FOR SELECT USING (true);
CREATE POLICY "jobs_insert" ON job_postings FOR INSERT WITH CHECK (auth.uid() = company_id);
CREATE POLICY "jobs_update" ON job_postings FOR UPDATE USING (auth.uid() = company_id);
CREATE POLICY "jobs_delete" ON job_postings FOR DELETE USING (auth.uid() = company_id);

-- Job applications
CREATE TABLE IF NOT EXISTS job_applications (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id       UUID REFERENCES job_postings(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cover_letter TEXT,
  status       TEXT DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apps_select" ON job_applications;
DROP POLICY IF EXISTS "apps_insert" ON job_applications;
DROP POLICY IF EXISTS "apps_update" ON job_applications;
CREATE POLICY "apps_select" ON job_applications FOR SELECT USING (
  auth.uid() = applicant_id OR
  EXISTS (SELECT 1 FROM job_postings WHERE id = job_id AND company_id = auth.uid())
);
CREATE POLICY "apps_insert" ON job_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "apps_update" ON job_applications FOR UPDATE USING (
  auth.uid() = applicant_id OR
  EXISTS (SELECT 1 FROM job_postings WHERE id = job_id AND company_id = auth.uid())
);

-- Profile views analytics
CREATE TABLE IF NOT EXISTS profile_views (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID NOT NULL,
  viewer_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "views_insert" ON profile_views;
DROP POLICY IF EXISTS "views_select" ON profile_views;
CREATE POLICY "views_insert" ON profile_views FOR INSERT WITH CHECK (true);
CREATE POLICY "views_select" ON profile_views FOR SELECT USING (
  auth.uid() = profile_id OR
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Add missing columns
ALTER TABLE qa_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply TEXT;
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS links TEXT[] DEFAULT '{}';

-- Mark existing QA profiles as onboarding completed
UPDATE qa_profiles SET onboarding_completed = true
WHERE full_name IS NOT NULL AND full_name != '' AND full_name != 'sssssss' AND length(full_name) > 2;

-- Group delete policies
DROP POLICY IF EXISTS "grp_conv_delete" ON group_conversations;
CREATE POLICY "grp_conv_delete" ON group_conversations FOR DELETE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "grp_msg_delete" ON group_messages;
CREATE POLICY "grp_msg_delete" ON group_messages FOR DELETE USING (
  auth.uid() = sender_id OR
  EXISTS (SELECT 1 FROM group_conversations WHERE id = group_id AND created_by = auth.uid())
);

-- Enable realtime for job tables
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE job_postings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Verify
SELECT 'messages' as tbl, count(*) FROM messages
UNION ALL SELECT 'job_postings', count(*) FROM job_postings
UNION ALL SELECT 'profiles', count(*) FROM profiles
UNION ALL SELECT 'qa_profiles', count(*) FROM qa_profiles;
