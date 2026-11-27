# 디렉터리 구조

> 새 파일을 어디에 둘지 찾는 문서. pnpm workspace 모노레포 (백엔드 개편 B-1, 2026-11-27).
> 서버(`apps/server`)는 개편 중이라 "예정"으로 표시한 곳은 해당 단계에서 생긴다 (`docs/BACKEND_PLAN.md`).

## 한눈에 보기

```
/
├── apps/
│   ├── web/                 웹 (React + Vite). 사용자가 보는 화면
│   └── server/              서버 (Express + MongoDB). API
├── packages/
│   └── shared/              웹·서버가 함께 쓰는 Zod 스키마·타입·상수
├── deploy/                  (예정 B-11) 서버에 올라가는 배포 설정: compose.yaml, Caddyfile
├── .github/workflows/       (예정 B-4) GitHub Actions: CI(검사)·CD(배포)
├── docs/                    문서 (계획·기록·문제 목록). 끝난 계획은 docs/archive/
├── package.json             루트 스크립트: 모든 패키지의 검사·테스트·빌드를 한 번에
├── pnpm-workspace.yaml      workspace에 들어가는 패키지 목록
├── .oxlintrc.json           린트 설정 (전체 공통)
├── .prettierrc.json         포맷 설정 (전체 공통)
└── .env                     서버 비밀값 (커밋하지 않음)
```

## apps/web — 웹

```
apps/web/
├── index.html               HTML 껍데기 (제목, noindex, 다크 모드 깜빡임 방지)
├── vite.config.mts          Vite·Vitest 설정
├── tsconfig.json            TypeScript 설정 (`@/` = `src/`)
├── components.json          shadcn 설정 (부품 추가할 때 씀)
├── env/.env                 공개 환경변수 (`VITE_API_URL` 등, 커밋함)
├── public/                  그대로 복사되는 정적 파일 (아이콘, manifest, robots.txt)
└── src/
    ├── app/                 진입점(main.tsx)과 화면 배치(app.tsx)
    ├── features/            기능별 화면 + 그 기능만 쓰는 상태
    │   ├── schedule/        합주판: 캘린더, 빈 시간, 합주 정보·잡기·수정 Drawer
    │   ├── teams/           팀 목록, 팀 정보·추가·수정 Drawer, 소모임 정보, 팀 고정
    │   ├── notes/           날적이 카드, 남기기·삭제 Drawer
    │   ├── notices/         공지 카드, 공지 Drawer
    │   └── settings/        설정 Drawer, 다크 모드
    ├── components/          여러 기능이 같이 쓰는 화면 부품
    │   ├── ui/              기본 부품 (shadcn: button, drawer, popover, sonner …)
    │   ├── sheet/           Drawer 공용 부품 (틀·입력 부품·PIN 단계·키보드 처리)
    │   └── layout/          헤더, 푸터, 아이폰 도구 막대 색
    ├── api/                 서버 요청 함수 (리소스별: team·ensemble·note·notice)
    ├── queries/             TanStack Query 훅 (조회·변경, 다시 불러오기)
    ├── lib/                 화면과 관계없는 계산 (날짜·합주판 배치·변환 등)
    ├── stores/              여러 기능이 쓰는 전역 상태 (Zustand: 열린 Drawer, 보고 있는 팀·합주)
    ├── hooks/               여러 기능이 쓰는 훅 (오늘 날짜, 키보드 높이, 스크롤에 헤더 숨김)
    ├── types/               도메인·요청·응답 타입 (예정 B-8: 응답 스키마는 packages/shared로)
    ├── constants/           고정 값 (요일·시간칸, 팀 색 20종)
    ├── styles/              index.css (Tailwind·색 토큰·다크 모드), 빗금 패턴
    ├── assets/fonts/        나눔스퀘어 네오
    └── test/                테스트 공용 (MSW 서버, render, fixtures, setup)
```

## apps/server — 서버

지금 (B-2):
```
apps/server/
├── app.js                   앱 조립: 스키마·미들웨어·API (옛 api.js, 코드는 그대로)
├── main.js                  시작: .env → 앱 → DB 연결 → HTTPS 8081
├── app.d.ts                 테스트(TS)가 app.js를 가져다 쓰기 위한 타입 (B-3에서 삭제)
├── vitest.config.mts        테스트 설정 (서버 시간대 UTC, 테스트용 마스터 PIN)
└── test/                    지금 동작을 고정한 테스트 (메모리 MongoDB, 실제 DB·포트 없음)
    ├── setup.ts · helpers.ts  DB 켜기·비우기, 임시 로그 파일, 요청·데이터 도우미
    └── *.test.ts            팀·합주·날적이·공지·공통 처리(middleware)
```

