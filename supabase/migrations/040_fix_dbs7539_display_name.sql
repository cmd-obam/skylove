-- ============================================================
-- 040: dbs7539 회원 표시 이름 보정
--
-- 회원관리에서 이름이 아이디(dbs7539)와 동일하게 저장되어 있음.
-- 실명 이윤희로 수정. username / email / phone / role 은 변경하지 않음.
-- ============================================================

UPDATE public.profiles
SET name = '이윤희'
WHERE user_id = 'b2f1b0de-1ed5-4f19-8581-b44e6afdf979'::uuid
  AND username = 'dbs7539'
  AND email = 'dbs7539@naver.com'
  AND name IN ('dbs7539', split_part(email, '@', 1));

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  coalesce(raw_user_meta_data, '{}'::jsonb),
  '{name}',
  to_jsonb('이윤희'::text),
  true
)
WHERE id = 'b2f1b0de-1ed5-4f19-8581-b44e6afdf979'::uuid
  AND coalesce(raw_user_meta_data->>'name', '') IN ('', 'dbs7539');
