# 마이그레이션 진행 기록

> 단계 정의와 규칙은 `CLAUDE.md`, 추가 최신화 항목의 근거는 `docs/MODERNIZATION.md` 참고.

## 현황

| 단계 | 상태 |
|---|---|
| 1. CRA → Vite | ✅ 완료 (잔여물 처리 완료) |
| 2. JS → TS 100% 전환 | ⏳ 시작 전 (`.ts/.tsx` 4개: `index.tsx`, `vite-env.d.ts`, `styles/theme.ts`, `styles/styled.d.ts`) |
| 3. 내부 로직 개선 | ⏳ 시작 전 |

## 작업 로그

### 2026-11-18 — 개발 도구 정비 (MODERNIZATION.md 1~3번)

**1. 린터·포매터**
- Oxlint 1.94 + Prettier 3.10 도입. `typescript-eslint`는 TypeScript 7을 지원하지 않아(`<6.1.0`) 제외.
- 설정: `.oxlintrc.json`, `.prettierrc.json`, `.prettierignore`(api.js·문서·public 제외)
- 스크립트: `lint`, `lint:fix`, `format`, `format:check`
- 전체 코드에 Prettier 1회 적용(4칸 들여쓰기, 홑따옴표, LF). 공백·따옴표·줄바꿈만 바뀌고 로직 변경 없음.
- `.gitattributes`로 LF 고정, `.vscode/extensions.json`에 Oxc·Prettier 확장 추천.

**2. `@/` alias**
- `tsconfig.json` `paths`: `"*"` → `"@/*"`. bare import(`'context'`, `'constants'` 등)와 `../assets/`를 `@/...`로 일괄 치환.
- `CLAUDE.md`에 `@/` 규칙 추가.