예정 (B-3 이후):
```
apps/server/
├── package.json · tsconfig.json
├── Dockerfile               (예정 B-11) 운영 이미지
├── scripts/                 (예정) 한 번만 실행하는 데이터 변경 스크립트 (PIN 해시 등, 미리 세어 보기부터)
└── src/
    ├── main.ts              시작: DB 연결 → 서버 실행
    ├── app.ts               Express 앱 조립 (테스트는 이것만 가져다 씀)
    ├── config.ts            환경변수 읽기·검사
    ├── models/              MongoDB 스키마 (team·ensemble·note·notice·activity)
    ├── routes/              API (teams·ensembles·notes·notices·visits·health·admin)
    ├── middleware/          요청 앞뒤 처리 (CORS·방문자 쿠키·PIN 확인·오류 응답)
    ├── jobs/                정해진 시간에 도는 일 (날짜 지난 팀·합주 정리)
    └── lib/                 로그·시간 등 공용 함수
```
- 테스트는 `apps/server/test/<리소스>.test.ts` (API를 요청으로 검사하므로 코드 옆이 아니라 한곳에). 순수 함수 단위 테스트가 생기면 웹처럼 그 파일 옆에

## packages/shared — 공유

```
packages/shared/
└── src/
    └── index.ts             (예정 B-8) 요청·응답 Zod 스키마, 타입, 상수
```

## 어디에 둘까

| 만들려는 것 | 둘 곳 |
|---|---|
| 한 기능에서만 쓰는 화면·상태·타입 | `apps/web/src/features/<기능>/` |
| 두 기능 이상이 쓰는 화면 부품 | `apps/web/src/components/` (Drawer 관련이면 `sheet/`, 기본 부품이면 `ui/`) |
| 두 기능 이상이 쓰는 상태 | `apps/web/src/stores/` |
| 서버에 요청 보내기 | `apps/web/src/api/`(요청 함수) + `apps/web/src/queries/`(훅) |
| 화면 없이 계산만 하는 함수 | `apps/web/src/lib/` (현재 시각 등은 인자로 받아 테스트하기 쉽게) |
| 새 API | `apps/server/src/routes/` (+ 스키마는 `models/`) |
| 웹·서버가 둘 다 알아야 하는 모양(요청·응답)·상수 | `packages/shared/` |
| 서버 비밀값 | 루트 `.env` (커밋하지 않음). 웹 공개 값은 `apps/web/env/.env` |
| 배포 설정 | `deploy/`, `.github/workflows/` |
| 계획·기록 문서 | `docs/` (끝나면 `docs/archive/`) |

- 처음엔 기능 폴더에 두고, 다른 기능도 쓰게 되면 그때 `components/`·`stores/`·`packages/shared`로 옮긴다
- 기능 폴더 안은 파일이 많지 않아 하위 폴더 없이 둔다. 10개를 넘게 되면 나눈다

## 규칙

- **파일 이름은 케밥 표기:** `team-info-drawer.tsx`, `use-today.ts`. 컴포넌트·함수 이름은 그대로 `TeamInfoDrawer`, `useToday`
  - 윈도우는 대소문자만 다른 이름 변경을 알아채지 못한다. 대소문자만 바꿀 때는 `git mv a.tsx tmp.tsx` → `git mv tmp.tsx a-b.tsx` 두 단계로
- **테스트는 대상 파일 옆에** `*.test.ts(x)`
- **가져오기:** 웹 `src` 안은 `@/` 경로, 같은 폴더는 `./`. 공유 패키지는 `@semachi/shared`. 폴더마다 `index.ts`로 다시 내보내기(배럴)는 만들지 않는다
- **기능끼리 가져오기:** 되도록 피하고, 필요하면 그 파일을 직접 가져온다. 지금 있는 것:
  - 합주판 카드 → 팀 목록 (`schedule/schedule-card` → `teams/teams`)
  - 팀 → 합주 잡기 (`teams/teams`·`team-info-drawer`·`event-info-drawer` → `schedule/add-ensemble-store`·`add-ensemble-drawer`)
  - 설정 → 합주판 보기 방식 (`settings/settings-drawer` → `schedule/board-view-store`)
- **로직 층(`api`·`queries`·`lib`·`types`·`stores`)은 화면(`features`·`components`)을 가져오지 않는다**
- **웹과 서버는 서로를 직접 가져오지 않는다.** 둘 다 필요한 것은 `packages/shared`로
- 패키지 추가: `pnpm --filter @semachi/web add <이름>` (서버는 `@semachi/server`)
