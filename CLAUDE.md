# semachi-ensemble-table

레거시 CRA 프로젝트를 Vite + TypeScript로 마이그레이션하는 중인 React 프론트엔드.

## 명령어
패키지 매니저는 pnpm이다 (`package.json`의 `packageManager`로 버전 고정). npm/yarn을 쓰지 않는다.
- 의존성 설치: `pnpm install`
- 타입 체크: `pnpm typecheck`
- 빌드: `pnpm build`
- 린트: `pnpm lint` (Oxlint, 설정은 `.oxlintrc.json`)
- 포맷: `pnpm format` / 검사만: `pnpm format:check` (Prettier)
- 테스트: `pnpm test:run` (watch 모드: `pnpm test`)

## 테스트
- Vitest + React Testing Library + MSW, 환경은 jsdom. 설정은 `vite.config.mts`의 `test`, 공통 setup은 `src/test/setup.ts`.
- 테스트 파일은 대상 파일 옆에 `*.test.ts(x)`로 둔다.
- API는 실제 서버로 보내지 않는다. 각 테스트에서 `server.use(http.get(...))`로 모킹한다 (`src/test/server.ts`). 핸들러 없는 요청은 에러가 난다.
- styled-components theme이 필요한 컴포넌트는 `src/test/render.tsx`의 `renderWithTheme`으로 렌더링한다.
- 테스트는 `pnpm test:run` 또는 `pnpm exec vitest run <경로>`로 실행한다. `npx vitest`(와 메인 저장소에서 `node node_modules/vitest/vitest.mjs` 직접 실행)는 이 환경에서 runner를 찾지 못해 원본에서도 항상 실패한다.
- 뮤테이션 검사 등 스크립트로 테스트 결과를 판정할 때는 원본이 통과하는지(기준선)를 먼저 확인하고, 종료 코드가 아니라 출력의 `Tests N failed`로 판정한다.

## 작업 범위
- `src/` 아래 프론트엔드 코드만 수정한다.
- 루트의 `api.js`는 백엔드 코드다. 읽는 것은 괜찮지만 수정·이동·삭제하지 않는다.
- 백엔드 관련 문제·제안(`docs/ISSUES.md`의 B 항목, `docs/archive/BACKEND_SUGGESTIONS.md`)은 모두 백엔드 개발자에게 전달했다. 이 내용은 더 검토하거나 수정하지 않는다.
  백엔드가 바뀌면 사용자가 변경 내용을 알려준다. 그때 프론트 반영 범위를 다시 검토한다.
- 루트 `.env`는 백엔드 전용(비밀값 포함)이다. 프론트엔드 환경변수는 `env/.env`에 `VITE_` 접두사로 두고, 타입은 `src/vite-env.d.ts`에 추가한다.

## 마이그레이션 단계
1. CRA → Vite: 완료. CRA 잔여물(react-scripts 관련 설정, 서비스워커, 사용하지 않는 템플릿 파일)을 발견하면 삭제를 제안한다.
2. JS → TS 100% 전환
3. 내부 로직 개선

진행 상황은 @docs/MIGRATION.md 에 기록하고, 작업이 끝날 때마다 갱신한다.
2단계(TS 전환)는 완료됐다 (기록: `docs/archive/TS_MIGRATION_PLAN.md`).
3단계(내부 로직 개선)는 완료됐다 (2026-11-23, 기록: `docs/archive/LOGIC_IMPROVEMENT_PLAN.md`). 다음은 View 개편이며, 진행 방식·사전 결정·단계·체크리스트·작업마다 갱신할 문서는 `docs/VIEW_REDESIGN_PLAN.md`를 따른다.
발견한 문제점은 `docs/ISSUES.md`에 ID(`B1`, `F1` 등)로 관리한다. 새로 발견하면 추가하고, 처리하면 상태를 갱신한다.

## TS 전환 규칙
- 의존성이 적은 파일부터: utils/constants → hooks → context → components → pages
- 파일 이름 변경은 반드시 `git mv`로 한다.
- JSX가 있으면 `.tsx`, 없으면 `.ts`
- `any` 금지. 불가피하면 `// TODO(type): 이유` 주석을 단다.
- 컴포넌트 props는 `interface XxxProps`로 정의하고, PropTypes는 제거한다.
- 여러 파일에서 쓰는 도메인 타입은 `src/types/`에 둔다.
- styled-components의 theme 타입은 `src/styles/styled.d.ts`의 `DefaultTheme`를 따른다.
- `src` 내부 모듈은 `@/` alias로 import한다 (`@/components/...`). 같은 폴더·하위 폴더는 `./` 상대 경로를 허용한다.

## 로직 vs 뷰
- 뷰: JSX 구조, styled-components 스타일, CSS, 마크업. 3단계까지는 구조를 바꾸지 않았다.
  View 개편 중에는 `docs/VIEW_REDESIGN_PLAN.md`의 단계에 따라 뷰를 새로 만든다. 이때 로직 층(`src/lib`·`src/queries`·`src/api`·`src/stores`)은 바꾸지 않는 것이 원칙이다.
- 로직: 커스텀 훅, context, 상태 관리, 유틸 함수, 데이터 가공, API 호출. 3단계의 개선 대상이다.
- 로직 개선은 동작이 바뀌지 않는 범위에서만 한다. 동작이 바뀌는 수정은 먼저 제안하고 승인을 받는다.
- View 개편 때 Drawer는 "API 요청 하나에 단계별 Drawer 여러 개"에서 "Drawer 하나에서 모두 입력"으로 바뀐다. 완료 화면 Drawer("락앤롤!" 등)는 삭제된다.
  Drawer 내부에만 있는 문제(단계 간 값 전달, 단계별 초기화, PIN 단계 등)는 고치지 않고 `docs/ISSUES.md`에 View 처리로 기록한다.
- View 개편의 디자인 원칙 (사용자 결정): 사용자의 약 90%가 모바일이다. UX는 모바일 기준, UI는 모바일·폴더블·PC 모두 불편함이 없게 한다.
  `src/styles/theme.ts`의 `teamColors` 20종은 서비스의 아이덴티티라 값·개수·순서를 바꾸지 않는다 (예외: 노랑만 사용자 요청으로 채도를 조금 낮춤, V-2).
- V-2부터 디자인은 사용자가 시안을 먼저 제안하고, 그대로 만든 뒤 사용자가 상세 수정을 요청하는 식으로 진행한다.
- View 개편 중 새 코드는 Tailwind + shadcn/ui(`src/components/ui/`)로만 쓴다 (styled-components·antd 금지). 옛 코드와 공존하는 동안의 규칙(새 코드는 `ui` 클래스 요소 안, CSS 레이어, px 단위)은 `docs/VIEW_REDESIGN_PLAN.md` "공존 기간 규칙"을 따른다.
- 알림(토스트) 기능은 3-6 폐기 때 삭제했다 (2026-11-23). 3단계에서는 다시 넣지 않고, View 개편 때 새로 추가한다 (`docs/VIEW_REDESIGN_PLAN.md`).

## 작업 방식
- 한 번에 폴더 하나(또는 관련 파일 묶음)만 진행한다.
- 파일을 수정한 뒤에는 `pnpm typecheck`를 실행하고, 통과할 때까지 고친다. 에러를 `any`나 `@ts-ignore`로 덮지 않는다.
- TS 전환 커밋과 로직 개선 커밋을 섞지 않는다.
- 커밋 메시지는 Conventional Commits 형식: `refactor(scope): ...`, `build: ...`, `chore: ...`

## 기타
- 답변은 반드시 한국어로 한다.