**3. pnpm 전환**
- pnpm 12.21.0 (`packageManager` 필드로 고정), `.nvmrc` = 24.
- `pnpm import`로 기존 `package-lock.json`의 버전을 그대로 옮긴 뒤 `package-lock.json` 삭제.
- phantom dependency였던 `dayjs`를 `^1.11.23`(antd가 쓰던 버전과 동일)으로 명시.
- 사용처 0건인 패키지 제거: `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `react-modal`, `react-router-dom`, `web-vitals`, `@testing-library/*`(v13).
- `CLAUDE.md` 명령어를 pnpm 기준으로 갱신.

**검증:** `pnpm typecheck` ✅ / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 기존 코드의 에러 5건·경고 65건 (아래)

### 2026-11-18 — 테스트 환경 (MODERNIZATION.md 4번)

- Vitest 5.1 + jsdom 31 + React Testing Library 16 + user-event 14 + jest-dom 7 + MSW 3 설치
- `vite.config.ts`에 `test` 설정 (`vitest/config`의 `defineConfig` 사용), 스크립트 `test`(watch) / `test:run`
- `src/test/setup.ts`: jest-dom matcher, `matchMedia` polyfill(antd용), MSW 서버 lifecycle, RTL cleanup
- `src/test/server.ts`(MSW), `src/test/render.tsx`(`renderWithTheme`)
- 스모크 테스트: `src/api/index.test.ts`(axios 클라이언트 + MSW), `src/components/common/OkButton.test.tsx`(RTL + theme + antd)
- Oxlint에 테스트 파일 대상 vitest 플러그인 추가
- 트러블슈팅
  - jsdom의 XHR은 mock 응답에도 CORS를 검사한다 → jsdom `url`을 API origin으로 맞춰 same-origin으로 처리
  - MSW 3에서 `onUnhandledRequest` → `onUnhandledFrame`으로 이름 변경 (구 옵션은 런타임에서 조용히 무시됨)
- 문서: `MODERNIZATION.md`를 `docs/`로 이동, pnpm 명령어 표를 `docs/PNPM.md`로 분리

**검증:** `pnpm test:run` ✅ 6/6 / `pnpm typecheck` ✅ / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 기존 코드 에러 5·경고 65 (변동 없음)

### 2026-11-18 — 1단계 잔여물 정리

- `index.html`: CRA 주석 제거, `lang="ko"`, description 한국어, 중복 favicon 링크 정리, `theme-color` → `#f5f8ff`
- `public/manifest.json`: 앱 이름 "세마치 합주판", 색상 `#f5f8ff`
- env 분리: `envDir: 'env'`, `env/.env`(커밋)에 `VITE_API_URL`. `constants`의 하드코딩 URL 제거, 미설정 시 에러
- `vite.config.ts` → `vite.config.mts` (config loader 경고 해결, `"type": "module"`은 CommonJS인 `api.js` 때문에 사용 안 함)
- 폰트 TTF → woff2 (약 6.5MB → 1.16MB), `@font-face`의 죽은 `src: local(...)` 제거
- 디버그 `console.log` 3건 제거
- `.gitignore` CRA 템플릿 정리 + env 규칙

**검증:** `pnpm typecheck` ✅ / `pnpm build` ✅ (config loader 경고 사라짐, 번들에 env의 API 주소 반영 확인) / `pnpm test:run` ✅ 6/6 / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62

### 2026-11-19 — React 19 업그레이드

- `react`·`react-dom` 18.3.1 → 19.3.1, `@types/react`·`@types/react-dom` → 19.3.0
- `@ant-design/v5-patch-for-react-19` 추가, `src/index.tsx` 최상단에서 import (antd 교체 시 제거)
- React 19에서 제거된 API 사용처 0건 → 코드 수정 없음. 기존 TS 파일도 19 타입으로 타입 체크 통과
- `src/App.test.tsx` 추가: 실제 Provider 구성으로 App 전체 렌더링(API는 MSW) → 데이터 표시, 팀 클릭 시 Drawer 열림 확인
- 콘솔 경고 비교: React 18과 19에서 같은 테스트를 돌려 경고 종류가 동일함을 확인(새 경고 0건). 기존 경고 4종은 App 테스트에 허용 목록으로 두고, 그 외 경고가 생기면 실패하도록 함
  - styled-components props가 DOM으로 전달됨(`scrollPosition`, `isEvent`, `openedDrawers`, `row` 등) → View 개편 시 해소
  - `TeamInfoDrawer`의 key 없는 Fragment map
  - antd Drawer `maskStyle` deprecated
- 개발 서버에서 진입점·patch·React 19 모듈 로드 확인

**검증:** `pnpm test:run` ✅ 8/8 / `pnpm typecheck` ✅ / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

## 남은 일

### 린트 지적 사항 (기존 코드, 아직 수정하지 않음)

동작이 바뀔 수 있어 2·3단계에서 승인 후 처리한다.

| 규칙 | 건수 | 비고 |
|---|---|---|
| `react(jsx-key)` ❌ | 2 | `AddTeamDrawer6`, `AddEnsembleDrawer4`의 `extra={[<OkButton />]}` |
| `react(set-state-in-effect)` ❌ | 3 | `Drawer`(resize 초기값), `AddTeamDrawer2`, `UpdateTeamDrawer3`(랜덤 데모 이름) |
| `react-hooks/exhaustive-deps` | 31 | stale closure 가능성. 일부는 실제 버그(`notice/index.jsx`의 `handleClickDelete` deps `[]` 등) |
| `no-unused-vars` | 29 | 사용하지 않는 import·변수 |
| ~~`no-console`~~ | ~~3~~ → 0 | ✅ 1단계 잔여물 정리 때 제거 |
| `react(exhaustive-effect-dependencies)` | 2 | `App`의 `fetchData` effect 등 |

### 1단계 잔여물 ✅ 모두 처리
- ✅ `index.html`: CRA 안내 주석, description 문구, `lang="en"`
- ✅ `public/manifest.json`: CRA 기본 앱 이름
- ✅ `VITE_API_URL` 선언만 있고 실제로는 `constants`에 하드코딩된 URL 사용
- ✅ 프론트엔드 env를 백엔드 `.env`에서 분리
- ✅ Vite config loader 경고 (`"type": "module"` 대신 `vite.config.mts`로 해결)
- ✅ 폰트 TTF → woff2, `@font-face` `src` 중복
- ✅ 디버그용 `console.log`

### 적용 예정 (상세는 `docs/MODERNIZATION.md`)

| 항목 | 대체 대상 | 시점 |
|---|---|---|
| ~~React 19 (+ `@ant-design/v5-patch-for-react-19`)~~ | ~~React 18~~ | ✅ 완료 (2026-11-19) |
| Zod | 수동 응답 정제 | 2단계 (API 응답 타입 정의 시) |
| TanStack Query | `context/fetch` (`fetchData`, `xxxExists` 사전 확인) | 3단계 |
| Zustand | `context/team`, `ensemble`, `drawer` | 3단계 |
| Tailwind CSS v4 | styled-components | View 개편 |
| shadcn/ui | antd (`useMessage` → Sonner, `PinInput` → input-otp) | View 개편 |
| (검토) React Compiler | 수동 `useCallback`/`useMemo` | 3단계 이후 |

### 환경
- 로컬 Node가 24.14.0인데, jsdom 31의 일부 하위 의존성이 `^24.15.0`을 요구해 설치 시 engine 경고가 뜬다(동작에는 문제 없음). Node 24 최신으로 업데이트 권장.

### 다음 순서
1. 2단계 TS 전환 (constants → hooks → context → components)
2. 로직 개선 전 `context/fetch.jsx` 정제 로직에 characterization test 작성
