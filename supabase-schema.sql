-- HHub Database Schema
-- Run in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Base profile (linked to auth.users)
CREATE TABLE profiles (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role       TEXT CHECK (role IN ('qa','company','admin')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QA profiles
CREATE TABLE qa_profiles (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name           TEXT NOT NULL DEFAULT '',
  photo_url           TEXT,
  title               TEXT NOT NULL DEFAULT '',
  bio                 TEXT NOT NULL DEFAULT '',
  years_experience    INTEGER NOT NULL DEFAULT 0,
  skills              TEXT[] NOT NULL DEFAULT '{}',
  availability        TEXT CHECK (availability IN ('full-time','part-time','freelance','not-available')) DEFAULT 'freelance',
  hourly_rate         INTEGER,
  location            TEXT NOT NULL DEFAULT '',
  linkedin_url        TEXT,
  github_url          TEXT,
  verification_status TEXT CHECK (verification_status IN ('pending','verified','rejected')) DEFAULT 'pending',
  verification_note   TEXT,
  is_public           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Certificates
CREATE TABLE certificates (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  qa_profile_id  UUID REFERENCES qa_profiles(id) ON DELETE CASCADE NOT NULL,
  name           TEXT NOT NULL,
  issuer         TEXT NOT NULL,
  certificate_id TEXT NOT NULL DEFAULT '',
  issued_date    DATE,
  description    TEXT NOT NULL DEFAULT '',
  image_url      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Company profiles
CREATE TABLE company_profiles (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  logo_url     TEXT,
  website      TEXT,
  description  TEXT NOT NULL DEFAULT '',
  industry     TEXT NOT NULL DEFAULT '',
  company_size TEXT NOT NULL DEFAULT '',
  location     TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Connection requests
CREATE TABLE connection_requests (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT CHECK (status IN ('pending','accepted','declined')) DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

-- Conversations
CREATE TABLE conversations (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_1 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  participant_2 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES connection_requests(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content         TEXT,
  file_url        TEXT,
  file_type       TEXT CHECK (file_type IN ('image','file')),
  file_name       TEXT,
  file_size       INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Blog posts
CREATE TABLE blog_posts (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title          TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  excerpt        TEXT NOT NULL DEFAULT '',
  content        TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  category       TEXT CHECK (category IN ('article','guide','interview','case-study')) DEFAULT 'article',
  published      BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts          ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Own profile" ON profiles FOR ALL USING (auth.uid() = user_id);

-- qa_profiles
CREATE POLICY "QA own"    ON qa_profiles FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "QA public" ON qa_profiles FOR SELECT USING (is_public = TRUE AND verification_status = 'verified');

-- certificates
CREATE POLICY "Cert owner"  ON certificates FOR ALL    USING (EXISTS (SELECT 1 FROM qa_profiles WHERE id = certificates.qa_profile_id AND user_id = auth.uid()));
CREATE POLICY "Cert public" ON certificates FOR SELECT USING (TRUE);

-- company_profiles
CREATE POLICY "Co own"    ON company_profiles FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Co public" ON company_profiles FOR SELECT USING (TRUE);

-- connection_requests
CREATE POLICY "Conn participants" ON connection_requests FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- conversations
CREATE POLICY "Conv participants" ON conversations FOR ALL USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- messages
CREATE POLICY "Msg participants" ON messages FOR ALL USING (
  EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id AND (participant_1 = auth.uid() OR participant_2 = auth.uid()))
);

-- blog_posts
CREATE POLICY "Posts public"  ON blog_posts FOR SELECT USING (published = TRUE);
CREATE POLICY "Posts admin"   ON blog_posts FOR ALL    USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER qa_updated    BEFORE UPDATE ON qa_profiles         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER co_updated    BEFORE UPDATE ON company_profiles    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER conn_updated  BEFORE UPDATE ON connection_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER post_updated  BEFORE UPDATE ON blog_posts          FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- STORAGE BUCKETS (create manually in Supabase UI)
-- avatars       — public, 5 MB
-- certificates  — public, 5 MB
-- company-logos — public, 2 MB
-- chat-files    — private, 5 MB
-- blog-covers   — public, 5 MB
-- ============================================

-- ============================================
-- ADDITIONAL TABLES (run these after main schema)
-- ============================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL DEFAULT '',
  link       TEXT,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_id   TEXT NOT NULL,
  target_type TEXT CHECK (target_type IN ('qa','company')) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_id, target_type)
);
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own favorites" ON favorites FOR ALL USING (auth.uid() = user_id);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating      INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reviewer_id, target_id)
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read reviews" ON reviews FOR SELECT USING (TRUE);
CREATE POLICY "Write own review" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Update own review" ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);

-- Portfolio items for QA specialists
CREATE TABLE IF NOT EXISTS portfolio_items (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  qa_profile_id  UUID REFERENCES qa_profiles(id) ON DELETE CASCADE NOT NULL,
  title          TEXT NOT NULL,
  company        TEXT NOT NULL DEFAULT '',
  description    TEXT NOT NULL DEFAULT '',
  skills_used    TEXT[] NOT NULL DEFAULT '{}',
  start_date     DATE,
  end_date       DATE,
  is_current     BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolio owner" ON portfolio_items FOR ALL USING (
  EXISTS (SELECT 1 FROM qa_profiles WHERE id = portfolio_items.qa_profile_id AND user_id = auth.uid())
);
CREATE POLICY "Portfolio public" ON portfolio_items FOR SELECT USING (TRUE);

-- Admin policies for new tables
CREATE POLICY "Admin notifications" ON notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Team members (for /team page, managed via admin)
CREATE TABLE IF NOT EXISTS team_members (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL,
  photo_url    TEXT,
  linkedin_url TEXT,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view team" ON team_members FOR SELECT USING (TRUE);
CREATE POLICY "Admin manages team" ON team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ============================================
-- V4 ADDITIONS — run these in Supabase SQL Editor
-- ============================================

-- Add read column to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE;

-- Group conversations
CREATE TABLE IF NOT EXISTS group_conversations (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  member_ids  TEXT[] NOT NULL DEFAULT '{}',
  created_by  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE group_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members access" ON group_conversations FOR ALL USING (
  auth.uid()::text = ANY(member_ids)
);

-- Group messages use same messages table but filtered by is_group=true
-- group conversation_id references group_conversations.id

-- Fix storage: allow authenticated uploads to chat-files
-- Run in Supabase Storage → chat-files bucket → Policies:
-- INSERT: authenticated users
-- SELECT: authenticated users  
-- (Already done in previous schema, this is a reminder)

-- Enable realtime for group_conversations
ALTER PUBLICATION supabase_realtime ADD TABLE group_conversations;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_connection_requests_receiver ON connection_requests(receiver_id, status);

-- Add bio to team_members
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS bio TEXT;

-- ============================================
-- V5 ADDITIONS
-- ============================================

-- Group messages (separate from direct messages for clean architecture)
CREATE TABLE IF NOT EXISTS group_messages (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id   UUID REFERENCES group_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content    TEXT,
  file_url   TEXT,
  file_type  TEXT CHECK (file_type IN ('image','file')),
  file_name  TEXT,
  file_size  INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group msg access" ON group_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM group_conversations WHERE id = group_messages.group_id AND auth.uid()::text = ANY(member_ids))
);

-- Add description to group_conversations
ALTER TABLE group_conversations ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Add read column to messages if not exists
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;

-- Enable realtime for group_messages
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_group_msgs_group ON group_messages(group_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id, read, created_at);
CREATE INDEX IF NOT EXISTS idx_conn_receiver ON connection_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_qa_verified ON qa_profiles(verification_status, is_public);

-- ============================================
-- V6 FIXES
-- ============================================

-- Fix admin seeing all users
CREATE POLICY "Admin read all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p2 WHERE p2.user_id = auth.uid() AND p2.role = 'admin')
);

-- Add sequential display_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_id SERIAL;

-- Admin can read all QA profiles (already exists but let's make sure)
DROP POLICY IF EXISTS "Admin read all QA" ON qa_profiles;
CREATE POLICY "Admin read all QA" ON qa_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Admin can read all company profiles
DROP POLICY IF EXISTS "Admin read all companies" ON company_profiles;
CREATE POLICY "Admin read all companies" ON company_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
