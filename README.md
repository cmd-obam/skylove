# 하늘사랑감리교회 홈페이지

하늘사랑교회의 예배 안내, 교회 소개, 시설 안내, 찾아오시는 길 정보를 제공하는 반응형 교회 홈페이지입니다.

## 기술 스택

- React
- Vite
- JavaScript
- CSS3
- Responsive Web

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

## 프로젝트 구조

```
src/
├── assets/
│   ├── images/       # 페이지 이미지
│   └── icons/        # Quick Menu 아이콘
├── components/
│   ├── layout/       # Header, Footer, Navigation 등
│   ├── sections/     # Hero, QuickMenu
│   ├── common/       # Button, Card
│   ├── worship/      # 예배안내 섹션
│   └── location/     # 찾아오시는 길 섹션
├── pages/            # 페이지 컴포넌트
├── data/             # 메뉴, 예배, 위치 데이터
├── App.jsx
└── main.jsx
```

## 배포 (Vercel)

1. GitHub 저장소에 push
2. [Vercel](https://vercel.com)에서 프로젝트 import
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`

React Router SPA 라우팅을 위해 `vercel.json`이 포함되어 있습니다.

## 주요 페이지

| 경로 | 설명 |
|------|------|
| `/` | 메인 |
| `/worship` | 예배안내 |
| `/about` | 교회소개 |
| `/about/location` | 찾아오시는 길 |
| `/facilities` | 시설안내 |
| `/notice` | 공지사항 |
