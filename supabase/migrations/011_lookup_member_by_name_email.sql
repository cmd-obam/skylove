-- 통합 회원 조회 RPC (아이디/비밀번호 찾기)
CREATE OR REPLACE FUNCTION public.lookup_member_by_name_email(
  p_name text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_member jsonb;
BEGIN
  SELECT jsonb_build_object(
    'username', username,
    'email', email,
    'name', name
  )
  INTO found_member
  FROM public.profiles
  WHERE lower(trim(name)) = lower(trim(p_name))
    AND lower(trim(email)) = lower(trim(p_email))
  LIMIT 1;

  RETURN found_member;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_member_by_name_email(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
