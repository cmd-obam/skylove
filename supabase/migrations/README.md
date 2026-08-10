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
| 14 | `016_is_username_available.sql` | 아이디 중복확인 RPC (`is_username_available`) |
| 15 | `019_board_cms_fields.sql` | CMS: `has_image`, `attachments` jsonb, `board_post_list` 갱신 |
| 16 | `020_fix_super_admin_role_variable.sql` | 회원관리 RPC: `current_role`→`profiles.role` 충돌 수정 |
| 17 | `021_super_admin_content_cms.sql` | 최고관리자 게시글·댓글 CMS (휴지통 15일, 메모, 목록/일괄 RPC) |
| 18 | `022_sort_member_management_by_role.sql` | 회원 목록을 최고관리자→관리자→일반회원 순으로 정렬 |
| 19 | `023_get_member_detail_extended.sql` | 회원 상세 RPC 확장 (가입정보·최근로그인·활동집계, 민감정보 제외) |
| 20 | `024_ensure_congregant_type_columns.sql` | 교인 구분 컬럼 보강 (015 누락 대비, 로그인 42703 방지) |
| 21 | `025_unify_member_church_information.sql` | 가입·마이페이지·관리자 교인정보 저장/검증/RPC 통합 |
| 22 | `026_add_manager_role.sql` | **manager 권한** 추가 + 게시판/댓글 RLS·RPC·CMS(admin) 확장 |
| 23 | `027_member_pii_access_log.sql` | 회원 이메일/휴대폰 전체보기 감사 로그 + 목록 phone 컬럼 |
| 24 | `028_member_orphans_and_auth_profile_sync.sql` | auth.users→profiles 자동 생성 트리거 + 고아 회원 백필 |
| 25 | `029_delete_member_by_super_admin.sql` | 최고관리자 회원 탈퇴 RPC (`auth.users` 서버 삭제) |
| 26 | `030_pastor_story_board.sql` | 담임목사 이야기 게시판 + `senior_pastor` 권한 |
| 27 | `031_account_links.sql` | 회원 계정 연결(Linked Accounts) + 소유권 이관/원복 |
| 28 | `032_pastor_story_writer_choi.sql` | 최석림 `senior_pastor` 지정 + pastor_story 글쓰기 user_id 예외 |
| 29 | `033_senior_pastor_church_news_album_write.sql` | 담임목사 글쓰기: 교회소식·교회앨범·담임목사 이야기 |
| 30 | `034_senior_pastor_full_board_ops.sql` | 담임목사: 전 게시판 글쓰기 + 게시글/댓글 전체 운영 |
| 31 | `035_member_visits_and_referrals.sql` | 회원 일별 접속·유입 경로 테이블/RPC (기존 TODAY/TOTAL 유지) |
| 32 | `036_fix_member_visit_tracking.sql` | 회원 접속: 대표 계정 정규화 + 관리자 목록 JOIN 보강 |

> `003`은 `profiles.role`을 RLS에서 참조하므로 **`004`를 먼저** 실행해야 합니다.

수동 재실행용 사본: `supabase/fix_account_links.sql`

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

회원관리에서 `(현재 role: postgres)` 오류가 나오거나,
콘텐츠 CMS RPC가 없다면:

```
supabase/fix_super_admin_member_management.sql
supabase/fix_super_admin_content_cms.sql
```

을 Supabase SQL Editor에서 각각 실행하세요.

15일 휴지통 자동 삭제는 Edge Function `purge-content-trash` 배포 후
`supabase/cron_purge_content_trash.sql` 안내대로 cron을 설정하세요.
Secret: `CONTENT_TRASH_CRON_SECRET`


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
