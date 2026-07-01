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

> `003`은 `profiles.role`을 RLS에서 참조하므로 **`004`를 먼저** 실행해야 합니다.

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

## 새 컬럼 추가 시 워크플로

1. `supabase/migrations/NNN_설명.sql` 작성
2. Supabase SQL Editor에서 Migration 실행
3. `src/services/auth/profileSchema.js` 업데이트
4. 관련 서비스 코드 수정

**Migration 적용 전에 코드에서 새 컬럼을 select/insert 하지 마세요.**

## role 컬럼 오류 해결

로그인 시 `column profiles.role does not exist` (42703) 가 나오면:

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
