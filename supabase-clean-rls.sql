-- ============================================================
-- HHUB — CLEAN RLS RESET
-- Удаляет все старые политики и создаёт одну чистую систему
-- ============================================================

-- ── 1. УДАЛИТЬ ВСЕ СТАРЫЕ ПОЛИТИКИ ──────────────────────────

DROP POLICY IF EXISTS "Posts admin" ON blog_posts;
DROP POLICY IF EXISTS "Posts public" ON blog_posts;

DROP POLICY IF EXISTS "Cert owner" ON certificates;
DROP POLICY IF EXISTS "Cert public" ON certificates;

DROP POLICY IF EXISTS "Admin read all companies" ON company_profiles;
DROP POLICY IF EXISTS "Anyone can read company profiles" ON company_profiles;
DROP POLICY IF EXISTS "Co insert own" ON company_profiles;
DROP POLICY IF EXISTS "Co own" ON company_profiles;
DROP POLICY IF EXISTS "Co public" ON company_profiles;
DROP POLICY IF EXISTS "Co update own" ON company_profiles;
DROP POLICY IF EXISTS "Users can insert own company profile" ON company_profiles;
DROP POLICY IF EXISTS "Users can update own company profile" ON company_profiles;

DROP POLICY IF EXISTS "Conn participants" ON connection_requests;

DROP POLICY IF EXISTS "Conv insert" ON conversations;
DROP POLICY IF EXISTS "Conv participants" ON conversations;

DROP POLICY IF EXISTS "Own favorites" ON favorites;

DROP POLICY IF EXISTS "Group members access" ON group_conversations;
DROP POLICY IF EXISTS "Group msg access" ON group_messages;

DROP POLICY IF EXISTS "Msg insert" ON messages;
DROP POLICY IF EXISTS "Msg participants" ON messages;

DROP POLICY IF EXISTS "Own notifications" ON notifications;

DROP POLICY IF EXISTS "Portfolio owner" ON portfolio_items;
DROP POLICY IF EXISTS "Portfolio public" ON portfolio_items;

DROP POLICY IF EXISTS "Admin read all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Own profile" ON profiles;
DROP POLICY IF EXISTS "Profile insert" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Admin read all QA" ON qa_profiles;
DROP POLICY IF EXISTS "Admin update QA" ON qa_profiles;
DROP POLICY IF EXISTS "Anyone can read QA profiles" ON qa_profiles;
DROP POLICY IF EXISTS "QA insert own" ON qa_profiles;
DROP POLICY IF EXISTS "QA own" ON qa_profiles;
DROP POLICY IF EXISTS "QA public" ON qa_profiles;
DROP POLICY IF EXISTS "QA update own" ON qa_profiles;
DROP POLICY IF EXISTS "Users can insert own QA profile" ON qa_profiles;
DROP POLICY IF EXISTS "Users can update own QA profile" ON qa_profiles;

DROP POLICY IF EXISTS "Read reviews" ON reviews;
DROP POLICY IF EXISTS "Update own review" ON reviews;
DROP POLICY IF EXISTS "Write own review" ON reviews;

DROP POLICY IF EXISTS "Admin manages team" ON team_members;
DROP POLICY IF EXISTS "Anyone can view team" ON team_members;

-- ── 2. СОЗДАТЬ ЧИСТЫЕ ПОЛИТИКИ ───────────────────────────────

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- qa_profiles
CREATE POLICY "qa_select" ON qa_profiles FOR SELECT USING (true);
CREATE POLICY "qa_insert" ON qa_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "qa_update" ON qa_profiles FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "qa_delete" ON qa_profiles FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- company_profiles
CREATE POLICY "co_select" ON company_profiles FOR SELECT USING (true);
CREATE POLICY "co_insert" ON company_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "co_update" ON company_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "co_delete" ON company_profiles FOR DELETE USING (auth.uid() = user_id);

-- certificates
CREATE POLICY "cert_select" ON certificates FOR SELECT USING (true);
CREATE POLICY "cert_insert" ON certificates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM qa_profiles WHERE id = qa_profile_id AND user_id = auth.uid())
);
CREATE POLICY "cert_update" ON certificates FOR UPDATE USING (
  EXISTS (SELECT 1 FROM qa_profiles WHERE id = qa_profile_id AND user_id = auth.uid())
);
CREATE POLICY "cert_delete" ON certificates FOR DELETE USING (
  EXISTS (SELECT 1 FROM qa_profiles WHERE id = qa_profile_id AND user_id = auth.uid())
);

