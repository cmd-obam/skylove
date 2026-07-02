@echo off
setlocal

echo [1/4] Supabase CLI login 상태 확인...
call npx supabase projects list >nul 2>&1
if errorlevel 1 (
  echo.
  echo Supabase CLI에 로그인되어 있지 않습니다.
  echo 브라우저 인증을 진행합니다...
  echo.
  call npx supabase login
  if errorlevel 1 (
    echo 로그인에 실패했습니다.
    exit /b 1
  )
)

echo.
echo [2/4] find_by_name_email 배포...
call npx supabase functions deploy find_by_name_email --project-ref nwsytxwurnaxaabztomh --no-verify-jwt
if errorlevel 1 (
  echo 배포에 실패했습니다.
  exit /b 1
)

echo.
echo [3/4] CORS 테스트 (OPTIONS + POST)...
call npm run test:edge-function-cors
if errorlevel 1 (
  echo CORS 테스트에 실패했습니다.
  exit /b 1
)

echo.
echo [4/4] 회원 조회 진단...
call npm run diagnose:account-recovery

echo.
echo 완료
