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
