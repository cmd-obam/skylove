-- ============================================================
-- Member PII access audit log + list phone column
-- Super admin only. Never stores secrets (password/tokens/etc).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.member_pii_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  viewer_name text NOT NULL DEFAULT '',
  target_user_id uuid NOT NULL,
  target_name text NOT NULL DEFAULT '',
  field_name text NOT NULL
    CHECK (field_name IN ('email', 'phone')),
  context text NOT NULL DEFAULT 'detail'
    CHECK (context IN ('list', 'detail')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_pii_access_logs_created_idx
  ON public.member_pii_access_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS member_pii_access_logs_viewer_idx
  ON public.member_pii_access_logs (viewer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS member_pii_access_logs_target_idx
  ON public.member_pii_access_logs (target_user_id, created_at DESC);

ALTER TABLE public.member_pii_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read pii access logs" ON public.member_pii_access_logs;
CREATE POLICY "Super admins read pii access logs"
  ON public.member_pii_access_logs
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Inserts go through SECURITY DEFINER RPC only (no direct INSERT policy)

COMMENT ON TABLE public.member_pii_access_logs IS
  '감사 로그: 최고관리자의 회원 이메일/휴대폰 전체보기 조회 기록. 비밀번호·토큰 등 비밀값은 저장하지 않음.';

-- ---------- Reveal + log (returns plaintext field only) ----------
CREATE OR REPLACE FUNCTION public.reveal_member_pii_for_super_admin(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_uid uuid := auth.uid();
  v_viewer_name text := '';
  v_target_user_id uuid;
  v_target_name text := '';
  v_field_name text;
  v_context text;
  v_value text;
BEGIN
  IF v_viewer_uid IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  IF p_payload IS NULL THEN
    RAISE EXCEPTION '요청 데이터가 없습니다.';
  END IF;

  v_target_user_id := nullif(trim(p_payload->>'target_user_id'), '')::uuid;
  v_field_name := lower(trim(coalesce(p_payload->>'field_name', '')));
  v_context := lower(trim(coalesce(p_payload->>'context', 'detail')));
  v_target_name := trim(coalesce(p_payload->>'target_name', ''));

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION '대상 회원 ID가 없습니다.';
  END IF;

  IF v_field_name NOT IN ('email', 'phone') THEN
    RAISE EXCEPTION '조회할 수 없는 항목입니다.';
  END IF;

  IF v_context NOT IN ('list', 'detail') THEN
    v_context := 'detail';
  END IF;

  SELECT coalesce(nullif(trim(p.name), ''), '')
  INTO v_viewer_name
  FROM public.profiles AS p
  WHERE p.user_id = v_viewer_uid;

  SELECT
    CASE v_field_name
      WHEN 'email' THEN p.email
      WHEN 'phone' THEN p.phone
    END,
    coalesce(nullif(trim(p.name), ''), v_target_name)
  INTO v_value, v_target_name
  FROM public.profiles AS p
  WHERE p.user_id = v_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '회원을 찾을 수 없습니다.';
  END IF;

  INSERT INTO public.member_pii_access_logs (
    viewer_user_id,
    viewer_name,
    target_user_id,
    target_name,
    field_name,
    context
  )
  VALUES (
    v_viewer_uid,
    coalesce(v_viewer_name, ''),
    v_target_user_id,
    coalesce(v_target_name, ''),
    v_field_name,
    v_context
  );

  RETURN jsonb_build_object(
    'success', true,
    'field_name', v_field_name,
    'value', coalesce(v_value, '')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reveal_member_pii_for_super_admin(jsonb) TO authenticated;

-- ---------- List includes phone (display masked on client) ----------
DROP FUNCTION IF EXISTS public.list_profiles_for_super_admin(text);

CREATE OR REPLACE FUNCTION public.list_profiles_for_super_admin(p_search text DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  username text,
  name text,
  email text,
  phone text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.name,
    p.email,
    p.phone,
    lower(trim(p.role)) AS role,
    p.created_at
  FROM public.profiles AS p
  WHERE (
    p_search IS NULL
    OR trim(p_search) = ''
    OR p.name ILIKE '%' || trim(p_search) || '%'
    OR p.email ILIKE '%' || trim(p_search) || '%'
    OR coalesce(p.phone, '') ILIKE '%' || trim(p_search) || '%'
  )
  ORDER BY
    CASE lower(trim(p.role))
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'manager' THEN 3
      WHEN 'member' THEN 4
      ELSE 5
    END,
    p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_profiles_for_super_admin(text) TO authenticated;

-- Optional: future audit UI can list logs via this RPC
CREATE OR REPLACE FUNCTION public.list_member_pii_access_logs_for_super_admin(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  viewer_user_id uuid,
  viewer_name text,
  target_user_id uuid,
  target_name text,
  field_name text,
  context text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION '접근 권한이 없습니다.';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.viewer_user_id,
    l.viewer_name,
    l.target_user_id,
    l.target_name,
    l.field_name,
    l.context,
    l.created_at
  FROM public.member_pii_access_logs AS l
  ORDER BY l.created_at DESC
  LIMIT greatest(1, least(200, coalesce(p_limit, 50)))
  OFFSET greatest(0, coalesce(p_offset, 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_member_pii_access_logs_for_super_admin(int, int) TO authenticated;

NOTIFY pgrst, 'reload schema';
