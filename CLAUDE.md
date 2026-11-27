# semachi-ensemble-table

밴드 동아리 세마치의 합주판. pnpm workspace 모노레포다 (백엔드 개편 B-1, 2026-11-27):
- `apps/web`: React 웹 (레거시 CRA를 Vite + TypeScript로 옮기고 화면을 새로 만듦, 2026-11-26 완료)
- `apps/server`: Express 5 + Mongoose 9 백엔드, TypeScript를 Node가 바로 실행 (`src/app.ts` 앱 조립 + `src/main.ts` 시작, 백엔드 개편 중 → `docs/BACKEND_PLAN.md`)
- `packages/shared`: 웹·서버 공유 스키마·타입·상수

이 문서의 웹 경로(`src/...`, `vite.config.mts`, `env/`)는 `apps/web/` 기준이다. 파일을 둘 곳은 `docs/DIRECTORY_STRUCTURE.md`.

## 명령어
패키지 매니저는 pnpm이다 (`package.json`의 `packageManager`로 버전 고정). npm/yarn을 쓰지 않는다.
저장소 루트에서 실행하면 모든 패키지에 돈다. 하나만: `pnpm --filter @semachi/web <스크립트>` (`@semachi/server`·`@semachi/shared`).
- 의존성 설치: `pnpm install` (패키지 추가는 `pnpm --filter <패키지> add <이름>`)
- 웹 개발 서버: `pnpm dev` (운영 API에 연결)
- 내 PC 서버 (http://localhost:8081) + 다른 터미널에서 `pnpm dev:local` (웹을 이 서버에 연결):
  - `pnpm dev:server`: **운영 DB** (루트 `.env`, 실제 데이터가 바뀐다, 사용자 결정 2026-11-27). 사용자가 직접 실행하고, Claude는 실행하지 않는다
  - `pnpm dev:server:sample`: 메모리 MongoDB + 예시 데이터 (마스터 PIN `0000`). Claude가 확인할 때는 이것만. 데이터 지우기: `pnpm --filter @semachi/server dev:sample:reset`
- 관리자 화면: 웹 `/admin` (마스터 PIN으로 로그인, 활동 기록·마스터 PIN 바꾸기, 백엔드 개편 B-7)
- CI: `.github/workflows/ci.yml` (푸시·PR마다 린트·포맷·타입·테스트·빌드). Node 버전은 `.nvmrc`
- 타입 체크: `pnpm typecheck`
- 빌드: `pnpm build`
- 린트: `pnpm lint` (Oxlint, 설정은 루트 `.oxlintrc.json`)
- 포맷: `pnpm format` / 검사만: `pnpm format:check` (Prettier, 설정은 루트)
- 테스트: `pnpm test:run` (watch 모드: `pnpm test`)

## 테스트
- Vitest + React Testing Library + MSW, 환경은 jsdom. 설정은 `vite.config.mts`의 `test`, 공통 setup은 `src/test/setup.ts`.
- 테스트 파일은 대상 파일 옆에 `*.test.ts(x)`로 둔다.
- API는 실제 서버로 보내지 않는다. 각 테스트에서 `server.use(http.get(...))`로 모킹한다 (`src/test/server.ts`). 핸들러 없는 요청은 에러가 난다.
- 컴포넌트는 `src/test/render.tsx`의 `renderWithProviders`(QueryClient·알림), 앱 전체는 `renderApp`으로 렌더링한다. Drawer는 `src/test/queries.ts`의 `findDialog`(제목)로 찾는다.
- Zustand store는 모듈 전역이라 테스트끼리 상태가 이어진다. 새 store를 만들면 `src/test/setup.ts`의 afterEach에 초기화를 추가한다.
- 테스트는 `pnpm test:run` 또는 `pnpm --filter @semachi/web exec vitest run <apps/web 기준 경로>`로 실행한다. `npx vitest`(와 메인 저장소에서 `node node_modules/vitest/vitest.mjs` 직접 실행)는 이 환경에서 runner를 찾지 못해 원본에서도 항상 실패한다.
- 서버(`apps/server/test/`): Vitest + supertest + mongodb-memory-server. `createApp`으로 만든 앱에 메모리 안에서 요청을 보내고 테스트 파일마다 메모리 MongoDB를 쓴다 (첫 실행 때 MongoDB 실행 파일을 받는다). 데이터는 `helpers.ts`의 `insert`로 DB에 직접 넣는다. 로그를 보는 테스트는 `resetLog()`로 시작한다 (로그 쓰기가 응답 뒤에 끝나서)
- 뮤테이션 검사 등 스크립트로 테스트 결과를 판정할 때는 원본이 통과하는지(기준선)를 먼저 확인하고, 종료 코드가 아니라 출력의 `Tests N failed`로 판정한다.

## 작업 범위
- 백엔드 개편 중이다 (2026-11-27~, 브랜치 `api3.0`): 사용자가 서버 코드(옛 `api.js`, 지금 `apps/server`) 수정 권한을 줬다. 백엔드 작업은 `docs/BACKEND_PLAN.md`의 단계·사전 결정·멈추고 보고할 조건을 따른다.
- 서버 데이터를 확인할 때는 값을 출력하지 않는다 (PIN 등). 테스트는 실제 서버·DB로 보내지 않는다.
- 서버(OCI)·GitHub 설정은 사용자가 직접 한다. 명령과 화면 위치를 단계마다 안내한다.
- **안내 규칙 (사용자 결정):** 사용자는 프론트엔드만 해 봤고 백엔드·Docker·CI/CD·서버 운영은 처음이라, 따라가며 배우는 것이 목표다. 새 개념은 처음 나올 때 "무엇·왜·안 쓰면 어떻게 되는지"를 짧게 먼저 설명하고, 서버 명령은 한 번에 하나씩 (하는 일·예상 출력·성공 확인·되돌리기와 함께) 준다. 단계가 끝나면 `docs/LEARNING_NOTES.md`에 배운 것을 남긴다 (`docs/BACKEND_PLAN.md` "안내 방식").
- 저장소 루트 `.env`는 백엔드 전용(비밀값 포함, 커밋하지 않음)이다. 웹 환경변수는 `apps/web/env/.env`에 `VITE_` 접두사로 두고, 타입은 `apps/web/src/vite-env.d.ts`에 추가한다.

## 마이그레이션 단계
1. CRA → Vite: 완료. CRA 잔여물(react-scripts 관련 설정, 서비스워커, 사용하지 않는 템플릿 파일)을 발견하면 삭제를 제안한다.
2. JS → TS 100% 전환
3. 내부 로직 개선

진행 상황은 @docs/MIGRATION.md 에 기록하고, 작업이 끝날 때마다 갱신한다.
2단계(TS 전환)는 완료됐다 (기록: `docs/archive/TS_MIGRATION_PLAN.md`).
3단계(내부 로직 개선)는 완료됐다 (2026-11-23, 기록: `docs/archive/LOGIC_IMPROVEMENT_PLAN.md`). View 개편도 완료됐다 (2026-11-26, 기록: `docs/archive/VIEW_REDESIGN_PLAN.md`). 이후 화면 작업은 아래 "로직 vs 뷰"·"디렉터리" 규칙을 따른다.
발견한 문제점은 `docs/ISSUES.md`에 ID(`B1`, `F1` 등)로 관리한다. 새로 발견하면 추가하고, 처리하면 상태를 갱신한다.

## TS 전환 규칙
- 의존성이 적은 파일부터: utils/constants → hooks → context → components → pages
- 파일 이름 변경은 반드시 `git mv`로 한다.
- JSX가 있으면 `.tsx`, 없으면 `.ts`
- `any` 금지. 불가피하면 `// TODO(type): 이유` 주석을 단다.
- 컴포넌트 props는 `interface XxxProps`로 정의하고, PropTypes는 제거한다.
- 여러 파일에서 쓰는 도메인 타입은 `src/types/`에 둔다.
- `src` 내부 모듈은 `@/` alias로 import한다 (`@/components/...`). 같은 폴더·하위 폴더는 `./` 상대 경로를 허용한다.

## 디렉터리
- 구조와 새 파일을 둘 곳은 `docs/DIRECTORY_STRUCTURE.md`를 따른다. 웹: 기능별 화면은 `src/features/<기능>/`, 여러 기능이 쓰는 부품은 `src/components/`(`ui`·`sheet`·`layout`), 로직 층은 `src/api`·`queries`·`lib`·`types`·`stores`. 웹·서버가 함께 쓰는 것은 `packages/shared`.
- 파일 이름은 케밥 표기(`team-info-drawer.tsx`, `use-today.ts`). 폴더마다 `index.ts` 다시 내보내기는 만들지 않는다.

## 로직 vs 뷰
- 뷰: JSX 구조, Tailwind 클래스, CSS, 마크업 (`src/features`·`src/components`). 3단계까지는 구조를 바꾸지 않았다.
  화면을 바꿀 때 로직 층(`src/lib`·`src/queries`·`src/api`·`src/stores`)은 바꾸지 않는 것이 원칙이다. 바꿔야 하면 먼저 이유를 보고한다.
- 로직: 커스텀 훅, 상태 관리(store), 유틸 함수, 데이터 가공, API 호출. 3단계의 개선 대상이다.
- 로직 개선은 동작이 바뀌지 않는 범위에서만 한다. 동작이 바뀌는 수정은 먼저 제안하고 승인을 받는다.
- View 개편 때 Drawer는 "API 요청 하나에 단계별 Drawer 여러 개"에서 "Drawer 하나에서 모두 입력"으로 바뀐다. 완료 화면 Drawer("락앤롤!" 등)는 삭제된다.
  Drawer 내부에만 있는 문제(단계 간 값 전달, 단계별 초기화, PIN 단계 등)는 고치지 않고 `docs/ISSUES.md`에 View 처리로 기록한다.
- View 개편의 디자인 원칙 (사용자 결정): 사용자의 약 90%가 모바일이다. UX는 모바일 기준, UI는 모바일·폴더블·PC 모두 불편함이 없게 한다.
  `src/constants/colors.ts`의 `teamColors` 20종은 서비스의 아이덴티티라 값·개수·순서를 바꾸지 않는다 (예외: 노랑만 사용자 요청으로 채도를 조금 낮춤, V-2).
- V-2부터 디자인은 사용자가 시안을 먼저 제안하고, 그대로 만든 뒤 사용자가 상세 수정을 요청하는 식으로 진행한다.
- 새 코드의 스크롤 영역에는 스크롤 막대가 보이지 않게 한다: `edge-fade` 클래스 + `ref={scrollFadeRef}`(`src/components/ui/scroll-fade.ts`)로 막대를 숨기고 더 있는 쪽 끝을 흐리게 한다. Drawer 스크롤 영역은 `scrollAreaClassName`(`components/sheet/drawer-parts`)에 이미 들어 있어 ref만 붙인다. 맨 위 색 머리에는 `data-fade-skip`(위쪽 흐림 없음). shadcn의 `scroll-fade`(마스크)는 쓰지 않는다 (아이폰 도구 막대가 물든다).
- Drawer 아래 끝과 스크롤 영역 바탕에는 팀 색을 쓰지 않는다 (아이폰 사파리 26의 아래 도구 막대가 팀 색으로 물든다). 팀 색은 안쪽 머리 요소에만.
- 색은 다크 모드(V-3)를 위해 토큰으로 쓴다: 바탕 `bg-surface`(`bg-white` 금지), 글씨 `text-ink`, ink 위 글씨 `text-on-ink`, 회색은 `neutral-*`. 팀 색 위 흰 글씨는 그대로.
- 화면 코드는 Tailwind + shadcn/ui(`src/components/ui/`)로만 쓴다. antd·styled-components는 V-6에 프로젝트에서 제거했다. 카드·Drawer 등 화면 요소의 루트에는 `ui` 클래스(글꼴·글자 크기·줄 간격, `src/styles/index.css`)를 붙인다.
- 알림(토스트)은 Sonner(`src/components/ui/sonner.tsx`, `toast.success`·`toast.error`)로, 굵은 한 문장만 쓴다 (설명 없음).

## 작업 방식
- 한 번에 폴더 하나(또는 관련 파일 묶음)만 진행한다.
- 파일을 수정한 뒤에는 `pnpm typecheck`를 실행하고, 통과할 때까지 고친다. 에러를 `any`나 `@ts-ignore`로 덮지 않는다.
- TS 전환 커밋과 로직 개선 커밋을 섞지 않는다.
- 커밋 메시지는 Conventional Commits 형식: `refactor(scope): ...`, `build: ...`, `chore: ...`

## 기타
- 답변은 반드시 한국어로 한다.