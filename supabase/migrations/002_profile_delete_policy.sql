-- 회원탈퇴: 본인 profile 삭제 허용
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
