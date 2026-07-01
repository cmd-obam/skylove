-- ============================================================
-- 비밀번호 찾기: 이름 + 이메일로 회원 이메일 확인
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolve_email_by_name_email(
  p_name text,
  p_email text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_email text;
BEGIN
  SELECT email INTO found_email
  FROM public.profiles
  WHERE lower(trim(name)) = lower(trim(p_name))
    AND lower(trim(email)) = lower(trim(p_email))
  LIMIT 1;

  RETURN found_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_email_by_name_email(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
