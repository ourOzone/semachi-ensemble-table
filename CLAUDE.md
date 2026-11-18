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
- Vitest + React Testing Library + MSW, 환경은 jsdom. 설정은 `vite.config.ts`의 `test`, 공통 setup은 `src/test/setup.ts`.
- 테스트 파일은 대상 파일 옆에 `*.test.ts(x)`로 둔다.
- API는 실제 서버로 보내지 않는다. 각 테스트에서 `server.use(http.get(...))`로 모킹한다 (`src/test/server.ts`). 핸들러 없는 요청은 에러가 난다.
- styled-components theme이 필요한 컴포넌트는 `src/test/render.tsx`의 `renderWithTheme`으로 렌더링한다.

## 작업 범위
- `src/` 아래 프론트엔드 코드만 수정한다.
- 루트의 `api.js`는 백엔드 코드다. 읽는 것은 괜찮지만 수정·이동·삭제하지 않는다.

## 마이그레이션 단계
1. CRA → Vite: 완료. CRA 잔여물(react-scripts 관련 설정, 서비스워커, 사용하지 않는 템플릿 파일)을 발견하면 삭제를 제안한다.
2. JS → TS 100% 전환
3. 내부 로직 개선

진행 상황은 @docs/MIGRATION.md 에 기록하고, 작업이 끝날 때마다 갱신한다.

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
- 뷰: JSX 구조, styled-components 스타일, CSS, 마크업. 추후 전면 개편 예정이므로 구조를 바꾸지 않는다. 단, TS 전환(타입 부여)은 한다.
- 로직: 커스텀 훅, context, 상태 관리, 유틸 함수, 데이터 가공, API 호출. 3단계의 개선 대상이다.
- 로직 개선은 동작이 바뀌지 않는 범위에서만 한다. 동작이 바뀌는 수정은 먼저 제안하고 승인을 받는다.

## 작업 방식
- 한 번에 폴더 하나(또는 관련 파일 묶음)만 진행한다.
- 파일을 수정한 뒤에는 `pnpm typecheck`를 실행하고, 통과할 때까지 고친다. 에러를 `any`나 `@ts-ignore`로 덮지 않는다.
- TS 전환 커밋과 로직 개선 커밋을 섞지 않는다.
- 커밋 메시지는 Conventional Commits 형식: `refactor(scope): ...`, `build: ...`, `chore: ...`

## 기타
- 답변은 반드시 한국어로 한다.