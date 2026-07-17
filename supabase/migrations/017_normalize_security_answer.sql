-- 비밀번호 찾기 보안 답변 정규화 (저장/검증 동일 규칙)
-- JS normalizeAnswer() 와 동일한 의미:
-- NFC → 줄바꿈/탭을 공백으로 → trim → 연속 공백 축약 → 공백 제거 → lower

CREATE OR REPLACE FUNCTION public.normalize_security_answer(p_answer text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    replace(
      regexp_replace(
        trim(
          regexp_replace(
            normalize(coalesce(p_answer, ''), NFC),
            E'[\r\n\t]+',
            ' ',
            'g'
          )
        ),
        E' +',
        ' ',
        'g'
      ),
      ' ',
      ''
    )
  );
$$;

COMMENT ON FUNCTION public.normalize_security_answer(text) IS
  'Normalize password-recovery security answers (NFC, whitespace, casefold). Mirrors src/services/auth/normalizeAnswer.js';

CREATE OR REPLACE FUNCTION public.set_profile_security_recovery(
  p_user_id uuid,
  p_security_question text,
  p_security_answer text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  normalized_answer text;
BEGIN
  IF p_security_question IS NULL OR trim(p_security_question) = '' THEN
    RAISE EXCEPTION 'Security question is required';
  END IF;

  normalized_answer := public.normalize_security_answer(p_security_answer);

  IF normalized_answer IS NULL OR normalized_answer = '' THEN
    RAISE EXCEPTION 'Security answer is required';
  END IF;

  UPDATE public.profiles
  SET
    security_question = trim(p_security_question),
    security_answer_hash = crypt(normalized_answer, gen_salt('bf'))
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_profile_security_recovery(uuid, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_password_recovery_answer(
  p_name text,
  p_email text,
  p_answer text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(trim(name)) = lower(trim(p_name))
      AND lower(trim(email)) = lower(trim(p_email))
      AND security_answer_hash IS NOT NULL
      AND (
        -- 신규: 정규화된 답변 해시
        crypt(public.normalize_security_answer(p_answer), security_answer_hash) = security_answer_hash
        -- 기존: trim만 적용해 저장된 해시와의 호환
        OR crypt(trim(p_answer), security_answer_hash) = security_answer_hash
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.verify_password_recovery_answer(text, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
