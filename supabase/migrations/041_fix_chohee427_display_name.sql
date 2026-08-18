-- ============================================================
-- 041: chohee427 회원 표시 이름 보정
--
-- 회원관리 이름이 '초희'로 남아 있음. 실명 박초희로 수정.
-- username / email / phone / role 은 변경하지 않음.
-- ============================================================

UPDATE public.profiles
SET name = '박초희'
WHERE user_id = '417c5dfd-7ce3-4bf7-9077-f836a41988e7'::uuid
  AND username = 'chohee427'
  AND email = 'piyopiyo427@naver.com'
  AND name IN ('초희', 'chohee427', split_part(email, '@', 1));

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  coalesce(raw_user_meta_data, '{}'::jsonb),
  '{name}',
  to_jsonb('박초희'::text),
  true
)
WHERE id = '417c5dfd-7ce3-4bf7-9077-f836a41988e7'::uuid
  AND coalesce(raw_user_meta_data->>'name', '') IN ('', '초희', 'chohee427');
