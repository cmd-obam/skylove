# 하늘사랑교회

하늘사랑교회 공식 홈페이지입니다.  
예배·교회 소개·소식·회원 기능을 제공하며, 특별 기간에는 이벤트 미니게임도 운영합니다.

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 19, React Router 7, Vite 8 |
| 스타일 | CSS3 (반응형) |
| Backend / DB | Supabase (Auth, Database, Storage, Edge Functions) |
| 에디터 | TipTap (게시글·알림 작성) |
| 기타 | DOMPurify, React Icons |
| 배포 | Vercel |

---

## 주요 페이지

### 홈 (`/`)

교회 소개 히어로, 환영 메시지, 예배 안내, 이야기, 갤러리, 찾아오시는 길을 한눈에 보여줍니다.  
이벤트 기간에는 메인 팝업으로 미니게임 진입을 안내합니다.

### 교회소개

| 경로 | 설명 |
|------|------|
| `/about` | 담임목사 인사 |
| `/about/people/clergy` | 섬기는 사람들 · 직분자 |
| `/about/people/ministers` | 섬기는 사람들 · 사역자 |
| `/about/history` | 교회 역사 |
| `/worship` | 예배시간 안내 |
| `/about/facilities` | 교회시설 안내 |
| `/about/facility-vr` | VR 둘러보기 |
| `/about/location` | 찾아오시는 길 |

### 예배안내

주일 축복 예배, 성찬식, 주일 찬양 예배, 수요예배, 새벽기도, 엘샤다이 찬양단, 셀모임 등 예배·모임 안내입니다.

| 경로 | 설명 |
|------|------|
| `/worship-guide/sunday-blessing` | 주일 축복 예배 |
| `/worship-guide/sunday-blessing/communion` | 성찬식 예배 (매월 첫째 주) |
| `/worship-guide/sunday-praise` | 주일 찬양 예배 |
| `/worship-guide/wednesday` | 수요예배 |
| `/worship-guide/dawn-prayer` | 새벽기도 |
| `/worship-guide/el-shaddai-choir` | 엘샤다이 찬양단 |
| `/worship-guide/cell-meeting` | 셀모임 |

### 예배말씀

예배 말씀·찬양 영상을 게시판 형태로 나눕니다.

| 경로 | 설명 |
|------|------|
| `/worship-word/sunday` | 주일예배 말씀 |
| `/worship-word/el-shaddai` | 엘샤다이 찬양단 |

### 교회소식

| 경로 | 설명 |
|------|------|
| `/church-news` | 교회소식·공지 |
| `/church-news/pastor-story` | 담임목사 이야기 |
| `/church-news/album` | 교회앨범 |

### 새가족 안내 (`/new-family`)

처음 방문하는 분을 위한 안내와 FAQ를 제공합니다.

### 회원·관리

| 경로 | 설명 |
|------|------|
| `/login` | 로그인 / 아이디·비밀번호 찾기 |
| `/signup` | 회원가입 |
| `/member/edit` | 내 정보 수정 |
| `/mypage/change-password` | 비밀번호 변경 |
| `/admin` 등 | 관리자·CMS 기능 (권한 필요) |

---

## 주요 이벤트 — 미니게임

### 추수감사절 미니게임 (`/thanksgiving-game`)

추수감사절 기간에 열리는 **벼 수확 미니게임**입니다.  
농부를 좌우로 움직여 떨어지는 아이템을 담아 점수를 경쟁합니다.

- **메뉴**: 이벤트 → 미니게임
- **시간**: 2분 / **생명**: 3개
- **조작**: 키보드 ← → 또는 화면 좌우 드래그
- **랭킹**: 회원·게스트 모두 최고 점수 저장 및 순위 확인 가능

#### 아이템

| 아이템 | 효과 |
|--------|------|
| 벼 | +1점 (콤보 시 최대 +5점) |
| 황금 벼이삭 | +5점 ~ 콤보 최대 +25점 (드물게 등장) |
| 과일 바구니 | +2점 ~ 콤보 최대 +10점 |
| 메뚜기 | −1점 |
| 가라지 | 생명 −1 |

생명 0 또는 제한 시간이 끝나면 게임이 종료됩니다.  
홈 팝업의 **미니게임 시작하기** 버튼으로도 바로 진입할 수 있습니다.

> 이벤트 메뉴 표시 여부는 `src/data/eventMenu.js`의 `EVENT_MENU_ENABLED`로 제어합니다.

---

## 시작하기

### 설치

```bash
npm install
```

### 개발 서버

```bash
npm run dev
```

### 프로덕션 빌드

```bash
npm run build
```

### 빌드 미리보기

```bash
npm run preview
```

환경 변수는 `.env`에 Supabase URL·키 등을 설정합니다. (저장소에 시크릿을 커밋하지 마세요.)

---

## 배포 (Vercel)

1. GitHub 저장소에 push
2. [Vercel](https://vercel.com)에서 프로젝트 import
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`

React Router SPA 라우팅을 위해 `vercel.json`이 포함되어 있습니다.
