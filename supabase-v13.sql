-- ============================================================
-- HHUB v13 — Run this in Supabase SQL Editor
-- ============================================================

-- ── FIX 1: messages read policy ──────────────────────────────
-- The bug: receiver can't mark messages as read because policy only allows sender to update
-- Fix: participants in a conversation can update read status
DROP POLICY IF EXISTS "msg_update" ON messages;
CREATE POLICY "msg_update" ON messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
  )
);

-- ── FIX 2: group delete policies ─────────────────────────────
DROP POLICY IF EXISTS "grp_conv_delete" ON group_conversations;
CREATE POLICY "grp_conv_delete" ON group_conversations
  FOR DELETE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "grp_msg_delete" ON group_messages;
CREATE POLICY "grp_msg_delete" ON group_messages
  FOR DELETE USING (
    auth.uid() = sender_id OR
    EXISTS (SELECT 1 FROM group_conversations WHERE id = group_id AND created_by = auth.uid())
  );

-- ── NEW: job_postings table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS job_postings (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  requirements  TEXT,
  skills        TEXT[] DEFAULT '{}',
  employment_type TEXT CHECK (employment_type IN ('full-time','part-time','contract','freelance')),
  location      TEXT,
  remote        BOOLEAN DEFAULT true,
  salary_min    INTEGER,
  salary_max    INTEGER,
  currency      TEXT DEFAULT 'USD',
  is_active     BOOLEAN DEFAULT true,
  applications_count INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_select" ON job_postings FOR SELECT USING (is_active = true OR company_id = auth.uid());
CREATE POLICY "jobs_insert" ON job_postings FOR INSERT WITH CHECK (
  auth.uid() = company_id AND
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'company')
);
CREATE POLICY "jobs_update" ON job_postings FOR UPDATE USING (auth.uid() = company_id);
CREATE POLICY "jobs_delete" ON job_postings FOR DELETE USING (auth.uid() = company_id);

-- ── NEW: job_applications table ───────────────────────────────
CREATE TABLE IF NOT EXISTS job_applications (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id      UUID REFERENCES job_postings(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cover_letter TEXT,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','accepted','rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apps_select" ON job_applications FOR SELECT USING (
  auth.uid() = applicant_id OR
  EXISTS (SELECT 1 FROM job_postings WHERE id = job_id AND company_id = auth.uid())
);
CREATE POLICY "apps_insert" ON job_applications FOR INSERT WITH CHECK (
  auth.uid() = applicant_id AND
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('qa','admin'))
);
CREATE POLICY "apps_update" ON job_applications FOR UPDATE USING (
  auth.uid() = applicant_id OR
  EXISTS (SELECT 1 FROM job_postings WHERE id = job_id AND company_id = auth.uid())
);

-- ── reviews: add reply field ──────────────────────────────────
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ── NEW: profile_views analytics ─────────────────────────────
CREATE TABLE IF NOT EXISTS profile_views (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id  UUID NOT NULL,
  viewer_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "views_insert" ON profile_views FOR INSERT WITH CHECK (true);
CREATE POLICY "views_select" ON profile_views FOR SELECT USING (
  auth.uid() = profile_id OR
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE INDEX IF NOT EXISTS idx_profile_views_profile ON profile_views(profile_id, viewed_at DESC);

-- ── Ensure qa_profiles has is_public = true for all ──────────
UPDATE qa_profiles SET is_public = true WHERE is_public IS NULL OR is_public = false;

-- ── Add links field to portfolio_items ───────────────────────
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS links TEXT[] DEFAULT '{}';

-- ── Verify counts ────────────────────────────────────────────
SELECT tablename, count(*)
FROM (
  SELECT 'job_postings' as tablename FROM job_postings
  UNION ALL SELECT 'job_applications' FROM job_applications
  UNION ALL SELECT 'profile_views' FROM profile_views
) t
GROUP BY tablename;

-- Add onboarding_completed to qa_profiles
ALTER TABLE qa_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
-- Mark existing profiles as completed (they already have data)
UPDATE qa_profiles SET onboarding_completed = true WHERE full_name IS NOT NULL AND full_name != '' AND full_name != 'sssssss';