-- portfolio_items
CREATE POLICY "portfolio_select" ON portfolio_items FOR SELECT USING (true);
CREATE POLICY "portfolio_insert" ON portfolio_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM qa_profiles WHERE id = qa_profile_id AND user_id = auth.uid())
);
CREATE POLICY "portfolio_update" ON portfolio_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM qa_profiles WHERE id = qa_profile_id AND user_id = auth.uid())
);
CREATE POLICY "portfolio_delete" ON portfolio_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM qa_profiles WHERE id = qa_profile_id AND user_id = auth.uid())
);

-- connection_requests
CREATE POLICY "conn_select" ON connection_requests FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
CREATE POLICY "conn_insert" ON connection_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "conn_update" ON connection_requests FOR UPDATE USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- conversations
CREATE POLICY "conv_select" ON conversations FOR SELECT USING (
  auth.uid() = participant_1 OR auth.uid() = participant_2
);
CREATE POLICY "conv_insert" ON conversations FOR INSERT WITH CHECK (
  auth.uid() = participant_1 OR auth.uid() = participant_2
);

-- messages
CREATE POLICY "msg_select" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
  )
);
CREATE POLICY "msg_insert" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
  )
);
CREATE POLICY "msg_update" ON messages FOR UPDATE USING (auth.uid() = sender_id);

-- group_conversations
CREATE POLICY "grp_conv_select" ON group_conversations FOR SELECT USING (
  auth.uid()::text = ANY(member_ids)
);
CREATE POLICY "grp_conv_insert" ON group_conversations FOR INSERT WITH CHECK (
  auth.uid() = created_by
);
CREATE POLICY "grp_conv_update" ON group_conversations FOR UPDATE USING (
  auth.uid() = created_by OR auth.uid()::text = ANY(member_ids)
);

-- group_messages
CREATE POLICY "grp_msg_select" ON group_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_conversations
    WHERE id = group_id AND auth.uid()::text = ANY(member_ids)
  )
);
CREATE POLICY "grp_msg_insert" ON group_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM group_conversations
    WHERE id = group_id AND auth.uid()::text = ANY(member_ids)
  )
);
CREATE POLICY "grp_msg_update" ON group_messages FOR UPDATE USING (auth.uid() = sender_id);

-- notifications
CREATE POLICY "notif_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- favorites
CREATE POLICY "fav_select" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fav_insert" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_delete" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- reviews
CREATE POLICY "rev_select" ON reviews FOR SELECT USING (true);
CREATE POLICY "rev_insert" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "rev_update" ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);

-- blog_posts
CREATE POLICY "blog_select" ON blog_posts FOR SELECT USING (published = true OR EXISTS (
  SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
));
CREATE POLICY "blog_all" ON blog_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- team_members
CREATE POLICY "team_select" ON team_members FOR SELECT USING (true);
CREATE POLICY "team_all" ON team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ── 3. ПОЧИНИТЬ ДАННЫЕ ───────────────────────────────────────

-- Создать qa_profiles для QA пользователей у которых их нет
INSERT INTO qa_profiles (user_id, full_name, skills, is_public, verification_status)
SELECT
  p.user_id,
  split_part(u.email, '@', 1),
  ARRAY[]::text[],
  true,
  'pending'
FROM profiles p
JOIN auth.users u ON u.id = p.user_id
LEFT JOIN qa_profiles qp ON qp.user_id = p.user_id
WHERE p.role IN ('qa', 'admin')
  AND qp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Создать company_profiles для Company пользователей у которых их нет
INSERT INTO company_profiles (user_id, company_name)
SELECT
  p.user_id,
  split_part(u.email, '@', 1)
FROM profiles p
JOIN auth.users u ON u.id = p.user_id
LEFT JOIN company_profiles cp ON cp.user_id = p.user_id
WHERE p.role = 'company'
  AND cp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Выставить is_public = true для всех qa_profiles
UPDATE qa_profiles SET is_public = true;

-- ── 4. ПРОВЕРКА ──────────────────────────────────────────────
SELECT
  'profiles' as tbl, count(*) FROM profiles
UNION ALL SELECT
  'qa_profiles', count(*) FROM qa_profiles
UNION ALL SELECT
  'company_profiles', count(*) FROM company_profiles;
