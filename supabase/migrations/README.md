# Supabase Migrations

Migration 파일을 **번호 순서대로** Supabase SQL Editor에서 실행하세요.

## 실행 순서

| 순서 | 파일 | 설명 |
|------|------|------|
| 1 | `001_create_profiles.sql` | profiles 테이블, RPC, RLS |
| 2 | `002_profile_delete_policy.sql` | 회원탈퇴 DELETE 정책 |
| 3 | `004_add_role_column.sql` | **role 컬럼** (member / admin / super_admin) |
| 4 | `003_board_comments_likes.sql` | 게시글 댓글·추천 (role 컬럼 필요) |
| 5 | `005_board_posts.sql` | 교회소식·교회앨범 게시글 + Storage |
| 6 | `006_account_recovery.sql` | 아이디/비밀번호 찾기 RPC |
| 7 | `007_password_recovery.sql` | 이름+이메일 본인 확인 RPC |
| 8 | `008_security_questions.sql` | 비밀번호 찾기 보안 질문/답변 |
| 9 | `009_password_recovery_with_username.sql` | 이름+아이디+이메일 본인 확인 RPC |
| 10 | `010_password_recovery_name_email.sql` | 이름+이메일 본인 확인 RPC 복원 |
| 11 | `013_super_admin_member_management.sql` | super_admin 회원관리 RPC (목록/권한 변경) |
| 12 | `014_worship_word_posts.sql` | 예배말씀 post_type + youtube_url 컬럼 |
| 13 | `015_congregant_type.sql` | 교인 구분(congregant_type) + 출석 교회 |

> `003`은 `profiles.role`을 RLS에서 참조하므로 **`004`를 먼저** 실행해야 합니다.

## Edge Functions

| 함수명 | 경로 | 용도 |
|--------|------|------|
| `find_by_name_email` | `supabase/functions/find_by_name_email/` | 아이디 찾기 / 비밀번호 찾기 회원 조회 |
| `verify_security_answer` | `supabase/functions/verify_security_answer/` | 보안질문 답변 검증 |
| `reset-password` | `supabase/functions/reset-password/` | (레거시) 비밀번호 재설정 |
| `delete-account` | `supabase/functions/delete-account/` | 본인 회원탈퇴 (member) |
| `admin-delete-member` | `supabase/functions/admin-delete-member/` | super_admin 회원 탈퇴 처리 |

CORS는 `supabase/functions/_shared/cors.ts`에서 공통 관리합니다.

프론트엔드 호출명은 **폴더명과 동일**해야 합니다.

```js
supabase.functions.invoke('find_by_name_email', { body: { name, email } })
```

배포:

```bash
npx supabase login
npm run deploy:all-edge-functions
npm run test:edge-function-cors
```

공개 함수(`find_by_name_email`, `verify_security_answer`, `reset-password`)는 `--no-verify-jwt`로 배포해야 localhost에서 OPTIONS preflight가 200을 반환합니다.

## profiles 테이블 컬럼 (코드와 동기화)

코드 기준: `src/services/auth/profileSchema.js`

| 컬럼 | 설명 |
|------|------|
| `username` | 로그인 아이디 |
| `name` | 이름 |
| `email` | 이메일 |
| `birth_date` | 생년월일 |
| `phone` | 휴대폰 (nullable) |
| `role` | `member` \| `admin` \| `super_admin` |
| `congregant_type` | `own_church` \| `other_church` \| `newcomer` (nullable) |
| `attending_church` | 타 교회 출석 교회명 (nullable) |

## 새 컬럼 추가 시 워크플로

1. `supabase/migrations/NNN_설명.sql` 작성
2. Supabase SQL Editor에서 Migration 실행
3. `src/services/auth/profileSchema.js` 업데이트
4. 관련 서비스 코드 수정

**Migration 적용 전에 코드에서 새 컬럼을 select/insert 하지 마세요.**

## role 컬럼 오류 해결

로그인 시 `column profiles.role does not exist` (42703) 가 나오면:

```
supabase/fix_login_role.sql
```

실행 후 `profiles` 테이블에 `role` 컬럼이 있는지 Table Editor에서 확인하세요.

회원관리 페이지에서 `list_profiles_for_super_admin` RPC 404 (PGRST202) 가 나오면:

```
supabase/fix_super_admin_member_management.sql
```

또는 migration `013_super_admin_member_management.sql` 을 SQL Editor에서 실행하세요.

**가장 빠른 방법** — Supabase SQL Editor에서 아래 파일 **전체** 실행:

```
supabase/fix_login_role.sql
```

또는:

```
supabase/migrations/004_add_role_column.sql
```

실행 후 `profiles` 테이블에 `role` 컬럼이 있는지 Table Editor에서 확인하세요.

관리자 지정 예시:

```sql
UPDATE public.profiles SET role = 'admin' WHERE username = 'your_username';
UPDATE public.profiles SET role = 'super_admin' WHERE username = 'your_username';
```
