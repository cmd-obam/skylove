-- ============================================================
-- 회원 교인정보 저장/조회 통합
-- 선행: 008_security_questions.sql, 021_super_admin_content_cms.sql
--
-- 단일 컬럼:
--   profiles.congregant_type
--   profiles.attending_church
--
-- congregant_type:
--   own_church | other_church | newcomer
-- 새가족 여부는 congregant_type = 'newcomer' 로 계산하며 별도 저장하지 않음.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS congregant_type text,
  ADD COLUMN IF NOT EXISTS attending_church text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_congregant_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_congregant_type_check
      CHECK (
        congregant_type IS NULL
        OR congregant_type IN ('own_church', 'other_church', 'newcomer')
      );
  END IF;
END
$$;

-- 신규 가입 및 교인정보 수정 시 DB에서도 필수값을 검증한다.
-- UPDATE OF 트리거이므로 기존 교인정보가 빈 회원의 권한 변경 등에는 영향을 주지 않는다.
CREATE OR REPLACE FUNCTION public.validate_profile_church_information()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.congregant_type := NULLIF(lower(trim(NEW.congregant_type)), '');
  NEW.attending_church := NULLIF(trim(NEW.attending_church), '');

  IF NEW.congregant_type IS NULL
     OR NEW.congregant_type NOT IN ('own_church', 'other_church', 'newcomer') THEN
    RAISE EXCEPTION '교인 구분을 선택해주세요.';
  END IF;

  IF NEW.congregant_type = 'other_church' AND NEW.attending_church IS NULL THEN
    RAISE EXCEPTION '타 교회 교인은 출석 교회를 입력해야 합니다.';
  END IF;

  IF NEW.congregant_type = 'own_church' THEN
    NEW.attending_church := '하늘사랑교회';
  ELSIF NEW.congregant_type = 'newcomer' THEN
    NEW.attending_church := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_validate_church_information ON public.profiles;
CREATE TRIGGER profiles_validate_church_information
  BEFORE INSERT OR UPDATE OF congregant_type, attending_church
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_church_information();

-- 기존 유효 데이터도 동일한 저장 규칙으로 정규화한다.
UPDATE public.profiles
SET attending_church = CASE
  WHEN congregant_type = 'own_church' THEN '하늘사랑교회'
  ELSE NULL
END
WHERE congregant_type IN ('own_church', 'newcomer');

-- 이전 인자 수의 RPC가 남아 교인정보 없이 가입되는 것을 막는다.
DROP FUNCTION IF EXISTS public.create_profile_after_signup(
  uuid, text, text, date, text, text
);
DROP FUNCTION IF EXISTS public.create_profile_after_signup(
  uuid, text, text, date, text, text, text, text
);
DROP FUNCTION IF EXISTS public.create_profile_after_signup(
  uuid, text, text, date, text, text, text, text, text, text
);

CREATE FUNCTION public.create_profile_after_signup(
  p_user_id uuid,
  p_username text,
  p_name text,
  p_birth_date date,
  p_email text,
  p_phone text DEFAULT NULL,
  p_security_question text DEFAULT NULL,
  p_security_answer text DEFAULT NULL,
  p_congregant_type text DEFAULT NULL,
  p_attending_church text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_id uuid;
  answer_hash text;
  next_congregant_type text := NULLIF(lower(trim(p_congregant_type)), '');
  next_attending_church text := NULLIF(trim(p_attending_church), '');
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = p_user_id AND email = p_email
  ) THEN
    RAISE EXCEPTION 'User not found or email mismatch';
  END IF;

  IF next_congregant_type IS NULL
     OR next_congregant_type NOT IN ('own_church', 'other_church', 'newcomer') THEN
    RAISE EXCEPTION '교인 구분을 선택해주세요.';
  END IF;

  IF next_congregant_type = 'other_church' AND next_attending_church IS NULL THEN
    RAISE EXCEPTION '타 교회 교인은 출석 교회를 입력해야 합니다.';
  END IF;

  IF next_congregant_type = 'own_church' THEN
    next_attending_church := '하늘사랑교회';
  ELSIF next_congregant_type = 'newcomer' THEN
    next_attending_church := NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = p_username) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Profile already exists';
  END IF;

  IF p_security_question IS NOT NULL AND trim(p_security_question) <> '' THEN
    IF p_security_answer IS NULL OR trim(p_security_answer) = '' THEN
      RAISE EXCEPTION 'Security answer is required';
    END IF;

    answer_hash := crypt(trim(p_security_answer), gen_salt('bf'));
  END IF;

  INSERT INTO public.profiles (
    user_id,
    username,
    name,
    birth_date,
    email,
    phone,
    role,
    security_question,
    security_answer_hash,
    congregant_type,
    attending_church
  )
  VALUES (
    p_user_id,
    p_username,
    p_name,
    p_birth_date,
    p_email,
    p_phone,
    'member',
    NULLIF(trim(p_security_question), ''),
    answer_hash,
    next_congregant_type,
    next_attending_church
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_profile_after_signup(
  uuid, text, text, date, text, text, text, text, text, text
) TO anon, authenticated;

-- 최고관리자 상세조회가 profiles의 실제 교인정보 컬럼을 직접 반환한다.
DROP FUNCTION IF EXISTS public.get_member_detail_for_super_admin(uuid);

CREATE FUNCTION public.get_member_detail_for_super_admin(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  name text,
  email text,
  phone text,
  birth_date date,
  congregant_type text,
  attending_church text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  posts_count bigint,
  comments_count bigint,
  received_likes_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_super_admin();

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION '대상 회원 ID가 없습니다.';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.name,
    p.email,
    p.phone,
    p.birth_date,
    p.congregant_type,
    p.attending_church,
    lower(trim(p.role)) AS role,
    p.created_at,
    u.last_sign_in_at,
    (
      SELECT count(*)::bigint
      FROM public.board_posts bp
      WHERE bp.author_id = p.user_id
        AND bp.deleted_at IS NULL
    ),
    (
      SELECT count(*)::bigint
      FROM public.board_comments bc
      WHERE bc.user_id = p.user_id
        AND bc.deleted_at IS NULL
    ),
    (
      (
        SELECT count(*)::bigint
        FROM public.post_likes pl
        INNER JOIN public.board_posts bp
          ON bp.post_type = pl.post_type
         AND bp.id::text = pl.post_id
        WHERE bp.author_id = p.user_id
          AND bp.deleted_at IS NULL
      )
      +
      (
        SELECT count(*)::bigint
        FROM public.comment_likes cl
        INNER JOIN public.board_comments bc
          ON bc.id = cl.comment_id
        WHERE bc.user_id = p.user_id
          AND bc.deleted_at IS NULL
      )
    )
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_detail_for_super_admin(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
