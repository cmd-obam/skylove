-- ============================================================
-- 기존 회원 교인정보 강제 등록
-- 대상: 아래 user_id 전부
-- 적용값: 본 교회 교인 / 출석교회 하늘사랑교회 / 새가족 아니오
--
-- Supabase Dashboard → SQL Editor → 전체 붙여넣기 → Run
-- ============================================================

UPDATE public.profiles
SET
  congregant_type = 'own_church',
  attending_church = '하늘사랑교회'
WHERE user_id IN (
  '766dbbbf-6b0f-43fb-9f30-0cf55d4bc4be'::uuid,
  '1c244f41-ec0b-481f-84f1-14b4d1560d7c'::uuid,
  '235b6913-abfe-41ed-a3f7-0becceab5680'::uuid,
  '71c4519a-80cf-49ba-bb35-02d62e22f59f'::uuid,
  '0fbb1a49-ca3e-4b2b-bb6c-f9276e1e2b8e'::uuid,
  '496012f5-6437-4a47-98c3-099d70809450'::uuid,
  'e901b70a-7fd2-400b-b532-d19f92f120ac'::uuid,
  '4128ec7b-b54b-497e-aad8-bfcaa65388db'::uuid,
  '82225fb1-ce96-49aa-8635-b97351d326c7'::uuid,
  '1e7c636b-f282-4eee-a2cd-1b6bd0aa3e2f'::uuid,
  '5d0adfa6-77ab-42e9-a277-defb92347abb'::uuid
);

-- 적용 결과 확인
SELECT
  user_id,
  name,
  email,
  congregant_type,
  attending_church,
  CASE
    WHEN congregant_type = 'newcomer' THEN '예'
    WHEN congregant_type IN ('own_church', 'other_church') THEN '아니오'
    ELSE '미입력'
  END AS is_newcomer_label
FROM public.profiles
WHERE user_id IN (
  '766dbbbf-6b0f-43fb-9f30-0cf55d4bc4be'::uuid,
  '1c244f41-ec0b-481f-84f1-14b4d1560d7c'::uuid,
  '235b6913-abfe-41ed-a3f7-0becceab5680'::uuid,
  '71c4519a-80cf-49ba-bb35-02d62e22f59f'::uuid,
  '0fbb1a49-ca3e-4b2b-bb6c-f9276e1e2b8e'::uuid,
  '496012f5-6437-4a47-98c3-099d70809450'::uuid,
  'e901b70a-7fd2-400b-b532-d19f92f120ac'::uuid,
  '4128ec7b-b54b-497e-aad8-bfcaa65388db'::uuid,
  '82225fb1-ce96-49aa-8635-b97351d326c7'::uuid,
  '1e7c636b-f282-4eee-a2cd-1b6bd0aa3e2f'::uuid,
  '5d0adfa6-77ab-42e9-a277-defb92347abb'::uuid
)
ORDER BY name;
