# 마이그레이션 진행 기록

> 단계 정의와 규칙은 `CLAUDE.md`, 추가 최신화 항목의 근거는 `docs/archive/MODERNIZATION.md` 참고.

## 현황

| 단계 | 상태 |
|---|---|
| 1. CRA → Vite | ✅ 완료 (잔여물 처리 완료) |
| 2. JS → TS 100% 전환 | ✅ 완료 (2026-11-20, `src`의 JS 0개, 계획: `docs/archive/TS_MIGRATION_PLAN.md`) |
| 3. 내부 로직 개선 | ✅ 완료 (2026-11-23, 계획: `docs/archive/LOGIC_IMPROVEMENT_PLAN.md`. 3-6은 폐기하고 알림 기능 삭제) |
| 백엔드 개편 | 📝 계획 수립 (2026-11-27, 브랜치 `api3.0`, 계획: `docs/BACKEND_PLAN.md`). B-1 ✅ · B-2 ✅ · B-3 ✅ · B-4 ✅ · B-5 ✅ · B-6 ✅, 다음은 B-7 (서버·DB가 필요한 B-12~B-15는 OCI·DB 접근을 받은 뒤) |
| View 개편 | ✅ **완료 (2026-11-26, V-0 ~ V-7)**: V-0·V-1 ✅, **V-2 합주표 ✅ (2026-11-25, 1~32차 + 마무리)**, **V-3 팀 ✅ (2026-11-26, 1~17차 + 마무리)**, V-4 날적이 ✅, V-5 공지 ✅, **V-6 일괄 정리 ✅**, **V-7 마무리 ✅ (2026-11-26)** (브랜치 `ui3.0`, 계획: `docs/archive/VIEW_REDESIGN_PLAN.md`) |

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
- 문서: `MODERNIZATION.md`를 `docs/`로 이동, pnpm 명령어 표를 `docs/PNPM.md`로 분리 (현재 `docs/archive/PNPM.md`)

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

### 2026-11-19 — 2-0: 사전 결정 + 도메인 타입

- 사전 결정 (모두 추천안 채택)
  1. Zod: 스키마 정의 + `z.infer` 타입만. 응답 `parse`는 3단계에서 적용
  2. styled-components 커스텀 props: 이름 유지, 타입만 부여
  3. `noUncheckedIndexedAccess` 등 추가 엄격 옵션: 끄기 (2단계 완료 후 재검토)
  4. Drawer ID: union 타입 `DrawerId`
- `zod` 4.6 설치
- `src/types/` 추가 (아직 사용처 없음, 2-1부터 적용)
  - `response.ts`: 서버 응답 Zod 스키마 4개(team, ensemble, note, notice)와 `XxxResponse` 타입. `api.js`의 mongoose 스키마 기준
  - `domain.ts`: `Team`, `EnsembleBlock`, `EnsembleBoard`, `Note`, `Notice`, `TeamType`, `DayIndex`, `TimeSlot`
  - `drawer.ts`: `DrawerId` (30개, 코드의 `drawerId`·`openDrawer` 호출과 일치 확인)
  - `index.ts`: 재export
- `src/types/response.test.ts`: 실제 응답 형태(`__v`, ISO 날짜 포함)를 스키마가 받아들이는지 검증
- Oxlint `no-unused-vars`에 `ignoreRestSiblings` 추가 (rest 구조분해로 필드를 빼는 패턴 허용, 기존 경고 수 변화 없음)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 11/11 / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-19 — 2-1: constants, styles

- `git mv`: `constants/index.js`, `styles/media.js`, `styles/GlobalStyle.js` → `.ts`
- `constants`
  - `days`, `hours`, `idx2hour`: `as const`
  - `eventIds`, `demoNames`: `readonly string[]`. `eventIds`를 `as const`로 하면 이후 `eventIds.includes(string)` 7곳이 타입 에러가 나서 리터럴 타입을 쓰지 않음 (계획 문서 메모에서 변경)
  - `url`: `string`으로 좁혀지도록 env 값을 지역 변수로 받아 검사 후 export (동작 동일)
- `media`: `reduce` 대신 사이즈별로 명시한 객체 + 제네릭 시그니처
  - 함수 형태는 styled 컴포넌트 props가 인자로 추론됨
  - tagged template에 `${}` 보간을 넣으면 값이 사라지는 기존 동작이 있어, 보간 값을 넣으면 타입 에러가 나게 함
  - 주석 처리돼 있던 옛 구현 제거
  - 이전 `media.js`와 출력 문자열이 같음을 임시 테스트로 확인 (small·large × tagged template·함수·문자열)
- `GlobalStyle`: 확장자만 변경 (woff2 import는 `vite/client` 타입이 처리)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 11/11 / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-19 — 2-2: api

- `git mv`: `api/index·team·ensemble·note·notice.js` → `.ts`
- `api/index.ts`: `get<T>`·`post<T>`·`put<T>`·`del<T>` 제네릭. 응답 타입은 호출부가 지정하며 런타임 검증은 없음 (parse는 3단계)
- 리소스별 함수에 인자·응답 타입 부여. 응답 타입은 `api.js`의 실제 `res.json()` 값 기준
  - 목록: `XxxResponse[]` / 존재 확인: `ExistsResponse`(boolean, 없으면 404로 reject) / PIN 확인: `PinCheckResponse`(boolean)
  - 변경 요청: 엔드포인트별 `IdResponse` · `MessageResponse` 조합
- `src/types/request.ts` 추가: `TeamCreateRequest`, `TeamUpdateRequest`, `EnsembleCreateRequest`, `EnsembleUpdateRequest`
- `src/types/response.ts`에 변경 응답 타입 추가 (호출부에서 쓰지 않아 스키마 없이 타입만)
- 호출부(teams·board index)의 실제 요청 형태를 옮긴 임시 파일로 요청 타입이 맞는지 확인
- `ensemble?id=` 경로의 빠진 `/`는 그대로 둠 (주석으로 3단계 정리 대상 표시)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 11/11 / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 2-3: hooks

- `git mv`: `hooks/useMessage.jsx` → `.tsx`, `hooks/useScrollPosition.js` → `.ts`
- `useMessage`: 반환 타입 `[Message, ReactElement]` 튜플, `Message` 인터페이스 export, `MessageType` union, 색상 맵 `Record<MessageType, string>`, `Content`의 `type` prop 타입
  - 거의 같은 알림 함수 4개(success·error·warning·info)와 렌더링마다 새 객체를 만드는 구조는 그대로 둠 (3단계 대상)
  - 알림 함수 인자는 `string`. 호출부 전부가 문자열 리터럴임을 확인
- `useScrollPosition`: 반환 타입 `number`
- `src/hooks/useMessage.test.tsx` 추가: 알림 표시, 새 알림이 이전 알림을 지우는 동작
  - jsdom은 CSS 애니메이션 종료 이벤트를 보내지 않아, antd 알림이 퇴장 애니메이션 상태로 DOM에 남는다. 퇴장 애니메이션 진행 상태가 된 뒤 종료 이벤트를 직접 발생시켜 검증 (antd 내부 클래스명에 의존 → Sonner 교체 시 함께 수정)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 13/13 (3회 반복) / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 2-4: context

- `git mv`: `context/drawer·team·ensemble·fetch·index.jsx` → `.tsx`
- 각 Context에 `XxxContextValue` 인터페이스 정의, `createContext<XxxContextValue | null>(null)`
  - `DrawerContextValue`: `openedDrawers: DrawerId[]`, `openDrawer(drawId: DrawerId)`
  - `TeamContextValue`: `setTeamStates`·`setTeamOrgStates`는 모든 인자 optional (인자 없이 호출 = 초기화, 13곳에서 사용)
  - `EnsembleContextValue`: `nextDate: Dayjs | null`, `startTime`·`endTime: TimeSlot | null` (null = 선택 안 됨)
  - `FetchContextValue`: `teams: Team[]`, `ensembles: EnsembleBoard`, `notes: Note[]`, `notices: Notice[]`, `fetchData: () => Promise<void>`
- `fetch`의 정제 로직은 타입 주석 2개(`teamsData: Team[]`, `blocks: EnsembleBoard`)만 추가, 로직 변경 없이 타입 체크 통과
- `useXxxContext()`: Provider 밖에서 호출하면 명확한 에러를 던지는 `useRequiredContext`로 통일 (이전에도 undefined 구조분해로 TypeError가 났으므로 실질 동작 동일)
- 쓰지 않던 `import React` 제거 (JSX 런타임이 자동 처리). 기존 주석은 모두 유지
- 그대로 둔 것 (3단계 대상): Provider `value` 객체를 매 렌더링 새로 만드는 구조, `team.tsx`의 쓰지 않는 `checkTeamPin` import
- `src/context/index.test.tsx` 추가: Provider 밖 호출 에러, Drawer 스택(open·close·closeAll), `setTeamStates()`·`setEnsembleStates()` 초기화

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 18/18 (2회 반복, App 스모크 테스트 포함) / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 2-5: components/common

- `git mv`: `Container`·`PinInput` → `.ts` (JSX 없음), `Drawer`·`OkButton`·`Tooltip` → `.tsx`
- `Drawer`: `DrawerProps` (`drawerId: DrawerId`, `focusInputRef?: RefObject<FocusableInputRef | null>` 등), `StyledDrawer`의 커스텀 props 타입
  - `FocusableInputRef = Pick<InputRef, 'focus'>`: antd Input·TextArea ref를 모두 받음 (`focus({ cursor })` 시그니처 공통)
- `OkButton`: `OkButtonProps extends Omit<ButtonProps, 'children'>` + `label?: string`. `disabled`가 optional이 되어 `OkButton.test.tsx`의 `disabled={false}` 우회 제거
- `Container`: `row?: boolean` / `PinInput`: `styled(Input)`이 antd 타입을 물려받아 확장자만 변경 / `Tooltip`: `title`, `children`
- 이후 단계의 실제 사용 형태(Input·TextArea·`styled(PinInput)` ref, `background`, `closable`, 잘못된 Drawer ID)를 임시 파일로 확인
- 그대로 둔 것 (3단계 대상): `Drawer`의 resize effect 안 setState, 쓰지 않는 `closeAllDrawers`, `Tooltip`의 쓰지 않는 `styled` import

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 18/18 (2회 반복) / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 2-6: components/layout

- `git mv`: `Header.jsx`·`Footer.jsx` → `.tsx`
- 두 컴포넌트 모두 props가 없어 `StyledHeader`의 `scrollPosition: number` 타입만 추가, 쓰지 않던 `import React` 제거
- 그대로 둔 것 (3단계 대상): `scrollPosition`은 스타일에서 쓰이지 않고 DOM으로만 새는 prop, 쓰지 않는 `BellOutlined` import

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 18/18 / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 2-7: components/notice

- `git mv`: `notice/index·NoticeDrawer·AddNoticeDrawer·DeleteNoticeDrawer.jsx` → `.tsx`
- 각 Drawer에 `XxxDrawerProps` 정의. 부모가 내려주는 콜백은 한 Drawer에서만 쓰여 공용 타입 없이 props에 시그니처를 직접 기술
- 코드를 바꾸지 않고 타입으로 현재 동작을 기록한 곳
  - `StyledPinInput`: `value: string`(antd value 타입을 좁힘), `error: boolean`, `controls?: boolean`(Input에 없는 prop이라 DOM으로만 전달됨, 3단계 대상)
  - `AddNoticeDrawer`의 `handleAddNotice(text, pin)`: 부모는 `text`만 사용 → props 타입은 호출 형태 그대로 두고 주석 (3단계 대상)
  - `NoticeDrawer`의 `setId`: 부모가 넘기지만 사용하지 않음 → props 타입에 포함하고 주석 (3단계 대상)
- 값 변경 1곳: `status={... ? 'error' : null}` → `undefined`. antd 타입이 null을 허용하지 않음. antd 내부에서 둘 다 falsy로 처리되어 결과 동일
- TextArea ref 타입은 antd의 `GetRef<typeof TextArea>`로 얻음 (깊은 경로 import 회피)
- 테스트
  - `src/test/fixtures.ts` 추가: 공용 서버 응답 데이터와 `mockInitialData()`. `src/test/render.tsx`에 `renderApp()` 추가. `App.test.tsx`를 이들로 정리 (`/team/:id` 모킹을 실제 응답인 `true`로 수정)
  - `src/components/notice/Notice.test.tsx` 추가: 공지 등록(서버에 `{ content }`만 전송), 틀린 PIN이면 완료 비활성, 공지 삭제(`DELETE /notice?id=`)
  - 비활성 `OkButton`은 `visibility: hidden`이라 접근성 이름이 비어 role로 못 찾음 → 문구로 찾고 활성화를 기다리는 헬퍼 사용. 이 처리 전에는 PIN 확인 응답 타이밍에 따라 간헐적으로 실패했음 (6회 반복으로 안정성 확인)
  - 틀린 PIN 테스트는 서버 확인이 끝난 뒤 상태를 보도록 작성하고, 서버가 true를 주면 실패하는 것까지 확인

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 21/21 (2회 반복) / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 2-8: components/note

- `git mv`: `note/index·AddNoteDrawer·DeleteNoteDrawer.jsx` → `.tsx`
- 2-7(notice)과 같은 방식: Drawer별 `XxxDrawerProps`, `StyledPinInput`·`StyledTextArea` props 타입, `status`의 `null` → `undefined` 1곳
- notice와 다른 점: `handleAddNote(text, pin)`은 pin을 실제로 서버에 보낸다 (주석 불필요)
- 테스트
  - `src/test/queries.ts` 추가: `findEnabledButton()` (2-7의 공지 테스트에 있던 헬퍼를 공용으로 이동)
  - `src/components/note/Note.test.tsx` 추가: 한마디 등록(서버에 `{ text, pin }` 전송), 삭제(PIN 확인 `{ noteId, pin }`, `DELETE /note?id=`)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 23/23 (2회 반복) / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 2-9: components/board

- `git mv`: `board/index·EnsembleInfoDrawer·DeleteEnsembleDrawer·SkipEnsembleDrawer.jsx` → `.tsx`
- `src/components/board/types.ts` 추가: 하위 Drawer 여러 곳이 받는 콜백 타입(`CheckEnsembleExists`, `HandleUpdateEnsemble`, `HandleSkipEnsemble`, `HandleDeleteEnsemble`, `HandleClickTeamInfo`). `index.tsx`에 두면 순환 import가 생겨 폴더별 `types.ts`로 분리
- non-null 단언(`!`)으로 처리한 곳 (실행 결과 동일, 주석으로 근거 기록)
  - `handleUpdateEnsemble`: context 값(`Dayjs | null`, `TimeSlot | null`)을 받지만 서버 요청엔 non-null 필요. 선택을 마친 뒤에만 호출되며, null이면 기존에도 `nextDate.day()`에서 TypeError → catch
  - `handleClickTeamInfo`: `teams.find()!`. 없으면 기존에도 구조분해 TypeError → catch의 "이미 삭제된 팀" 경로
  - `EnsembleInfoDrawer`의 `idx2hour[startTime!]`, `idx2hour[endTime! + 1]`: 열려 있는 동안은 값이 있음
- 타입으로 기록한 기존 문제 (3단계 대상)
  - `EnsembleInfoDrawer`는 `handleSkip`으로 구조분해하지만 부모는 `handleSkipEnsemble`로 넘김 → `handleSkip?: never`, `handleSkipEnsemble`(미사용)로 표시
  - `Ensemble` 블록의 `teamColor: string | -1` (-1이 그대로 CSS 값이 됨)
- 테스트
  - `src/test/queries.ts`: `findEnabledButton()`에 범위(container) 인자 추가, `findDrawer()` 추가
  - `src/components/board/Board.test.tsx` 추가: 합주 정보 표시, 수정(PIN → 반복 → 달력 → 시간 → `PUT` 본문), 미루기(7일 뒤 `nextDate`), 삭제. `Date`만 가짜로 고정(2026-11-20)
  - 수정 흐름은 2-10의 updateEnsembleDrawers를 거치므로 2-10 검증도 겸함

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 27/27 (2회 반복, 합주 테스트는 4회 반복) / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 2-10: components/board/updateEnsembleDrawers

- `git mv`: `UpdateEnsembleDrawer1~4.jsx` → `.tsx`
- `Drawer1`(PIN): 2-7과 같은 `StyledInput` props 타입, `status`의 `null` → `undefined`. `onClose`의 원래 값 복원 인자 타입
- `Drawer2`(반복 여부): `repeat: boolean` / `Drawer3`(달력): `Dayjs` 인자, `isSameOrBefore` 플러그인 타입은 플러그인 import로 자동 확장
- `Drawer4`(시간): `HandleUpdateEnsemble` 콜백 타입. 시간 선택 로직은 `if`의 null 검사로 타입이 좁혀져 코드 변경 없음. `Header`·`TimeButton`의 `show`·`selected` props 타입
- 실제 동작은 2-9의 `Board.test.tsx` 수정 흐름 테스트로 검증

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 27/27 / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 2-11: components/teams

- `git mv`: `teams/index·TeamInfoDrawer·EventInfoDrawer·DeleteTeamDrawer.jsx` → `.tsx`
- `src/components/teams/types.ts` 추가: `CheckTeamExists`, `HandleAddTeam`, `HandleUpdateTeam`, `HandleDeleteTeam`, `HandleAddEnsemble` (2-12~2-14에서 쓸 타입 포함)
- `handleAddEnsemble`: 2-9의 `handleUpdateEnsemble`과 같은 이유로 non-null 단언(`!`), 근거 주석
- `TeamButton`: `idx?: number`. `AddTeamButton`은 idx 없이 렌더링되지만 배경·그림자를 자체 값으로 덮어써 영향 없음 → 스타일 안에서만 `idx!`
- `TeamInfoDrawer`: `styled(Segmented<string>)`로 제네릭 지정 (styled로 감싸면 onChange 인자가 unknown이 됨, 타입 단언 대신 instantiation expression 사용)
- `EventInfoDrawer`: `name2FullName: Record<string, string>`
- 발견한 기존 버그 (3단계 대상, 동작 변경이라 손대지 않음)
  - `DeleteTeamDrawer`: `useMessage()`의 `contextHolder`를 렌더링하지 않아 네트워크 오류 알림이 표시되지 않음
- 테스트
  - `src/components/teams/Teams.test.tsx` 추가: 팀 추가 6단계(서버에 보내는 `{ type, name, desc, pin, publishDate }`), 팀 정보 탭 전환, 팀 삭제(PIN `{ teamId, pin }`, `DELETE /team?id=`), 소모임 전체 이름. 팀 추가 흐름은 2-12의 addTeamDrawers 검증도 겸함
  - `vite.config.mts`: `testTimeout` 15초. 여러 단계 흐름 테스트가 병렬 실행 시 기본값 5초를 넘김(단독 실행은 통과)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 31/31 (3회 반복) / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 2-12: components/teams/addTeamDrawers

- `git mv`: `AddTeamDrawer1~6.jsx` → `.tsx`
- `AddTeamDrawer1`: 선택지 `options`의 `value`를 `TeamType`으로
- `AddTeamDrawer2·3`의 `StyledInput`: `value: string`으로 좁힘 / `AddTeamDrawer3`의 `Label`: `idx`, 스타일에서 구조분해만 하는 `isEvent?`
- `AddTeamDrawer4`: TextArea ref(`GetRef`), `ChangeEvent<HTMLTextAreaElement>`
- `AddTeamDrawer5`: `ConfirmInput`의 `$visible`·`$error`, `status`의 `null` → `undefined`
- 발견한 기존 버그 (3단계 대상, 동작 변경이라 손대지 않음)
  - `AddTeamDrawer5`: `handleAddTeam()`을 await하지 않고 바로 완료 화면(addTeam6)을 열어, 저장이 실패해도 "팀을 만들었어요"가 표시됨 (코드에 주석)
- 실제 동작은 2-11의 `Teams.test.tsx` 팀 추가 흐름 테스트로 검증

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 31/31 / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 2-13: components/teams/updateTeamDrawers

- `git mv`: `UpdateTeamDrawer1~5.jsx` → `.tsx`
- 2-12(addTeamDrawers)와 같은 방식: PIN·이름·멤버·셋리 Drawer의 props와 styled props 타입, `status`의 `null` → `undefined` 1곳
- `UpdateTeamDrawer1`: 원래 값 복원용 `onClose` 인자 타입, `CheckTeamExists` / `UpdateTeamDrawer5`: `HandleUpdateTeam`
- `UpdateTeamDrawer3`의 컴포넌트 상수 이름은 `UpdateTeam3`(기존 그대로), props 인터페이스는 파일명에 맞춰 `UpdateTeamDrawer3Props`
- 테스트 (`Teams.test.tsx`에 추가)
  - 팀 수정 5단계: 기존 값이 채워지는지, `PUT /team?id=` 본문 `{ type, name, desc }`
  - 합주 추가 4단계(2-14 검증 겸함): 반복 여부 → 달력 → 시간 → `POST /ensemble` 본문(요일·시간칸·레거시 `type`·`due` 포함), 완료 화면. `Date`만 가짜로 고정

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 33/33 (3회 반복, 팀 테스트는 3회 추가 반복) / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 2-14: components/teams/addEnsembleDrawers

- `git mv`: `AddEnsembleDrawer1~4.jsx` → `.tsx`
- 2-10(updateEnsembleDrawers)과 같은 방식: 반복 여부(`boolean`), 달력(`Dayjs`), 시간 선택(`TimeSlot`, `if`의 null 검사로 타입이 좁혀져 코드 변경 없음), `Header`·`TimeButton` props 타입
- `AddEnsembleDrawer3`: `HandleAddEnsemble`
- 발견한 기존 버그 (3단계 대상, 동작 변경이라 손대지 않음)
  - `AddEnsembleDrawer3`: `handleAddEnsemble()`을 await하지 않고 바로 완료 화면(addEnsemble4)을 열어, 저장이 실패해도 "등록했어요"가 표시됨 (2-12의 팀 추가와 같은 문제, 코드에 주석)
- 실제 동작은 2-13에서 추가한 `Teams.test.tsx` 합주 추가 흐름 테스트로 검증

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 33/33 / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 2-15: App + 마무리

- `git mv`: `App.jsx` → `App.tsx`, `Container`의 `openedDrawers: DrawerId[]` 타입
- `tsconfig.json`: `allowJs`·`checkJs` 제거 → 이제 `src`에 JS 파일이 생기면 import 시 에러
- Oxlint: `typescript/no-explicit-any`를 error로 추가 (`any` 금지 규칙을 린트로 강제, 임의의 `any`를 잡는 것까지 확인). 현재 `src`의 `any`·`TODO(type)` 0건
- `src`의 `.js`·`.jsx` 0개 → 2단계 완료
- 그대로 둔 것 (3단계 대상): `App`의 `fetchData` effect 의존성 경고 2건

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 33/33 / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — fetchData characterization test (3단계 준비)

- `src/context/fetch.test.tsx` 추가 (21개): 서버 응답 → 화면용 데이터 정제 로직의 **현재 동작**을 고정
  - 팀: `_id`→`id`, pin 제외, 소모임·회의 제외, 순서 유지
  - 합주표: 7×30 배열, `startTime~endTime` 칸마다 배치, 첫 칸에만 팀 이름, 겹치는 합주
  - 색상: 팀 목록 순서로 `teamColors` 순환, 소모임은 `eventColors`, 목록에 없는 팀은 `-1`
  - 다음 합주 날짜: 일회성(미래·오늘), 반복+미래, 반복+같은 요일(안 끝남·오늘·늦은 시각·끝남·마지막 칸), 반복+다른 요일(화·목·일)
  - 한마디·공지 매핑
- 이상해 보이는 현재 동작도 그대로 기록함 (3단계에서 바꾸려면 승인 후 기대값을 함께 수정)
  - 반복 합주의 다음 날짜가 오늘/다른 요일로 바뀌면 **현재 시각이 붙는다** (자정이 아님)
  - 목록에 없는 팀의 `teamColor`는 `-1`
- 테스트 품질 확인: `fetch.tsx`를 14가지로 일부러 바꿔(뮤테이션) 모두 실패로 잡히는지 확인. 처음 놓친 3가지(일회성 분기, 요일 계산식, 날짜 비교 단위)는 테스트를 추가해 보완
- `vite.config.mts`: 테스트 시간대를 `Asia/Seoul`로 고정 (`env.TZ`). 실행 환경 TZ가 UTC·America/Los_Angeles여도 통과 확인

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ / `pnpm format:check` ✅

### 2026-11-20 — 2단계 마무리 전체 테스트

| 항목 | 결과 |
|---|---|
| 깨끗한 설치 (`pnpm install --frozen-lockfile`) | ✅ |
| `src`의 JS 파일 | 0개 (TS 84개) |
| `pnpm typecheck` | ✅ |
| `pnpm lint` | 에러 5·경고 62 (2단계 시작 전과 동일, 모두 기존 코드) |
| `pnpm format:check` | ✅ |
| `pnpm test:run` (3회 반복) | ✅ 11개 파일, 54개 테스트 |
| 커버리지 (`pnpm test:coverage`, 신규) | 구문 87% · 분기 77% · 함수 88% · 줄 87%. 미실행 부분은 대부분 네트워크 오류·"이미 삭제됨" catch 경로, Drawer 닫기 초기화, Enter 키 제출 |
| `pnpm build` | ✅ JS 936kB(gzip 294kB). 2단계 전 857kB 대비 +79kB는 React 19(react-dom 증가)가 주원인으로 판단. Zod는 타입만 import해 번들에 포함 안 됨 |
| 개발 서버 | 진입점·App·context·컴포넌트 모듈 200, antd 패치 로드, TS 변환 확인 |
| 프로덕션 미리보기 (`build/`) | HTML·JS 200, 번들에 env의 API 주소, 폰트 woff2 |
| 커밋 재현성 | 깨끗한 worktree에서 HEAD 타입 체크·테스트 54개 통과 |

- `@vitest/coverage-v8` 추가, `test:coverage` 스크립트
- `noUncheckedIndexedAccess` 재검토(2-0에서 2단계 후로 미룸): 켜면 에러 21개 (teams 9, context 6, board 6). 대부분 배열 인덱스 접근(`idx2hour[...]`, `blocks[day][hour]`, `desc[idx]` 등)이라, 3단계에서 해당 로직을 정리하면서 켜는 것을 권장

### 2026-11-20 — 3단계 계획 수립

- `docs/archive/LOGIC_IMPROVEMENT_PLAN.md` 작성. View 개편 때 Drawer가 단일 Drawer로 바뀌는 것을 전제로, 개편 후에도 남는 층(api·queries·lib·notify·stores)에 집중
- 사전 결정 8개 모두 추천안으로 확정
- team·ensemble Context는 Zustand로 옮기지 않고 View 개편 때 폼 로컬 상태로 흡수 → `docs/archive/MODERNIZATION.md`에 "View 개편 체크리스트" 추가
- `docs/ISSUES.md`: B1·B2 전달 완료, B4 추가, 항목별 처리 단계 연결
- `docs/archive/BACKEND_SUGGESTIONS.md`: 백엔드 개발자 전달용 개선 제안

### 2026-11-20 — 3-0: 기반 준비

- `@tanstack/react-query` 5.108, `zustand` 5.1 설치
- `src/lib/queryClient.ts`: `createQueryClient()` (조회 재시도 1회, 탭 복귀 시 다시 불러오기는 기본값 유지). `src/index.tsx`에 `QueryClientProvider` 연결
  - 아직 query를 쓰는 곳이 없어 동작 변화 없음. 조회 실패 알림은 3-6에서 연결
- `src/test/render.tsx`: `renderWithTheme`·`renderApp`이 렌더링마다 새 QueryClient(재시도 끔)를 제공하고 반환값에 `queryClient` 포함
- `.claude/settings.json`: 허용 명령을 npm → pnpm 기준으로 (`typecheck`, `build`, `test:run`, 읽기 전용 검사인 `lint`·`format:check` 추가) (E3)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 54/54 (2회) / `pnpm build` ✅ (JS 961kB, +25kB는 react-query) / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 3-1: F1 팀 수정 데이터 손실 수정 (동작 변경, 사전 결정 6)

- 지금 → 바꾼 후
  - 멤버 단계(`UpdateTeamDrawer4`)에서 뒤로 가기: `desc` 7칸을 모두 비움 → 수정 전 값(`orgDesc`)으로 되돌림
  - 셋리 단계(`UpdateTeamDrawer5`)에서 뒤로 가기: 셋리스트를 비움 → 수정 전 셋리스트로 되돌림
  - 결과: 뒤로 갔다가 다시 진행해 저장해도 기존 멤버·셋리가 지워지지 않는다. "뒤로 가기 = 그 단계의 수정 취소"로, PIN 단계의 기존 동작(수정 전 상태로 복원)과 같은 의미
- Drawer 내부 수정이지만 운영 중인 데이터 손실이라 최소 범위(`onClose` 2곳)만 고침. Drawer 구조는 View 개편 때 바뀜
- `Teams.test.tsx`에 회귀 테스트: 멤버·셋리를 고친 뒤 뒤로 갔다가 다시 진행 → 기존 값 표시, 저장 본문에 기존 `desc`
  - 수정 전 코드에서 실패(멤버 칸이 빈 값)하는 것을 확인. 셋리 쪽 수정만 되돌려도 실패하는 것을 확인

**검증:** 아래 공통 검증 참고

### 2026-11-20 — 3-2: 순수 함수 추출 (동작 동일)

- `src/lib/` 추가. 현재 시각은 모두 `now` 인자로 받는다 (호출부가 `dayjs()`를 넘김) → 가짜 타이머 없이 테스트 가능
  - `board.ts`: `slotEndTime`(시간칸 끝 시각, `idx2hour[endTime + 1]` 파싱 중복 정리), `toTeams`, `buildColorMap`, `resolveNextDate`(4단 중첩 삼항 → if 분기), `toBoard`, `isSkipped`(Board 렌더링 안의 회색 판단)
  - `notes.ts`: `toNotes`, `toNotices`
  - `week.ts`: `getTodayIdx`, `getWeek`
  - `ensemble.ts`: `toEnsembleRequest` (board·teams에 중복돼 있던 요일 변환·레거시 `type`·`due` 계산)
- 호출부: `context/fetch`(정제 로직 → lib 호출), `board/index`(주간 날짜·회색 판단·수정 요청), `teams/index`(합주 추가 요청)
- 그대로 둔 현재 동작 (3-3에서 승인된 수정): 일요일 날짜 라벨(F2), 모듈 로드 시 1회 계산(F2), 다음 날짜의 현재 시각(F7), `teamColor` -1(F8). 코드 주석과 테스트에 "현재 동작"으로 표시
- 차이 (동작 영향 없음)
  - 같은 합주의 칸마다 `nextDate`를 다시 계산하던 것을 합주당 한 번 계산하고, 같은 Dayjs(불변) 값을 공유
  - 한 번 정제할 때 `dayjs()`를 여러 번 부르던 것을 하나의 `now`로 통일 (밀리초 차이)
  - 합주 요청 본문의 키 순서
- 테스트
  - 기존 테스트 55개가 수정 없이 통과 (`fetch.test.tsx` characterization 포함)
  - lib 단위 테스트 26개 추가 (`src/lib/*.test.ts`): characterization 기대값을 `now` 인자 방식으로 옮기고, 테스트가 없던 `isSkipped`(7일 경계)·`getWeek`(일요일 현재 동작)·`toEnsembleRequest`도 현재 동작대로 고정
  - 뮤테이션 검사: lib 코드를 20가지로 일부러 바꿔 **19가지 검출**
    - ⚠️ 정정: 처음에는 "20/20 검출"로 기록했으나, 검사 스크립트가 `npx vitest`를 써서 원본에서도 항상 실패(exit 1)하는 상태였다. 프로젝트의 vitest로 다시 실행하고, 원본 통과(기준선)를 먼저 확인한 뒤 `Tests N failed` 출력으로 판정해 재검사했다
    - 놓친 1가지: 반복 합주의 요일이 오늘보다 **뒤** 요일일 때의 `% 7` (기존 테스트는 화·목·일처럼 앞 요일만 있었다. 2단계 characterization 테스트도 같은 빈틈). 토요일 케이스를 추가해 검출 확인
    - 이후 뮤테이션 검사는 `pnpm exec vitest`(또는 `node node_modules/vitest/vitest.mjs`)로 실행하고 기준선을 먼저 확인한다. `npx vitest`는 이 환경에서 프로젝트 vitest를 찾지 못한다
- `noUncheckedIndexedAccess` 에러: 21개 → 19개 (board의 `idx2hour` 접근 2곳이 `slotEndTime`으로 합쳐짐)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 81/81 (2회) / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 3-3: 순수 함수 버그 수정 (동작 변경, 사전 결정 7)

ID마다 커밋을 나눴다. 각 커밋에서 해당 테스트 기대값을 함께 바꿨다.

| ID | 지금 → 바꾼 후 | 테스트 |
|---|---|---|
| F2 | 일요일에 합주표 날짜가 다음 주 → 오늘이 속한 주의 월~일(`lib/week`의 `getWeek`). 모듈 로드 시 1회 계산 → `useToday` 훅(`src/hooks/useToday.ts`)으로 자정마다 다시 계산 | 일요일·주 경계, 자정 갱신·연속 갱신·타이머 정리 |
| F7 | 다시 계산한 다음 합주 날짜에 현재 시각 → 그날 0시 (오늘 합주가 끝났는지는 현재 시각으로 판단) | characterization 기대값 `10:00` → `00:00` |
| F8 | 목록에 없는 팀의 `teamColor` `-1` → `theme.blueGray`, 타입 `string \| -1` → `string` | 기대값 갱신 |

- 테스트 보강: 일회성 합주 테스트가 F7 이후 반복 규칙과 결과가 같아져(둘 다 오늘 0시) 구분하지 못하게 됨 → "오늘 합주가 이미 끝난 시각" 조건으로 바꿔, 반복 규칙이었다면 7일 뒤가 되도록 함
- 뮤테이션 검사 (기준선 확인 후 `Tests N failed`로 판정): lib 23/23, `useToday` 2/2(의존성 누락·타이머 정리 누락), 옛 `getWeek` 1/1
- 진행 중 발견: 3-2의 뮤테이션 검사가 `npx vitest`로 실행돼 무효였다 → 재검사(19/20) 후 놓친 1건의 테스트를 추가하고 3-2 기록을 정정 (커밋 `3dfbb59`). `CLAUDE.md` 테스트 규칙에 실행 방법·판정 방법 추가
- 미루기 흐름 영향 (F7): 미루기는 블록의 `nextDate`에 7일을 더해 저장하므로, 이제 0시 날짜가 저장된다. Board 흐름 테스트는 날짜만 비교해 그대로 통과

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 84/84 (2회) / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 3-4: API 층 (P6, P8)

- P8 (동작 동일): `ensemble?id=` → `/ensemble?id=`. 수정 전 코드에서 최종 URL을 고정하는 테스트를 먼저 통과시킨 뒤 수정
- `isNotFound(err)`: 서버가 404로 응답한 요청 에러인지 (3-7·3-8에서 "이미 삭제됨" 처리에 사용)
- P6 (동작 변경, 사전 결정 4를 수정해 적용)
  - 적용 전 실제 서버의 GET 4개 응답을 스키마로 검증 (값은 출력하지 않고 개수·실패 위치·필드 이름만 확인): teams 39·notes 1·notices 2 통과, **합주 18개 중 1개가 `endTime: null`로 실패** (ISSUES P9)
  - 결정 4(검증 실패 = 조회 실패)대로면 이 1건 때문에 합주표 전체가 안 보인다 → 사용자 승인으로 **항목 단위 검증**으로 변경
  - `getList(endpoint, itemSchema)`: 배열이 아니면 에러(조회 실패), 형식이 맞지 않는 항목은 제외하고 위치·이유만 콘솔 경고 (값은 남기지 않음, 응답에 PIN이 있을 수 있음). 모르는 필드(`__v`)는 버림
  - 존재 확인·PIN 확인 응답은 `z.boolean()`으로 검증. 이전에는 PIN 확인 응답이 boolean이 아니어도 truthy면 맞는 PIN으로 처리됐다
  - 문제의 합주는 검증 전에도 칸이 만들어지지 않아 보이지 않던 데이터라, 화면 결과는 그대로
- 테스트 5개 추가 (`src/api/index.test.ts`): 필드 정리, 잘못된 항목 제외·경고에 값 없음, 배열 아님, 실제 서버 형태(`endTime: null`), PIN 응답 형식. 변형 검사: 목록 전체 검증으로 되돌리기·경고에 값 포함·PIN 검증 제거 모두 검출
- 번들: JS 961kB → 1,047kB (gzip 301kB → 325kB). Zod가 이제 실제로 번들에 포함됨. `zod/mini`로 줄일 수 있지만, View 개편 때 폼 검증(react-hook-form + Zod)에서 일반 Zod를 쓰게 되므로 바꾸지 않음

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 91/91 (2회) / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 62 (변동 없음)

### 2026-11-20 — 3-5: 조회를 TanStack Query로 (P1)

- `src/queries/` 추가
  - `teams.ts`: `teamsQueryKey`·`teamsQueryOptions`, `useTeams()` (`select: toTeams`)
  - `ensembles.ts`: `ensemblesQueryKey`·`ensemblesQueryOptions`, `useBoard()` (팀·합주를 모두 불러온 뒤 `toBoard`, 팀 색상이 팀 순서로 정해지므로)
  - `notes.ts`: 한마디·공지의 key·options, `useNotes()`·`useNotices()`
  - `refetchAll.ts`: `useRefetchAll()` — 이전 `fetchData`와 같은 역할(4개 전체 무효화). **임시**: 3-7·3-8에서 mutation별 무효화로 바뀌면 삭제
  - 캐시에는 서버 응답 원본을 두고, 화면용 변환은 `select`(lib 함수)에서 한다
- 컨테이너 4개(board·teams·note·notice): `useFetchContext()` → 조회 훅. 안의 `fetchData()` 호출은 이름을 유지한 채 `useRefetchAll()`로 바꿔 변경 범위를 최소화
- `App`: 최초 `fetchData()` effect 삭제 (각 조회 훅이 마운트될 때 불러옴). effect 의존성 린트 경고 2건 해소
- `context/fetch.tsx`·`fetch.test.tsx` 삭제. characterization 기대값은 3-2에서 `lib/*.test.ts`로 옮겨져 있다
- 동작 차이 (사전 결정 3)
  - 4개 목록을 **병렬**로 요청한다 (이전: 하나씩 순서대로). 하나가 실패해도 나머지는 표시된다 (이전: 실패한 지점 이후는 요청하지 않음)
  - 탭으로 돌아오면 다시 불러온다. 조회 실패 시 1회 재시도
  - 불러오기 전에는 빈 배열 (이전 Context 초기값과 같음). 조회 실패 알림은 3-6에서 연결
- 테스트 6개 추가 (`src/queries/queries.test.tsx`): 화면용 변환, 병렬 요청(4개가 모두 요청될 때까지 응답을 막아, 순차 요청이면 시간 초과로 실패), 합주표가 팀 목록을 기다림, 전체 다시 불러오기, 탭 복귀 시 다시 불러오기, 재시도 1회
  - 변형 검사 7/7 검출 (순차 요청, 팀 대기 제거, 다시 불러오기 누락, 재시도 횟수, 포커스 갱신 끔, 팀 변환 누락, 공지 변환 변경)
  - 진행 중 발견: 포커스 상태를 테스트 정리 전에 되돌리면 이전 테스트의 다시 불러오기가 다음 테스트의 요청 수에 섞였다 → 언마운트 후 되돌리도록 수정

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 76/76 (2회, fetch.test 21개 삭제·조회 훅 6개 추가) / `pnpm build` ✅ (JS 1,055kB) / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 60 (App effect 경고 2건 감소)

### 2026-11-23 — 3-6 폐기, 알림 기능 삭제, 흐름 테스트 간헐적 실패 수정

- 3-6(알림 중앙화: 루트 holder + `lib/notify`)을 구현했으나, 진행 중 드러난 흐름 테스트의 간헐적 실패 조사가 길어져 **사용자 결정으로 폐기**하고, **알림 기능을 프로젝트 전체에서 삭제**했다 (동작 변경, 사용자 지시)
  - 삭제: `src/hooks/useMessage.tsx`·`useMessage.test.tsx`, 사용처 13개 파일의 import 13·훅 호출 12·`contextHolder` 11·`message.xxx()` 39곳, `useCallback` deps의 `message` 18곳
  - 비게 된 catch 25곳에는 "오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)" 주석. 흐름 제어(Drawer 닫기·상태 초기화·다시 불러오기)는 그대로
  - 결과: 성공·실패·"이미 삭제됨"을 사용자에게 알리지 않는다 (ISSUES V6). F5·P4는 대상이 사라져 해소
  - **View 개편 때 (트렌디한) 알림 기능을 새로 추가한다**: `MODERNIZATION.md` View 개편 체크리스트, 계획 문서 "View 개편 때 넘겨주는 것"에 기록
  - 흐름 테스트에서 알림 문구를 기다리던 9곳은 서버 요청(본문·URL)이 보내질 때까지 기다리도록 변경
- 흐름 테스트 간헐적 실패 (ISSUES E6): 원인은 모두 테스트 쪽이었다
  1. Board `openEnsembleInfo`: `findAllByText('테스트밴드')`는 하나만 찾아도 끝나, 합주표가 늦게 그려지면 두 번째 요소(합주 블록)가 `undefined`인 채로 클릭 → 두 개가 다 보일 때까지 기다림
  2. Teams `openTeamInfo`: 첫 번째 `'테스트밴드'`를 팀 버튼으로 가정했으나 가끔 합주 블록이 잡혀, 모킹 없는 합주 존재 확인 → "이미 삭제됨" 처리로 Drawer가 모두 닫힘 → "팀 추가" 버튼과 같은 목록 안에서 찾음
  3. 팀 추가 PIN 단계: Drawer가 열림 애니메이션 뒤 PIN 칸으로 포커스를 옮겨, "한 번 더" 칸 입력 도중 포커스가 되돌아감 (ISSUES V7) → PIN 칸에 포커스가 옮겨진 뒤 입력
  - 조사 중 확인: 3-6 이전 커밋(`a8e61c2`·`03a62ca`·`8af5868`)에서도 `--maxWorkers=4`에서 실패 → 원래 있던 문제. 대기 시간을 5초로 늘려도 실패해 "느린 것"이 아니라 화면이 끝내 바뀌지 않는 경우였다
- `useRefetchAll` 등 3-5의 구조는 그대로

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 74/74 (3회) / `pnpm exec vitest run --maxWorkers=4` ✅ 4회 / `pnpm build` ✅ (JS 1,035kB) / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 57 (deps의 `message` 제거로 3건 감소)

### 2026-11-23 — 3-7: 공지·한마디 변경을 mutation으로 (P1·P2 일부)

- `src/queries/notes.ts`에 mutation 훅 추가: `useAddNote`·`useDeleteNote`·`useAddNotice`·`useDeleteNotice`, 목록 다시 불러오기 `useRefreshNotes`·`useRefreshNotices`
  - 훅의 책임: 서버 요청 + **해당 목록만** 다시 불러오기 (이전: 4개 목록 전체). 추가는 성공 시, 삭제는 성공·실패(404 포함) 모두 (이전 `finally`와 같음)
  - 다시 불러오기는 기다리지 않는다 (이전 `fetchData()`도 기다리지 않고 Drawer를 닫음)
- 컨테이너(`notice/index`·`note/index`): `handleXxx`는 `mutateAsync` + UI 반응(입력값 초기화·Drawer 닫기)만. `useRefetchAll` 사용 중단
- 사전 결정 5 (동작 변경): 삭제 X 버튼 클릭 시점과 삭제 직전의 존재 확인 요청을 제거. PIN Drawer 안의 확인(`checkXxxExists` prop)은 유지 → 삭제 흐름의 존재 확인 3회 → 1회. 이미 삭제된 경우는 서버의 404로 다른 실패와 같이 처리 (알림이 없으므로 화면 결과는 같음: Drawer 닫기·목록 다시 불러오기)
- `NoticeDrawer`의 `handleClickDelete` prop 타입: `Promise<void>` → `void` (동기 함수가 됨, 타입만 변경)
- 쓰지 않던 `checkNotePin` import 제거. 두 컨테이너의 `exhaustive-deps` 경고 해소 (deps `[]`였던 `handleClickDelete` 포함, F9 일부)
- 테스트
  - `src/test/requests.ts`: `recordRequests()`·`countOf()` (요청 기록 헬퍼, 리스너는 `setup.ts`의 afterEach에서 정리)
  - `src/queries/notes.test.tsx` 5개: 추가 후 해당 목록만, 추가 실패 시 다시 불러오지 않음, 삭제 404여도 다시 불러옴 (한마디·공지)
  - 흐름 테스트: 삭제 흐름의 존재 확인 1회, 삭제 후 해당 목록만 다시 불러오는지 확인 추가
  - 변형 검사 7/7 검출 (처음 1개 생존: 추가 실패 테스트가 비동기 다시 불러오기 시작 전에 세고 있었음 → 잠시 기다린 뒤 세도록 수정)
  - 한마디·공지 등록 테스트가 드물게 실패 → 팀 추가 PIN 단계(V7)와 같은 구조로 보고 Drawer의 포커스 이동을 기다린 뒤 입력하도록 수정 (실패 시점 DOM으로 확인하지는 못함)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 79/79 (3회) / `pnpm exec vitest run --maxWorkers=4` ✅ 3회 / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 50 (컨테이너 경고 7건 감소)

### 2026-11-23 — 3-8: 팀·합주 변경을 mutation으로 (P1·P2, F3, F4)

커밋을 셋으로 나눴다: 리팩터링(동작 동일 + 사전 결정 5) → F3 → F4

- 리팩터링 (`9684e95`)
  - `src/queries/keys.ts`: query key 4개와 `useRefresh(키 묶음)` — 팀 변경이 합주 목록도 다시 불러와야 해서 생기는 순환 import를 피함. 키 묶음은 모듈 상수(`TEAMS`·`ENSEMBLES`·`TEAMS_AND_ENSEMBLES`)라 돌려받는 함수가 렌더링마다 바뀌지 않음
  - mutation 훅: `useAddTeam`(팀 목록) · `useUpdateTeam`·`useDeleteTeam`(팀·합주 목록: 서버가 합주의 `teamName`을 바꾸고, 팀 삭제는 합주도 지움) · `useAddEnsemble`·`useUpdateEnsemble`·`useDeleteEnsemble`(합주 목록). 삭제는 404 포함 항상
  - 사전 결정 5 (동작 변경): 팀 버튼·합주 블록 클릭 시점과 수정·삭제·미루기 직전의 존재 확인 제거. 수정 중 서버가 404를 주면 `isNotFound`로 "이미 삭제됨" 처리(상태·Drawer 초기화, 목록 다시 불러오기). 합주 정보의 "팀 정보 보기"는 불러온 팀 목록에서 찾음(없으면 이미 삭제된 팀). 합주 추가 전 팀 확인은 유지(B4)
  - 요청 수: 미루기 흐름의 존재 확인 5회 → 2회, 팀 수정 4회 → 2회, 블록·팀 클릭 1회 → 0회
  - 임시 `useRefetchAll` 삭제 (모든 컨테이너가 mutation 훅으로 이전)
- F3 (`5b86e61`): 팀 추가·합주 추가가 저장 결과와 관계없이 완료 화면을 열던 것 → 성공했을 때만(`HandleAddTeam`·`HandleAddEnsemble`이 `Promise<boolean>`). 실패하면 그 단계에 머문다
- F4: 미루기가 저장을 기다리지 않고 화면 날짜를 먼저 바꾸던 것 → `handleUpdateEnsemble`이 성공 여부를 돌려주고, 성공한 뒤에 바꾼다
- 테스트
  - `src/queries/mutations.test.tsx` 6개: 변경마다 다시 불러오는 목록 (팀 추가 → 팀만, 팀 수정·삭제 → 팀·합주, 합주 → 합주만, 404·실패 시)
  - 흐름 테스트: 요청 수(사전 결정 5), 팀 수정 404 → Drawer 모두 닫고 팀·합주 다시 불러오기, F3 저장 실패 2개, F4 저장 실패 1개 (F3·F4 테스트는 이전 동작으로 되돌리면 실패하는 것 확인). 팀 추가·합주 추가 입력 단계를 헬퍼로 정리
  - 변형 검사(리팩터링) 8/8 검출

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 88/88 (2회) / `pnpm exec vitest run --maxWorkers=4` ✅ 2회 / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 43 (컨테이너 경고 7건 감소)

### 2026-11-23 — 3-9: Drawer 상태를 Zustand로 (사전 결정 1)

- `src/stores/drawer.ts`: `useDrawerStore` (`openedDrawers`, `openDrawer`, `setOpenedDrawers`, `closeAllDrawers`, `closeDrawer` — 이전 Context와 같은 API). 컴포넌트 밖에서도 `getState()`로 사용 가능
  - `setOpenedDrawers`: 함수형 업데이트(`SetStateAction`)를 받던 것을 배열만 받도록 좁힘 (호출부 2곳 모두 배열)
- `context/drawer.tsx` 삭제, `ContextProvider`에서 `DrawerContextProvider` 제거
- `useDrawerContext()`는 호환용 별칭으로 남김 (store 전체 구독 → 이전 Context와 같은 시점에 다시 렌더링). Drawer 파일 약 30개는 수정 없음. View 개편 때 정리 (`MODERNIZATION.md` 체크리스트에 기록됨)
- `App`: 열린 Drawer 스택만 구독 (`useDrawerStore((s) => s.openedDrawers)`)
- 테스트
  - store는 모듈 전역이라 테스트끼리 상태가 이어진다 (이전 Context는 렌더링마다 새로 만들어짐) → `setup.ts`의 afterEach에서 초기 상태로 되돌림. 이 초기화를 빼면 흐름 테스트 9개가 실패하는 것을 확인
  - `context/index.test.tsx`: Drawer 테스트를 Provider 없이 동작하도록 바꾸고 `setOpenedDrawers`·`getState()`·테스트 간 초기화 테스트 추가. "Provider 밖 호출 에러"는 아직 Context인 `useTeamContext`로 확인
  - 변형 검사 4/4 검출

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 91/91 / `pnpm exec vitest run --maxWorkers=4` ✅ 2회 / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 43 (변동 없음)

### 2026-11-23 — 3-10: 마무리

- `noUncheckedIndexedAccess` 켜기 (P7, 커밋 `cabdcf3`)
  - 로직: `slotEndTime`은 범위 밖이면 `RangeError`(이전에도 `undefined.split`에서 TypeError), `buildColorMap`은 `Partial` 반환(없는 팀은 `?? theme.blueGray`)
  - 합주표 배열 접근(`blocks[day][hour]`)은 응답 스키마의 범위 검증을 전제로 한다: `day` 0~6·`startTime`/`endTime` 0~29 정수·시작 ≤ 끝. 적용 전 실제 서버 합주 16건이 모두 범위 안임을 확인(값은 출력하지 않음). 범위 밖 항목은 항목 단위 검증에서 제외 (이전: 시작 > 끝은 칸이 안 만들어져 보이지 않았고, 범위 밖은 TypeError)
  - 컨테이너: `week[idx]?.`, `eventIds[idx]!`(이름 목록과 같은 순서·길이). Drawer 10곳은 `!` + 근거 주석 (View 개편 때 삭제될 코드)
- 린트: 로직 층의 마지막 경고(`context/team.tsx`의 쓰지 않는 `checkTeamPin` import) 제거. 남은 지적은 모두 View 쪽 → `ISSUES.md` 린트 현황
- React Compiler: View 개편 시작 시점에 판단 (`MODERNIZATION.md` 10번에 판단 메모)

### 2026-11-23 — 3단계 마무리 결과

| 항목 | 2단계 완료 (2026-11-20) | 3단계 완료 (2026-11-23) |
|---|---|---|
| 테스트 | 11개 파일, 54개 | 17개 파일, 93개 |
| 커버리지 (구문 · 분기) | 87% · 77% | 91% · 81% (`api`·`lib`·`queries`·`stores`·`hooks`·`context`·`types` 모두 100%) |
| 린트 | 에러 5 · 경고 62 | 에러 5 · 경고 42 (남은 것은 모두 View 쪽) |
| tsconfig | `strict` | `strict` + `noUncheckedIndexedAccess` |
| JS 번들 | 936kB (gzip 294kB) | 1,039kB (gzip 324kB): TanStack Query·Zustand·Zod 런타임 포함 |
| 데이터 불러오기 | 4개 API 순차, 변경마다 전체 다시 불러오기 | 병렬, 변경마다 영향을 받는 목록만, 탭 복귀 시 다시 불러오기 |
| 존재 확인 사전 요청 | 클릭·저장마다 | PIN Drawer 안과 합주 추가 전(B4)만 (미루기 5회 → 2회 등) |
| 서버 응답 | 검증 없음 | Zod 항목 단위 검증 |
| 상태 | Context 4개 | TanStack Query(서버) · Zustand(Drawer) · Context 2개(team·ensemble, View 개편 때 폼 로컬 상태로) |
| 알림 | `useMessage` | 없음 (3-6 폐기 때 삭제, View 개편 때 새로 추가) |
| 처리한 버그 | – | F1·F2·F3·F4·F5(알림 삭제)·F7·F8, P1·P2·P4·P6·P7·P8 |

- 3단계에서 넘긴 일: `LOGIC_IMPROVEMENT_PLAN.md` "View 개편 때 넘겨주는 것", View 개편 체크리스트 (현재 `docs/archive/VIEW_REDESIGN_PLAN.md`)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 93/93 / `pnpm test:coverage` ✅ / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 42

### 2026-11-23 — View 개편 계획 수립

- `docs/archive/VIEW_REDESIGN_PLAN.md` 작성: 진행 방식(기반 작업 → 기능 단위 → 일괄 정리, 사용자 확정), 사전 결정 8개(V-0에서 확정), 단계 V-0 ~ V-7, 기능 단계에서 할 일, 멈추고 보고할 조건, 작업마다 갱신할 문서, 공통 검증
- `MODERNIZATION.md`의 View 개편 체크리스트·8번(Tailwind)·9번(shadcn/ui)을 새 문서로 옮기고 링크만 남김. antd 사용처 집계(컴포넌트별 import 횟수)와 대체 후보 표 추가
- `CLAUDE.md`: View 개편은 새 문서를 따른다, 개편 중에도 로직 층은 바꾸지 않는 것이 원칙
- 완료된 3단계 계획(`LOGIC_IMPROVEMENT_PLAN.md`)과 전달 완료한 백엔드 제안(`BACKEND_SUGGESTIONS.md`)을 `docs/archive/`로 이동 (사용자), 문서·주석의 경로 참조 갱신

### 2026-11-23 — View 개편 V-0: 사전 결정 확정

- 사전 결정 2(단일 Drawer): **(b) shadcn Drawer(vaul, 아래에서 올라옴)**, 사용자 선택 (추천안은 (a) Sheet였음). 사용자의 약 90%가 모바일이라 한 손 조작에 맞춘다. 넓은 화면의 배치는 V-2 구성안에서 제안
- 사전 결정 1·3~7: 추천안대로 (레이어 순서, react-hook-form + Zod, lucide-react, shadcn Calendar, Sonner, React Compiler는 V-1에서 켜기)
- 사전 결정 8(디자인 방향): 새 디자인. 컨셉은 V-2(합주표) 구성안에서 정한다
- 디자인 원칙 추가 (사용자 결정, 모든 단계에 적용)
  - 반응형: UX는 모바일 기준, UI는 모바일·폴더블·PC 모두 불편함이 없도록. 구성안에 화면 폭별 배치를 함께 제안하고, 360·390~430·600~900·1024px 이상에서 확인
  - `teamColors` 20종은 서비스의 아이덴티티라 값·개수·순서를 바꾸지 않는다 (`eventColors`도 그대로 옮김)
- 기능 단계 순서 변경: 공지 → 한마디 → 합주표 → 팀 에서 **합주표(V-2) → 팀(V-3) → 한마디(V-4) → 공지(V-5)** 로 (합주표·팀으로 디자인 컨셉을 먼저 잡기 위해)
- `MODERNIZATION.md` 10번: React Compiler 판단 → V-1에서 켜기로 확정
- `CLAUDE.md`: 팀 색 유지·모바일 우선 규칙 추가

### 2026-11-23 — View 개편 V-1: 기반 작업 (브랜치 `ui3.0`)

- 브랜치: `migrate-vite` → `dev`(V-0 문서 커밋) → `ui3.0`(View 개편 작업)
- 설치: Tailwind 4.3(`@tailwindcss/vite`), shadcn 4.23(Radix 기반, `radix-nova`) + Button·Drawer(vaul 1.1.2)·Sonner 2.0, lucide-react, `cn`, `tw-animate-css`, React Compiler(`babel-plugin-react-compiler` 1.0 + `@rolldown/plugin-babel`), `@ant-design/cssinjs`(antd가 쓰던 것과 같은 1.24, `StyleProvider`용 직접 의존성)
  - shadcn이 넣은 것 중 뺀 것: Geist 글꼴(한글 없음), `next-themes`(다크 모드 없음). `shadcn`은 CSS import(`shadcn/tailwind.css`)만 쓰므로 devDependencies로
- CSS 레이어 순서 `theme, base, legacy, antd, components, utilities` (사전 결정 1)
  - 옛 `GlobalStyle`(styled-components, 레이어 밖)이 그대로면 `*` 규칙이 Tailwind 유틸리티를 모두 이긴다 → `src/styles/legacy.css`로 옮겨 `legacy` 레이어에 넣고 `GlobalStyle.ts` 삭제. 쓰지 않던 antd message 스타일은 버림
  - antd는 스타일을 head 맨 앞에 넣어 레이어 선언보다 먼저 `antd` 레이어가 등장 → 가장 낮은 레이어가 되어 Tailwind preflight가 antd 버튼 테두리·배경을 지웠다(달력 화살표). `index.html`에 레이어 순서를 먼저 선언하고, antd 스타일은 body에(`StyleProvider container`), 아이콘 스타일은 처음부터 레이어로(`IconProvider`)
  - preflight가 바꾼 `line-height`(html 1.5, 버튼이 부모 값 상속)를 legacy에서 브라우저 기본값으로
- 옛 화면 확인: Playwright(설치된 Chrome)로 V-1 전(`dev`, worktree)·후 화면을 픽셀 비교. 메인·팀 추가·공지·팀 정보·달력·PIN × 390·1280px, 개발 서버·프로덕션 빌드 모두 0픽셀 차이 (PC 폭 antd Drawer 포커스 외곽선 색만 다름, ISSUES V8)
- 토큰: 팀 색 20종·소모임 색 11종을 `@theme`로 (값·순서 그대로). 나머지 색은 V-2 디자인 컨셉에서
- 알림 (동작 변경): **조회가 (재시도까지) 실패하면 "정보를 불러오지 못했어요" 알림**이 뜬다 (이전: 알림 없음). 여러 조회가 동시에 실패해도 하나 (ISSUES V6 일부)
  - `createQueryClient({ retry })`: 테스트용 QueryClient도 같은 함수로 만들어 알림 설정을 공유 (`mutations.retry: false`는 TanStack 기본값과 같음)
- React Compiler: 옛 코드 포함 전체에 적용. 빌드 결과에 메모이제이션 코드 51곳. 기존 테스트 93개 그대로 통과
- 테스트 (5개 추가, ISSUES E7)
  - `src/styles/tokens.test.ts`: 팀 색·소모임 색 토큰이 `theme.ts`와 값·순서가 같은지 (`node:fs`는 필요한 함수만 타입 선언, `@types/node`는 추가하지 않음)
  - `src/lib/notify.test.tsx`: 조회 실패 시 알림 하나, 성공 시 없음
  - `src/components/ui/drawer.test.tsx`: vaul Drawer 열기·제목으로 찾기·입력·닫기
  - `setup.ts`: 포인터 캡처 빈 구현, vaul 애니메이션 끄기, 테스트마다 `toast.dismiss()` / `render.tsx`: `<Toaster />` / `queries.ts`: `findDialog()`
  - 변형 검사 8/8 검출 (알림 id·연결 제거, 팀 색 값·순서·개수, 소모임 색, 알림 정리·vaul 보정 제거)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 98/98 / `pnpm exec vitest run --maxWorkers=4` ✅ / `pnpm build` ✅ (JS 1,091kB, gzip 340kB: +52kB) / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 42 (변동 없음, 새 코드 0건)

### 2026-11-23 — View 개편 V-2 (1차): 합주판 카드 = 팀 목록 + 주 단위 캘린더

- 진행 방식 변경 (사용자): V-2부터 사용자가 디자인 시안을 먼저 제안 → 그대로 만들고 → 사용자가 상세 수정. 이번 범위는 합주판 디자인(클릭 동작은 아직 옛 Drawer)
- 동작 변경 (지금 → 바꾼 후)
  - 합주표: 이번 주만 → **이번 주부터 12주 뒤까지 넘겨 보는 주 단위 캘린더** (이전 주·오늘·다음 주)
  - 합주 표시: 30분 칸마다 색칠 → 시작~끝을 하나의 블록으로, 겹치면 가로로 나눔. 미룬 주는 회색 → 팀 색 점선 + 취소선, 팀 아닌 일정은 줄무늬
  - 일회성 합주: 날짜와 관계없이 이번 주에 보임(먼 날짜면 회색) → 그 날짜의 주에만 보임
  - 팀 목록: 모두 펼침 + 팀 아닌 일정 따로 → 한 줄로 줄이고 "전체"로 펼침 (팀 → 팀 추가 → 팀 아닌 일정)
  - 노랑 팀 색(`#fdd835`, 베소 포함) → `#f1d041` (사용자 요청, 채도만 조금 낮춤)
- 데이터: 백엔드 변경 없음. `src/lib/calendar.ts` 새로 추가 (`getWeekStart`·`formatWeekRange`·`getOccurrence`·`assignLanes`·`toWeekSchedule`), `queries/ensembles`에 `useWeekSchedule` 추가. 기존 로직 함수는 바꾸지 않음. 한계: ISSUES V9 (반복 합주의 쉼·시작일 구분)
- 화면: `src/components/schedule/`(카드·`TeamChips`·`WeekCalendar`). 옛 Teams·Board 컨테이너는 Drawer·핸들러는 그대로 두고 렌더링만 새 컴포넌트로 (styled 컴포넌트 제거)
- 공존 기간 규칙 변경: legacy 요소 규칙을 `.ui` 밖에만 적용, Tailwind 간격·글자 크기·모서리를 px로 (html 글자 크기가 legacy 때문에 16·12·10px로 바뀌므로). ISSUES V8 ①
- 메모 (사용자 요청): 합주 겹침 최대 4개, 등록·수정 시 막기 → 계획 문서 "나중에 할 일"
- 확인: Playwright로 실제 데이터·가짜 데이터(겹침 2~4개, 팀 아닌 일정, 쉼, 긴 이름) × 360·390·430·768·1280px. 가로 넘침 없음. 옛 Drawer 화면(팀 추가·공지·팀 정보·달력·PIN)은 V-1 전과 0픽셀 차이
- 테스트 19개 추가: `lib/calendar.test.ts`(주 계산·제목·쉼 판단·레인 배치·주 캘린더), `components/schedule/Schedule.test.tsx`(주 이동·오늘·쉼 표시·전체 펼침). 변형 검사 18/18 (처음 2개 생존 → 레인 경계 테스트 2개 추가). 옛 Drawer 흐름 테스트는 수정 없이 통과

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 117/117 / `pnpm exec vitest run --maxWorkers=4` ✅ / `pnpm build` ✅ (JS 1,125kB, gzip 356kB: +33kB) / `pnpm lint` → 에러 5·경고 42 (변동 없음, 새 코드 0건) / `pnpm format:check`: `src`·문서 ✅ (`vite.config.mts`는 사용자가 작업 중인 변경이라 손대지 않음)

### 2026-11-23 — View 개편 V-2 (2차): 사용자 수정 요청 반영 + 헤더·배경

합주판이 예쁜지 보기 위해 V-2 범위 밖(헤더·배경)도 간단히 손봤다. 상세는 계획 문서 "V-2 진행" 2차.

- 동작·화면 변경 (지금 → 바꾼 후)
  - PC 글자 크기: 작음 → 전체적으로 키움. 모바일은 팀 목록만 키움
  - 페이지 바탕: 연한 파랑 회색 → 회색(`#f2f3f5`) / 헤더: 짙은 파랑 제목 + 반투명 블러 → 검은 제목 + 블러 없음, 스크롤을 내리면 숨고 올리면 나옴
  - 팀 목록: PC도 한 줄 + "전체" → PC는 모두 펼침. 모바일은 좌우로 밀어 봄("전체" 버튼이 아이콘으로 줄어듦), 펼침·접음에 높이 애니메이션
  - 캘린더: PC 시간칸 높이 26 → 30px, 주를 바꿀 때 밀려 들어오는 애니메이션, 오늘 표시 파랑 → 검정
  - 블록: 긴 이름 "…" → 말줄임표 없이 끊김. 모바일 2개 겹침: 글씨 없음 → 이름 표시. 3개 이상 겹침은 1024px 미만에서 색 띠만. PC 시간: 좁거나 이름이 길면 안 보임 → 항상 보임(작은 글씨, 아주 좁으면 두 줄). 쉼 블록 바탕: 흰색 → 투명
- 헤더를 새 코드로 다시 만들고(`layout/Header`), `hooks/useHideOnScroll` 추가, 옛 `hooks/useScrollPosition` 삭제
- 확인: Playwright로 가짜 데이터(겹침 2~4개 등) × 360·390·430·768·1024·1280px, 실제 데이터 첫 화면. 팀 목록 밀기(전체 버튼 89 → 36px, 돌아오면 89px), 펼침 높이 애니메이션, 헤더 숨김·보임, 주 이동 애니메이션 실행 확인. 옛 Drawer 화면은 V-1 전과 0픽셀 차이
- 테스트: `hooks/useHideOnScroll.test.ts` 3개 추가, "전체" 펼침 테스트를 다시 그려지는 버튼에 맞게 수정. 변형 검사 21/21

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 120/120 / `pnpm exec vitest run --maxWorkers=4` ✅ / `pnpm build` ✅ (JS 1,101kB, gzip 349kB: 헤더에서 antd Layout·Tooltip이 빠져 -24kB) / `pnpm lint` → 에러 5·경고 41 (새 코드 0건) / `pnpm format:check`: `src`·문서 ✅ (`vite.config.mts`는 사용자 변경이라 손대지 않음)

### 2026-11-23 — View 개편 V-2 (3차): 사용자 수정 요청 반영

- 지금 → 바꾼 후
  - 카드 순서: 주 제목·이동 → 팀 목록 → 캘린더 → **팀 목록 → 주 제목·이동 → 캘린더**
  - 오늘 표시: 검정 → 차분한 파랑(`#3e63dd`) / "전체" 버튼 테두리: 짙은 회색 → 중간 회색
  - 주 이동·팀 목록 펼침 애니메이션: 누를 때마다 하얗게 깜빡임(투명도 0에서 시작) → 투명도 애니메이션 제거, 위치·높이만
  - PC 시간 표시: 1시간 30분 이상 블록 → 1시간 이상 블록 (사용자가 본 "30분 시작 블록에 시간 없음"의 원인은 1시간 길이였다)
  - 잘리는 이름: 다음 줄 글자의 윗부분이 살짝 보임 → 안 보임 (줄 간격 1.4, 자르는 위치를 0.15em 위로)
- 확인: 실제 데이터 PC(1시간 블록에 시간 표시), 모바일 390·430·600·700px × 화면 배율 2.625(안드로이드 흔한 값)에서 긴 이름 블록 잘림. 옛 Drawer 화면 0픽셀 차이

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 120/120 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 41 (새 코드 0건) / 변형 검사 21/21

### 2026-11-23 — View 개편 V-2 (4차): 사용자 수정 요청 반영

- 지금 → 바꾼 후
  - "전체" 버튼: 펼쳐도 "전체" → 펼친 동안 "× 닫기", 테두리 더 연하게
  - 팀 목록 밀기: 오른쪽만 흐림 → 밀고 있는 동안 왼쪽도 흐림
  - 캘린더: 맨 아래 24시 라벨·가로선 없음 → 있음
  - 오늘 표시: 파랑 → 파란빛 회색(`#4a5568`)
  - 큰 카드 모서리(공지·합주판·한마디): 24px 둥근 모서리 → 스쿼클 28px(Chrome·안드로이드), 그 외 브라우저는 18px 둥근 모서리. 공지·한마디는 옛 코드라 같은 값을 `styles/cardRadius.ts`로 넣음
- `vite.config.mts`: 사용자가 직접 넣은 개발 서버 `host: '0.0.0.0'`(같은 네트워크의 휴대폰에서 접속용)을 포맷만 정리해 커밋 (사용자 요청)
- 확인: Chrome에서 세 카드 모두 `corner-shape: superellipse(2)`·28px, 펼침·밀기·24 라벨 화면. 옛 Drawer 화면 0픽셀 차이
- 테스트: "전체" 펼침 테스트를 "닫기" 버튼에 맞게 수정

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 120/120 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 41 (새 코드 0건) / `pnpm format:check` ✅ / 변형 검사 21/21

### 2026-11-24 — View 개편 V-2 (5차): 메인 화면 스쿼클, 클릭 대상 표시

- 지금 → 바꾼 후
  - 모서리: 큰 카드 3개만 스쿼클 → 메인 화면의 둥근 요소 전체(팀 칩·버튼·오늘 날짜·합주 블록·헤더 버튼·한마디 추가 버튼·카드). 지원하지 않는 브라우저(사파리 등)는 그대로 일반 둥근 모서리
  - 커서: 새 코드의 버튼이 화살표 커서(Tailwind 기본) → 손가락 커서 (`.ui` 안 버튼·링크 전체)
  - 마우스 올림: 주 이동·오늘 버튼만 → 팀 칩·"전체"·"팀 추가"·합주 블록·헤더 버튼까지 (색 버튼은 살짝 진하게, 흰 버튼은 옅은 회색). 누르면 살짝 작아짐
- 확인: Chrome에서 팀 칩·팀 추가·다음 주·합주 블록·드라이브 버튼의 커서(pointer)·마우스 올림 전후 스타일·`corner-shape`. 옛 Drawer 화면은 0픽셀 차이 (달력 Drawer의 40픽셀은 날짜가 하루 지나 23일이 지난 날짜로 바뀐 것)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 120/120 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 41 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (6차): 사파리(아이폰)에서도 스쿼클

- 원인: `corner-shape`는 Chrome 계열만 지원(사파리 미지원). 아이폰은 모든 브라우저가 사파리 엔진이라 모바일에서 브라우저와 관계없이 안 보였다
- 지금 → 바꾼 후
  - 사파리: 일반 둥근 모서리 → SVG 마스크로 같은 스쿼클 (팀 칩·"전체"·"오늘"·화살표·오늘 날짜·합주 블록·헤더 버튼·큰 카드 3개·한마디 카드). 점선 테두리 요소 3종은 일반 둥근 모서리 그대로 (ISSUES V10)
  - 사파리에서 큰 카드의 그림자: 요소 그림자(box-shadow) → 감싼 요소의 drop-shadow (마스크가 그림자를 자르므로. 모양은 비슷)
  - Chrome: 변화 없음
- 빌드 함정 발견: `@supports (A) and (-webkit-mask-box-image: none)`은 lightningcss가 접두사를 떼어 빌드 결과에서만 사파리 조건이 거짓이 됨 → 같은 뜻의 `not ((A) or (not (B)))` 꼴로 바꾸고 `src/styles/squircle.test.ts`(2개)로 고정
- 확인: Playwright WebKit(사파리 엔진)을 설치해, `corner-shape` 지원 조건을 응답에서 강제로 끈 채(아이폰 사파리와 같은 경로) 개발 서버·빌드 결과 모두 마스크 적용과 화면 확인. 독립 시험 페이지에서 `corner-shape`와 마스크 결과가 같은 모양인지 Chromium·WebKit 비교. 옛 Drawer 화면은 Chrome에서 변화 없음

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 122/122 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 41 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (7차): 스쿼클 범위 축소, 사파리 대체 방식 제거

- 사용자 확인 결과 6차의 사파리용 대체 방식(SVG 마스크)이 모바일에서 "전체" 버튼이 늘었다 줄었다 할 때 크게 깨지는 등 문제가 많아, 고치지 않고 되돌림 (사용자 결정)
- 지금 → 바꾼 후
  - 사파리(아이폰): SVG 마스크 스쿼클 → 일반 둥근 모서리 (5차와 같음)
  - 스쿼클 적용 범위(Chrome 계열): 메인 화면 전체 → 모양이 고정되고 일반 둥근 모서리여도 어색하지 않은 곳만 (큰 카드 3개, 합주 블록, 한마디 추가 버튼·카드)
  - 팀 칩·"전체"·"팀 추가"·"오늘"·화살표·오늘 날짜·헤더 버튼: 스쿼클 → 원래 알약·원 모양
  - 손가락 커서·마우스 올림 효과(5차)는 그대로
- 방법: `src`를 6차 직전(5차)으로 되돌린 뒤 알약·원 모양 요소에서 `squircle` 제거. 6차에서 추가한 `squircle-border`·`card-shadow`·마스크 변수·`squircle.test.ts`·카드 감싸는 요소 삭제
- 확인: Chrome(카드·블록만 스쿼클, 칩은 알약), WebKit에서 지원 조건을 끈 경우(전부 일반 둥근 모서리, 마스크 없음)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 120/120 / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 41 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (8차): 합주 정보 Drawer (사용자 시안)

- 지금 → 바꾼 후
  - 합주 정보 Drawer: 오른쪽에서 열리는 옛 Drawer(antd) → 아래에서 올라오는 Drawer(vaul), 아래로 끌어내리거나 바깥·닫기 버튼·Esc로 닫힘. PC는 가운데 520px 폭. 머리는 팀의 지금 색
  - 팀 정보 보기: "팀 정보 보기" 버튼, 합주 정보 위에 쌓임(뒤로 가면 합주 정보) → 머리의 팀 이름 버튼, 팀 정보 Drawer로 바뀜
  - 미루기 버튼: "다음 번에 안 해요 (다음 합주를 M/D로)" → "M/D(요일)로 미루기", 미룬 상태면 "더 미루기". PIN 확인 버튼 "다음 번에 안 해요" → "일주일 미뤄요"
  - **미루기 취소 (새 기능)**: 미룬 상태면 쉬는 날("11/26(목) 쉬어요", 여러 주면 "…부터 N주 쉬어요")과 "미루기 취소" 버튼. 여러 번 미뤘어도 한 번에 되돌린다 (PIN 필요)
  - **매주 반복으로 바꾸기 (새 기능)**: 일회성 합주는 미루기 대신 이 버튼 (PIN 필요, 날짜·시간 그대로)
  - 캘린더: 두 주 이상 미룬 반복 합주가 마지막 주만 "쉼", 그 전 주는 안 보임 → 미룬 주 모두 "쉼" (ISSUES V9)
  - 다음 합주 표시: "2026-11-23 (월)" + "10:00 - 11:00" + "매주 이 시간에 반복" → "11/23(월)" + "10:00 – 11:00 · 1시간" + "3일 뒤", 반복 여부는 머리에
  - "같은 시간에 다른 팀 합주 잡기": 버튼만 있고 "준비 중" 알림 (ISSUES V11)
- 구조
  - `schedule/EnsembleInfoDrawer.tsx` 새로 만들고 옛 `board/EnsembleInfoDrawer.tsx` 삭제. 보여줄 값은 열려 있는 동안의 context 값을 붙잡아 두어, 닫히며 초기화되거나 수정 단계로 넘어가며 시간이 비워져도 내려가는 동안 내용이 유지된다
  - PIN·입력 단계는 아직 옛 Drawer. 옛 Drawer가 쌓이면 새 Drawer는 내려가고(스택 맨 위일 때만 열림), 닫히면 다시 올라온다. 새 Drawer는 본문을 밀지 않고, 바깥 어둡게는 옛 Drawer 중 맨 아래 것만 (`stores/drawer`의 `BOTTOM_DRAWERS`·`sideDrawers`, App·공용 Drawer). 옛 Drawer만 열린 화면은 이전과 같다
  - `lib/calendar`: `getRegularNextDate`(미루지 않았다면 다음 합주였을 날짜), `getEnsembleSchedule`(다음 합주·쉬는 날짜들), `getOccurrence`에 선택 인자 `regularDate` (기존 동작은 그대로, 기존 테스트 수정 없음)
  - shadcn `DrawerContent`에 `overlayClassName`·`handleClassName` 추가. `SkipEnsembleDrawer`에 문구 props(`title`·`label`), `DrawerId`에 `unskipEnsemble`·`repeatEnsemble`
- 확인: Playwright(가짜 데이터, 변경 요청은 가짜 응답)로 390·1280px에서 반복·미룬 상태(1주·2주)·일회성(노랑)·팀 아닌 일정, 미루기 → PIN Drawer(입력칸 포커스) → 저장 → 다시 올라와 "더 미루기"·"미루기 취소" 표시, 팀 이름 → 팀 정보 Drawer, 손잡이를 아래로 끌어 닫힘
- 테스트: `Board.test.tsx`를 새 Drawer 기준으로 다시 씀 (5개 → 9개: 표시, 닫기, 팀 정보로 바뀜, 수정 후 돌아옴, 미루기 후 쉬는 날, 미루기 저장 실패, 미루기 취소(두 번 미룬 합주), 반복으로 바꾸기, 삭제). `lib/calendar.test.ts` 6개 추가. 변형 검사 10/10
- 번들: 1,102kB → 1,182kB (gzip 350 → 376kB). 이제 앱에서 vaul·Radix Dialog를 실제로 쓴다 (이전에는 테스트에서만 써서 번들에서 빠졌다)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 131/131 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 32 (옛 합주 정보 Drawer 삭제로 9건 감소, 새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (9차): 합주 정보 Drawer 모바일 수정, 점선 블록

- 지금 → 바꾼 후
  - 아이폰 사파리에서 Drawer 아래(브라우저 도구 막대 쪽) 여백: 팀 색 → 흰색
  - Drawer를 위로 끌어올리면: 아래가 뚫려 합주판이 비침 → 흰색으로 이어져 가려짐
  - 합주판 점선 블록의 이름: 취소선 → 취소선 없음
  - 미래로 잡은 일회성 합주: 그 날짜에만 보임 → 오늘부터 그 날짜 전까지 같은 요일·시간에 점선 (반복 합주를 미루거나 미래에 시작하는 경우와 같은 표시)
- 원인: Drawer 전체 바탕을 팀 색으로 칠하고 `overflow-hidden`을 걸었다. vaul은 Drawer 아래에 같은 바탕색의 `::after`를 이어 붙여 끌어올려도 뒤가 보이지 않게 하는데, 그 색이 팀 색이었고 `overflow-hidden`에 잘렸다. → Drawer는 흰 바탕·잘라내지 않음, 팀 색은 머리에만, 위 모서리는 안쪽 스크롤 영역에서 자름, 손잡이는 머리 위에 겹침
- `lib/calendar`의 `getOccurrence`: 일회성도 `regularDate`(오늘부터 처음 오는 그 요일)를 받으면 그날부터 합주 날짜 전까지 "쉼". `toWeekSchedule`은 모든 합주에 넘김
- 확인: Playwright WebKit(사파리 엔진)·Chrome, 390px. 아래로 내렸다가 위로 끌어올리는 동작 재현, Drawer를 60px 위로 옮긴 상태에서 아래가 흰색인지, 점선 블록 취소선 없음·미래 일회성 점선
- 테스트: `lib/calendar.test.ts`에 미래 일회성 2개 (1개 추가, 1개 보강)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 132/132 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 32 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (10차): 정보 Drawer 문구, 점선 블록 날짜, 시간 줄바꿈 통일

- 지금 → 바꾼 후
  - 정보 Drawer (9차 제안 A안, 사용자 선택: 미룬 경우와 미래에 시작하는 경우 모두에 맞는 말)
    - "11/26(목) 쉬어요" / "11/26(목)부터 2주 쉬어요" → "11/26(목)엔 합주가 없어요" / "11/26(목) ~ 12/3(목)엔 합주가 없어요" (팀 아닌 일정은 "일정이")
    - "12/10(목)로 더 미루기" → "12/10(목)로 미루기"
    - "미루기 취소 (11/26(목))" → "11/26(목)부터 바로 하기". PIN 단계 제목·버튼 "PIN 입력해야 미루기를 취소할 수 있어요"·"미루기 취소해요" → "PIN 입력해야 앞당길 수 있어요"·"바로 할래요"
  - 합주판 점선 블록(PC): 시간 "18:00–20:00" → 다음 합주 날짜 (반복 "12/4~", 일회성 "12/4"). 날짜는 한 줄이라 이름 줄을 그만큼 더 쓴다
  - 합주판 시간(PC)이 한 줄에 안 들어갈 때: 저절로 줄바꿈되면 "18:00–" / "20:00", 아주 좁으면 "18:00" / "20:00" → 언제나 "18:00" / "20:00" (하이픈 없음). 한 줄 여부는 블록 폭으로 정한다 (76px = 11px 글씨로 가장 긴 시간의 폭을 Chrome에서 측정). 아주 좁은 블록에서 하이픈이 잘리던 문제도 함께 사라짐
- 결정 기록: 합주의 `due` 필드는 나중에 "반복 종료일(이후 자동 삭제)" 기능에 쓴다 (계획 문서 "나중에 할 일")
- 확인: Playwright(가짜 데이터) 768·1024·1280px에서 점선 블록 날짜, 겹친 블록의 두 줄 시간
- 테스트: 흐름 테스트 문구 갱신, `Schedule.test.tsx`에 점선 블록 날짜 확인 추가

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 132/132 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 32 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (11차): 합주 잡기 Drawer

- 지금 → 바꾼 후
  - 합주판의 빈 시간: 눌러도 아무 일 없음 → 30분 칸마다 마우스를 올리면 옅은 회색·손가락 커서, 누르면 합주 잡기 Drawer (요일·시간, 날짜, "비어 있는 시간이에요" + 그날 앞뒤 합주 사이의 빈 구간, "이 시간에 합주 잡기"). 지난 요일은 누를 수 없음
  - 이름이 안 보이는 폭(1024px 미만)에서 3개 이상 겹친 블록: 누른 블록의 정보 → 누른 위치의 시간에 걸친 합주가 하나면 그 합주의 정보, 둘 이상이면 겹친 합주 목록 (누르면 합주 정보 Drawer로 바뀜, "같은 시간에 다른 팀 합주 잡기"). 1024px 이상·2개 이하 겹침은 그대로 누른 블록의 정보
  - 합주 정보 Drawer를 열 때 Drawer 스택을 정보 Drawer 하나로 바꾼다 (이전: 쌓기. 달력에서 열 때는 결과 같음, 목록에서 고르면 목록 Drawer가 정보 Drawer로 바뀜)
- 구조
  - `lib/calendar`: `eventsAtSlot`·`freeRangeAt`·`resolveSlotTap` (순수 함수, `SlotRange` export)
  - `schedule/SlotDrawer.tsx` 새로 만듦, `DrawerId`·`BOTTOM_DRAWERS`에 `slotInfo`. 내용은 Board의 상태(닫혀도 지우지 않아 내려가는 동안 유지)
  - `schedule/drawerParts.tsx`: 두 Drawer가 함께 쓰는 날짜·시간 형식, 바깥 틀·스크롤 영역 클래스, "합주 잡기" 줄(`BookFooter`). 합주 정보 Drawer는 이것을 쓰도록 정리 (화면 변화 없음)
  - `WeekCalendar`: 시간칸 버튼(키보드 Tab 순서에서는 뺌), 블록을 누른 위치로 시간칸 계산(키보드로 누르면 블록의 정보)
- 확인: Playwright(가짜 데이터) 390px 터치 — 4개 겹친 날 블록 위쪽(3개 겹침) → 목록, 아래쪽(혼자) → 바로 정보, 빈 칸 → 빈 시간 Drawer. 1280px — 칸 마우스 올림 색·커서, 겹친 블록 → 바로 정보
- 테스트: `lib/calendar.test.ts` 3개, `schedule/SlotDrawer.test.tsx` 6개 추가. 변형 검사 7/7

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 141/141 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 32 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (12차): 화·목·토 열 바탕

- 지금 → 바꾼 후: 합주판 요일 열 바탕이 오늘만 옅은 회색 → 화·목·토도 그보다 연한 회색(`--color-day-alt`, 슬레이트 3%. 오늘은 6%). 오늘이 화·목·토여도 오늘 표시가 우선
- 확인: 1280px 화면에서 흰 열 255, 화·목·토 249~250, 오늘 244 (RGB)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 141/141 / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 32 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (13차): 오늘 열 바탕, 모바일 점선 블록 날짜

- 지금 → 바꾼 후
  - 오늘 열 바탕: 슬레이트 6% → 7.5% (화·목·토 3%와 구분이 어려웠음)
  - 점선 블록의 날짜("12/4~"·"12/4"): PC만 → 모바일에서도 (10px, 좁으면 줄바꿈. 3개 이상 겹친 곳은 그대로 색 띠만). 실선 블록의 시간은 그대로 PC만
- 사용자 요청으로 테스트·화면 확인은 하지 않음 (`pnpm typecheck` ✅, `pnpm format` 적용)

### 2026-11-24 — View 개편 V-2 (14차): 모바일 점선 블록 날짜 줄바꿈 없앰

- 지금 → 바꾼 후: 모바일 점선 블록 날짜 10px, 좁으면 "12/" / "5~"처럼 줄바꿈 → 줄바꿈 없이 9px(자간 살짝 좁힘), 더 좁으면 8.5px, 그래도 안 들어가면 날짜를 숨기고 이름만 (블록 폭 기준 container query). PC는 그대로
- 근거 (Chrome에서 측정): 가장 긴 날짜 "12/31~" 폭 10px 36.6px · 9px(-0.025em) 31.6px · 8.5px 29.8px. 390px 화면에서 한 칸 블록의 안쪽 폭 약 35px → 10px는 1px 차이로 줄바꿈되고 있었다
- 확인: 360·390·430px에서 한 칸 블록은 한 줄, 두 개 겹친 칸은 날짜 숨김

**검증:** `pnpm typecheck` ✅ / `pnpm format:check` ✅ (테스트는 표시 변경이라 돌리지 않음)

### 2026-11-24 — View 개편 V-2 (15차): PIN 단계를 새 Drawer로

- 지금 → 바꾼 후
  - 미루기·바로 하기·반복으로 바꾸기·삭제·수정의 PIN 단계: 옛 Drawer가 오른쪽에서 쌓임(합주 정보 Drawer는 내려감) → 합주 정보 Drawer 안에서 내용이 바뀜 (뒤로 가면 정보로). 제목 "PIN 입력해야 미룰 수 있어요 🔑" 등 → "12/10(목)로 미룰까요?"·"합주를 삭제할까요?" 등 + 어떤 합주인지(팀 색 점·이름·요일·시간)
  - PIN 입력창: 한 칸 → 4칸(숫자만, 점으로 가림). 확인 버튼 문구 "일주일 미뤄요"·"바로 할래요"·"매주 반복해요"·"진짜 삭제해요" → "미루기"·"바로 하기"·"매주 반복으로 바꾸기"·"삭제하기"(빨강)
  - PIN 표시: 4자리를 넣으면 응답 전에도 빨강(틀림) → 응답 전에는 "확인하는 중…", 응답 뒤에 틀리면 빨강 + 흔들기 + "PIN이 맞지 않아요", 맞으면 "확인됐어요". 응답 전에 PIN을 고치면 이전 응답은 버림
  - 존재 확인 요청: 동작 버튼을 누를 때 + PIN을 넣을 때 → 버튼을 누를 때만 (그새 삭제되면 저장 때 서버 404로 "이미 삭제됨" 처리). 미루기 흐름 2회 → 1회
  - 알림 (ISSUES V6 일부): 합주 저장 실패·이미 삭제됨, 삭제 성공·실패, PIN 확인 실패. 저장에 실패하면 PIN 단계에 머문다 (이전: 알림 없이 PIN Drawer에 머묾)
  - 수정: PIN이 맞으면 바로 다음 단계(옛 Drawer)인 것은 같음. 다음 단계에서 뒤로 가면 합주 정보로 돌아오며 원래 값으로 되돌림 (이전: PIN Drawer로 돌아가고, PIN Drawer를 닫을 때 되돌림)
- 구조: `schedule/PinStep.tsx`(PIN 상태: 입력 중 → 확인 중 → 맞음/틀림 → 저장 중), `components/ui/input-otp.tsx`(shadcn, 점 가림 `mask` 추가), `index.css`에 흔들기 애니메이션. 합주 정보 Drawer에 단계(`step`). `HandleSkipEnsemble`은 성공 여부를 돌려줌. 옛 `SkipEnsembleDrawer`·`DeleteEnsembleDrawer`·`UpdateEnsembleDrawer1` 삭제, `DrawerId` 5개 제거. 의존성 `input-otp` 1.5
- 테스트: `setup.ts`에 `elementFromPoint` 빈 구현(jsdom에 없음, input-otp가 호출). `Board.test.tsx`를 새 PIN 단계 기준으로 다시 씀 (10개 → 14개: 확인 중엔 틀림 표시 없음, 늦은 응답 버림, 수정 중 뒤로 가면 원래 값, PIN 단계 뒤로 가기 추가). 변형 검사 7/8 (남은 1개는 중복 코드라 삭제)
- 확인: Playwright(가짜 응답, PIN 확인 600ms 지연) 390·1280px에서 빈 칸·입력 중·확인 중·틀림·맞음 화면, 입력창 자동 포커스
- 번들: 1,182kB → 1,203kB (gzip 376 → 383kB, input-otp)
- 추가 제안(적용하지 않음): 계획 문서 "PIN·변경 흐름 추가 제안"

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 145/145 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 26 (옛 PIN Drawer 삭제로 6건 감소, 새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (16차): PIN 단계 다듬기, 스크롤·키보드 문제

- 지금 → 바꾼 후
  - 틀린 PIN: 빨간 칸에 남아 지우고 다시 넣어야 함 → 흔든 뒤 칸을 비우고 첫 칸으로 ("PIN이 맞지 않아요. 다시 입력해 주세요"는 다시 넣기 시작할 때까지)
  - 미루기·바로 하기·반복으로 바꾸기: PIN이 맞으면 확인 버튼을 눌러 실행 → 바로 실행 ("저장하는 중…"). 삭제는 그대로 "삭제하기" 버튼
  - 저장 실패: PIN 단계에 머물러 확인 버튼을 다시 누름 → 칸을 비워 PIN부터 다시 (알림은 그대로)
  - 수정의 안내 문구 "팀 PIN 4자리를 입력하면 다음 단계로 넘어가요" → "팀 PIN 4자리를 입력해 주세요" (모든 동작 같은 문구)
  - PC: PIN 단계로 바뀔 때 가로 스크롤 막대가 약 0.15초 생겼다 사라짐 → 없음 (밀려 들어오는 애니메이션의 가로 넘침을 숨김). Chrome에서 스크롤 막대를 켜고 프레임마다 측정해 전후 확인 (이전 10프레임 → 0)
  - 아이폰 사파리 키보드: 입력칸을 누르면 Drawer가 너무 올라가 위가 잘리고 Drawer와 키보드 사이로 뒤 화면이 보임 → Drawer 아래 끝을 키보드 바로 위에, 높이는 보이는 영역 안으로. 키보드를 닫은 뒤 정보로 돌아가면 PIN 단계의 작은 높이가 남아 스크롤이 생김 → 남지 않음
- 원인 (vaul 1.1의 `repositionInputs`): ① 사파리가 입력칸을 보이려고 보이는 영역을 위로 스크롤한 만큼을 빼지 않고 키보드 높이만큼 Drawer를 올려 두 번 올라갔다 ② 처음 키보드를 열 때의 Drawer 높이를 기억해 두었다가 키보드를 닫을 때 그 높이로 고정했다. → `repositionInputs={false}`, `hooks/useKeyboardInset`(`visualViewport`, `useSyncExternalStore`)으로 Drawer의 `bottom`·`max-height`만 정한다
- 테스트: `hooks/useKeyboardInset.test.ts` 2개, `Board.test.tsx`에 키보드 위치 1개 추가, PIN 흐름 테스트를 바로 실행·비우기 기준으로 수정. 변형 검사 6/6. 실제 아이폰 키보드는 자동 확인이 불가해 사용자 확인 필요
- 제안 6(수정 입력 단계를 같은 Drawer로)은 합주 추가 Drawer를 먼저 만든 뒤로 보류 (사용자 결정)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 148/148 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 26 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (17차): 키보드 뒤까지 흰 바탕

- 지금 → 바꾼 후: 아이폰에서 PIN 입력칸을 누르면 Drawer와 키보드 위 막대(완료 버튼) 사이가 비어 뒤 합주판이 보이고, 반투명 키보드 뒤로도 합주판이 비침 → Drawer의 흰 바탕이 키보드 뒤 화면 맨 아래까지 덮음
- 방법: 16차는 Drawer를 키보드 높이만큼 올렸다(`bottom`). 그 아래는 vaul이 붙이는 흰 연장(`::after`)이 덮어야 하는데 아이폰 키보드가 열린 상태에서는 덮이지 않았다 (데스크톱 WebKit에서는 재현되지 않음). → Drawer는 화면 맨 아래에 두고 아래 여백(`padding-bottom`)을 키보드 높이만큼 줘 내용만 키보드 위로 올린다. 최대 높이 = 보이는 높이 - 12px + 여백 (내용이 보이는 영역 안에 들어감)
- 테스트: `Board.test.tsx`의 키보드 테스트를 아래 여백 기준으로 수정. 실제 아이폰 확인은 사용자

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 148/148 / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 26 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (18차): 키보드 위 막대 쪽 비침, 원인을 다시 찾아 수정

- 증상: 아이폰에서 PIN 입력칸을 누르면 Drawer와 키보드 위 막대(^ v 완료) 사이·반투명 키보드 뒤로 합주판이 비침. 16차(Drawer를 올림)·17차(Drawer를 내리고 아래 여백) 모두 그대로였다
- 원인: 사용자 스크린샷에서 어둡게 하는 덮개(fixed, 화면 전체)도 그 띠에는 닿지 않았다 → 그 띠에는 고정 요소가 아예 그려지지 않는다. 아이폰 사파리 26은 키보드 위 막대 쪽에 페이지 내용을 그대로 비춘다(오버레이의 합성 영역 밖)는 보고와 일치 (https://1ar.io/updates/safari-26-liquid-glass-web/, Apple 문서 없음). 그래서 Drawer의 흰 바탕·vaul의 흰 연장으로는 덮을 수 없었다
- 수정: PIN 단계 동안 페이지 문서 안(body의 자식, position: absolute, z-40)에 흰 판(`KeyboardCover`)을 깔아, 보이는 영역 아래 끝 240px 위부터 아래 3000px를 덮는다. 보이는 영역 안에 걸친 부분은 Drawer 아래에 숨어 평소 화면은 그대로. `useKeyboardInset`이 보이는 영역 아래 끝의 문서 기준 위치(`visualViewport.pageTop + height`)도 돌려준다
- 확인: Chrome·WebKit에서 페이지를 내리고(스크롤 잠금으로 body가 relative인 상태) 흰 판 위치가 계산과 같음, 화면 변화 없음. 실제 아이폰 확인은 사용자
- 테스트: 흰 판이 PIN 단계에만, body의 자식으로, 계산한 위치에 생기는지 1개 추가, 훅 테스트에 문서 기준 위치 추가
- ISSUES V12 추가 (앞으로 입력칸이 있는 Drawer에도 같은 처리 필요)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 149/149 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 26 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (19차): PIN 단계에서 뒤 페이지가 계속 내려가는 문제

- 18차 수정으로 키보드 쪽 비침은 해결 (사용자 확인)
- 지금 → 바꾼 후: 키보드를 열 때·PIN을 틀릴 때마다 뒤 합주판이 계속 아래로 스크롤됨 → PIN 단계 동안 뒤 페이지 스크롤 위치를 고정 (처음 키보드를 열 때 한 번 내려가던 것도 없어짐)
- 원인: 아이폰 사파리는 입력칸에 포커스가 가거나 커서가 움직일 때마다(틀린 PIN을 비우면 커서가 첫 칸으로) 입력칸을 보이려고 페이지를 스크롤한다. 원래는 문서 끝에서 멈추지만, 18차의 흰 판(보이는 영역 아래 끝 기준 3000px, 스크롤하면 따라 내려감)이 문서 끝을 계속 늘려 스크롤할 공간이 생겼다
- 수정: PIN 단계 동안 window 스크롤이 바뀌면 처음 위치로 되돌린다 (Drawer 위치는 보이는 영역 기준으로 직접 맞추므로 이 스크롤이 필요 없다). 흰 판 높이 3000px → 1000px (키보드와 위 막대를 덮고 남는 정도, 고정이 빠져도 끝없이 늘지 않게)
- 테스트: 스크롤 고정 1개 추가 (PIN 단계에서 되돌림, 정보 단계로 돌아가면 고정하지 않음). 변형 검사 3/3. 실제 아이폰 확인은 사용자

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 150/150 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 26 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (20차): PIN 단계 뒤 페이지 고정을 깜빡임 없이

- 지금 → 바꾼 후: PIN을 틀릴 때마다 화면 전체가 위로 올라갔다 내려오며 위쪽이 하얗게 깜빡임(19차) → 움직이지 않음
- 원인: 19차는 사파리가 입력칸을 보이려고 페이지를 스크롤한 뒤 원래 위치로 되돌렸다. 스크롤된 화면이 한 번 그려진 뒤 되돌아가 깜빡였다
- 수정: 되돌리지 않고 스크롤할 공간을 없앤다. PIN 단계 동안 body를 `position: fixed`(top: -스크롤 위치, Radix 스크롤 잠금의 `position: relative !important`를 important로 덮음)로 두고, 나오면 원래 위치로 (`lib/pageScrollLock`). 화면은 그대로이고 문서에 스크롤할 공간이 없다
  - vaul에도 같은 기능(`usePositionFixed`)이 있지만 vaul의 Trigger로 열었을 때만 켜져(`hasBeenOpened`), Drawer 스택으로 여는 이 앱에서는 한 번도 동작하지 않았다 (vaul 코드로 확인)
  - 흰 판(18차)은 body 기준이 되므로 고정할 때의 스크롤(`--locked-scroll-y`)을 더해 위치를 잡는다
  - 고정하면 scrollY가 0이 되어 헤더 숨김(`useHideOnScroll`)이 맨 위로 본 것으로 여겨 헤더가 나타났다 → 고정 중에는 무시
- 확인: 아이폰 사파리 UA의 WebKit·Chrome에서 페이지를 500px 내린 뒤 PIN 단계: 문서 스크롤 공간 0, 틀린 PIN 3번에도 scrollY·흰 판 위치 그대로, 뒤 화면 픽셀 비교 0(Drawer 높이가 바뀐 부분 제외, 헤더 안 나타남), 뒤로 가면 scrollY 500·화면 동일. 실제 아이폰 확인은 사용자
- 테스트: 19차 스크롤 되돌리기 테스트를 body 고정·복원 테스트로 교체, 헤더 숨김이 고정 중 스크롤을 무시하는 테스트 추가. 변형 검사 5/5

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 151/151 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 5·경고 26 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (21차): 합주 잡기(추가) Drawer

- 지금 → 바꾼 후
  - 합주 추가: 오른쪽에서 쌓이는 옛 Drawer 4단계(반복 여부 → 달력 → 시작·끝 칸 → 완료 화면 "락앤롤!") → 아래에서 올라오는 Drawer 하나(팀 → 반복 → 날짜 → 시작 시간·소요 시간). 저장에 성공하면 모두 닫고 "합주를 잡았어요." 알림, 실패하면 알리고 Drawer에 머묾
  - 시간 고르기: 시작 칸과 끝 칸을 차례로 누름 → 시작 시간 칩 + 소요 시간(30분·1시간·2시간·직접 입력 ±30분, 기본 2시간)
  - 팀: 팀 정보에서만 열 수 있어 팀이 정해져 있었음 → Drawer 안에서 고름(팀 색 칩, 소모임·일정 포함). 팀 정보·소모임 정보에서 열면 골라져 있음
  - 합주판의 "이 시간에 합주 잡기"·"같은 시간에 다른 팀 합주 잡기"(합주 잡기·합주 정보 Drawer): "준비 중" 알림 → 그 날짜·시작 시간을 채운 합주 잡기 Drawer (ISSUES V11)
  - 그날 동방 막대·겹침 알림 (새 기능), 이미 4개가 겹친 시간은 잡을 수 없음 (새 기능, 반복이면 이후 주까지)
  - 저장 직전 팀 존재 확인(B4): 팀은 그대로, 소모임·일정은 고정 id라 확인하지 않음. 팀이 그새 삭제됐으면 "이미 삭제된 팀이에요." 알림
  - 서버에 보내는 날짜: 고른 때의 시각(옛 antd 달력) → 그날의 합주 시작 시각
- 구조: `schedule/AddEnsembleDrawer.tsx`(입력은 로컬 상태), `schedule/addEnsembleStore.ts`(여는 곳마다 미리 채울 값), `lib/calendar`에 `eventsOnDate`·`overlapping`·`findOverlapLimit`·`MAX_OVERLAP`, `drawerParts`에 `formatSlots`, `BookFooter`에 `onClick`. `components/ui/calendar.tsx`(shadcn, 린트 경고가 나는 인라인 컴포넌트를 모듈 수준으로). 옛 `AddEnsembleDrawer1~4`·`HandleAddEnsemble` 삭제, `DrawerId` `addEnsemble1~4` → `addEnsemble`
- 사전 결정 3(react-hook-form)과 다르게 `useState`: 텍스트 입력 없이 칩·달력·± 버튼뿐이라
- 확인: Playwright(가짜 데이터·가짜 저장 응답) Chrome 390·1280px, WebKit(아이폰 UA) 390px — 빈 칸에서 열기 → 팀·반복 고르기 → 직접 입력 → 저장(보낸 본문 확인), 4개 겹친 곳에서 막힘, 팀 정보에서 열기(달력) → 닫으면 팀 정보로. 가로 넘침 없음, 새 콘솔 오류 없음
- 테스트: `schedule/AddEnsembleDrawer.test.tsx` 7개(빈 칸에서 저장, 소요 시간, 23시 칸에서 1시간, 쉬는 합주는 겹침 아님, 겹친 목록에서·겹침 알림, 최대 4개, 합주 정보에서), `Teams.test.tsx` 합주 추가 2개 → 4개(팀 정보에서 저장, 닫으면 팀 정보로, 팀 삭제됨, 저장 실패), `lib/calendar.test.ts` 6개. 변형 검사 15/15 (처음 3개 생존: 1개는 문법 오류가 나는 잘못된 변형, 2개는 테스트 추가)
- 번들: 1,203kB → 1,301kB (gzip 383 → 414kB, react-day-picker·date-fns)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 166/166 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 4·경고 25 (옛 합주 추가 Drawer 삭제로 2건 감소, 새 코드 0건) / `pnpm format:check` ✅

### 2026-11-24 — View 개편 V-2 (22차): 합주 잡기 Drawer 사용자 수정

- 지금 → 바꾼 후
  - 팀 칩: 흰 칩 + 색 점 → 팀 색 바탕(메인 팀 목록과 같음), 고른 팀은 체크 + 바깥 링
  - 무언가를 고르면: 스크롤 그대로 → 그 항목의 소제목이 맨 위로 (직접 입력은 맨 아래로, 더 내려갈 곳이 없으면 거기까지). 팀 정보에서 열면 처음부터 "반복"이 맨 위
  - "이번 한 번" → "한 번만". 반복 아래 안내 문구 → 없음, 머리 설명에 "…토요일 한 번만" / "…토요일부터 매주"
  - "날짜 고르기" → "날짜 선택". 달력 줄 간격·날짜 버튼 축소 (모바일 약 420 → 303px)
  - 그날 동방 막대: 누른 칸이 시작 시간 → 시간 창을 끌어 옮김 (창 밖을 누르면 그 자리를 가운데로)
  - 직접 입력 "14:00에 끝나요" → "12:00 – 14:00", 시작 시간 칩 스크롤 위치 가운데 → 왼쪽 30%
- 확인: Playwright Chrome 390·1280px, WebKit(아이폰 UA) 390px. 소제목이 스크롤 영역 위 24px에 옴(더 내려갈 곳이 있을 때), 시작 칩 가운데가 폭의 30%, 마우스로 창을 끌어 16:00 → 19:00, 팀 정보에서 열면 "반복"이 맨 위. 실제 터치 끌기는 사용자 확인 필요
- 테스트: `AddEnsembleDrawer.test.tsx` 7 → 10개 (소제목 스크롤 목표, 팀 정보에서 처음 스크롤, 막대 끌기·창 밖 누르기·끝 제한: jsdom은 배치를 계산하지 않아 위치·폭을 정해 두고 확인), 문구 변경 반영. 변형 검사 11/11

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 169/169 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 4·경고 25 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-25 — View 개편 V-2 (23차): 반복 종료 날짜, 합주 잡기 Drawer 사용자 수정

- 지금 → 바꾼 후
  - **반복 종료 날짜 (새 기능, `due`)**: 매주 반복일 때 "반복 종료" — "계속 반복"(기본, 서버에 2099-12-31) / "종료 날짜 지정"(서버에 그 날짜, "이 날짜 이후에 자동으로 삭제돼요"). 합주 정보 Drawer 머리에 "매주 반복 · 12/21(월)까지"
  - 수정·미루기·바로 하기: 반복 합주의 `due`를 2099-12-31로 덮어씀 → 그대로 둠. 지난 `due`(옛 데이터 1건)는 종료 날짜 없음으로 봄
  - 달력: 토요일 파랑, 일요일 빨강
  - 시작 시간 칩 → 없음 (그날 동방 막대를 끌어서만, 키보드는 슬라이더). 팀 정보에서 열면 12:00 – 14:00으로 시작
  - 막대·창·합주 블록 모서리 통일(10px), 합주 블록 본래 색
  - 겹침 알림: 소요 시간 아래 상자 → 막대 아래 고정된 한 줄 (배치 변화 없음)
  - PC: 내용이 길면 스크롤 막대가 생기며 폭이 줄어듦 → 스크롤 막대 숨김 + 아래 흰 그러데이션, 간격 축소 (1920×1080에서 스크롤 없음)
  - "끌어서 옮길 수 있어요" → "끌어서 시간을 선택하세요"
- 구조: `lib/ensemble`의 `toEnsembleRequest`에 `repeatEnd` 인자, `getRepeatEnd`·`NO_REPEAT_END` 추가. `lib/calendar`의 `findOverlapLimit`에 `until`. Board·합주 정보 Drawer가 합주 목록 원본(`ensemblesQueryOptions`)에서 `due`를 읽음
- 실제 서버 데이터 확인(값은 출력하지 않음): 반복 합주 14건 중 `due`가 2099가 아닌 것 1건, 그 날짜는 이미 지남(레거시 `type`이 '일회성'). 그래서 합주판에서 `due` 이후를 숨기지 않았다
- 확인: Playwright Chrome 1920×945·390px, WebKit(아이폰 UA) 390px — 반복 종료 지정·저장 본문(`due`), 막대 양 끝 모서리, 겹침 알림 한 줄, 1920에서 스크롤 0·안쪽 폭 그대로, 토·일 색
- 진행 중 발견: 일회성을 매주 반복으로 바꾼 직후 정보 Drawer가 다시 불러오기 전의 일회성 날짜를 종료 날짜로 보여 줬다 → 서버 기록도 반복일 때만 읽음. 겹침 알림의 팀 이름과 "일정과 겹쳐요" 사이 공백이 빠져 읽기 프로그램이 붙여 읽었다 → 공백 추가 (둘 다 테스트가 잡음)
- 테스트: 합주 잡기 10 → 15개(반복 종료 지정·되돌리기·시작 날짜를 뒤로 옮기면 다시 고르기, 슬라이더 키보드 등), Board 2개(종료 날짜 표시·미루기 때 보존, 지난 날짜), lib 3개. 변형 검사 15/15 (처음 1개 생존 → 테스트 추가)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 177/177 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 4·경고 25 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-25 — View 개편 V-2 (24차): 겹침 4개 막기, 미루기·반복 종료, 캘린더 날짜로 합주 잡기

- 지금 → 바꾼 후
  - "같은 시간에 다른 팀 합주 잡기"(겹친 목록·합주 정보): 그 시간에 이미 4개가 겹쳐 있어도 누를 수 있음 → 누를 수 없고 "4개가 겹쳐 있어 더 잡을 수 없어요"
  - 합주 잡기 저장: 불러 둔 목록으로만 검사 → 저장 직전에 다시 불러와 한 번 더 검사, 그새 4개가 됐으면 저장하지 않고 알림
  - 미루기: 반복 종료 날짜 뒤로도 미룰 수 있음 → 막고 이유 표시
  - 삭제 PIN: "삭제하기" 버튼만 → PIN이 맞으면 Enter로도 (PC)
  - 합주 정보의 "같은 시간에 다른 팀 합주 잡기" 날짜: 그 합주의 다음 날짜 → 캘린더에서 보던 날 (지난 요일이면 다음 그 요일)
  - 캘린더 머리: 날짜 강조 → 요일 강조 (오늘은 요일 원)
  - 미래 합주 점선: 오늘부터 처음 오는 그 요일부터 → 이번 주 월요일부터 (오늘보다 앞선 이번 주 요일에서도 사라지지 않음)
- 구조: `lib/calendar`의 `isSlotFull`, `toWeekSchedule`이 이번 주 월요일을 넘김(`getOccurrence`는 그대로). `addEnsembleStore`가 지난 날짜를 다음 그 요일로. `BookFooter`의 `full`. Board가 누른 블록의 캘린더 날짜를 합주 정보 Drawer에 넘김(`calendarDate`). `PinStep`을 폼으로
- 테스트: 합주 잡기 4개(버튼 막기, 저장 직전 재확인, 캘린더 날짜, 지난 요일), Board 4개(Enter 삭제, 확인 전 Enter 무시, 종료 날짜 뒤 미루기 막기·당일 가능), `lib/calendar` 1개(이번 주 앞쪽 요일 점선), 기존 2개 기대값 수정(미래 일회성의 이번 주 앞쪽 요일, 오늘 표시의 요일). 변형 검사 11/12 (남은 1개는 결과가 같은 변형: PIN 확인 전에는 "삭제하기" 제출 버튼이 꺼져 있어 브라우저가 Enter 제출을 하지 않으므로 상태 검사를 빼도 같다)
- 확인: Playwright Chrome 390·1280px — 지난 요일(월)의 미래 반복 합주 점선, 4개 겹친 토요일 목록의 막힌 버튼, 반복 종료 뒤 미루기 막힘·이유, 요일 강조 머리

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 186/186 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 4·경고 25 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-25 — View 개편 V-2 (25차): 일회성 블록 표시, 달력 일요일 시작

- 지금 → 바꾼 후
  - 합주판 일회성 합주: 반복 합주와 같은 모양 → 맨 아래 가운데에 입장권 같은 반원 구멍 (30분 블록은 작게)
  - 합주 잡기 달력: 월요일부터 → 일요일부터
  - 그날 동방 막대의 합주: 본래 색(23차) → 연하게 (되돌림)
- 백엔드 확인 (사용자 요청, 코드는 수정하지 않음): `GET /ensembles`가 반복 종료 날짜(`due`)가 지난 반복 합주도 보낸다. 백엔드에서 거르기로 함
- 테스트: `Schedule.test.tsx` 1개(일회성 블록에만 구멍, 30분은 작게), 합주 잡기 달력 요일 순서. 변형 검사 3/3
- 확인: Playwright Chrome 390·1280px, WebKit 390px — 일회성 블록(30분·2시간·점선·줄무늬)의 구멍, 달력 일요일 시작, 막대 합주 연한 색

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 187/187 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 4·경고 25 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-25 — View 개편 V-2 (26차): 합주판 보기 방식 두 가지

- 지금 → 바꾼 후
  - 첫 화면: 이번 주 월~일 (지난 요일 포함), 제목 "11월 23일 – 29일" → 제목 "이번 주", 지난 날짜 없이 오늘부터 7일
  - 보기 방식 (새 기능, 헤더 스위치): 오늘부터 보기(기본, 오늘이 맨 왼쪽) / 요일 고정으로 보기(일~토, 지난 요일은 다음 주 날짜 + "다음주"). 고른 방식 기억
  - 다음 주(→): 월~일 한 주씩 → 일~토 한 주씩 (토요일에 누르면 다음 날 일요일부터)
  - 날짜 머리: 달의 첫날은 "12/1"
- 구조: `lib/calendar`에 `BoardView`·`BoardDay`·`getSundayWeekStart`·`getBoardDays`·`toDaysSchedule`, `queries/ensembles`의 `useWeekSchedule` → `useBoardSchedule`(날짜들). `WeekCalendar`·`Board`는 열 번호 + 열 날짜로 (합주 정보의 "캘린더 날짜"도 열 날짜). 헤더 스위치(`layout/Header`), `schedule/boardViewStore`. 테스트 setup에서 보기 방식 초기화
- 확인: Playwright Chrome 390·1280px, WebKit 390px (수 11/25): 오늘부터 "수25 … 화12/1", 요일 고정 "일29다음주 월30다음주 화12/1다음주 수25 목26 금27 토28", 다음 주 "11월 29일 – 12월 5일". 가로 넘침 없음
- 테스트: `Schedule.test.tsx` 이번 주·다음 주(일~토)·12주·달 첫날 표시, 헤더 스위치·요일 고정·기억, 미룬 주 테스트를 새 첫 화면에 맞게 / `lib/calendar.test.ts` 4개(일요일 시작, 두 방식의 날짜, 토요일에 다음 주, 날짜별 합주). 변형 검사 9/9 (그 밖에 1개는 테스트를 모으지 못한 잘못된 변형, 헤더 스위치 1개는 검사를 중간에 멈춰 돌리지 못함). 진행 중 문제: 작업 폴더에서 변형 검사를 돌려, 사용자가 켜 둔 dev 서버가 일부러 바꾼 코드를 HMR로 계속 불러왔다(화면이 저절로 월~일로 바뀌는 등) → 검사를 멈추고 파일을 모두 원래대로 확인. 앞으로 변형 검사는 별도 복사본에서

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 192/192 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 4·경고 25 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-25 — View 개편 V-2 (27차): 보기 방식 기본값·스위치, 주말 색, 일회성 구멍 정리

- 지금 → 바꾼 후
  - 보기 방식 기본값: 오늘부터 보기 → 요일 고정으로 보기 (스위치 왼쪽)
  - 헤더 스위치: 두 아이콘 중 하나를 누름 → 스위치 어디를 눌러도 바뀜
  - 합주판 요일 머리: 모두 검정 → 토요일 파랑·일요일 빨강, 오늘이 주말이면 오늘 원·날짜도 그 색
  - 일회성 구멍: 30분 블록 작게·그 외 크게 → 모두 작게
  - 점선 일회성 블록: 구멍 자리의 점선이 끊김 → 반원 테두리(실선)로 이어짐
- 테스트: `Schedule.test.tsx` 기본값(요일 고정)·스위치(한 번 누름, 기억)·주말 색·같은 구멍 크기·점선 반원 / 테스트 setup의 보기 방식 초기화를 기본값으로. 변형 검사 8/8 (별도 복사본에서)
- 확인: Playwright Chrome 390·1280px, WebKit 390px (수 11/25): 기본 "일29다음주 … 토28", 스위치의 켜진 쪽(왼쪽)을 눌러도 오늘부터로 바뀜, 점선 블록 반원

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 194/194 / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 4·경고 25 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-25 — View 개편 V-2 (28차): 합주판 스타일

- 지금 → 바꾼 후
  - "다음주" 줄: 요일 고정 첫 화면에만 생김(주를 넘길 때마다 시간표가 오르내림) → 늘 자리를 잡아 둠
  - 옅은 회색 열: 화·목·토 → 왼쪽부터 1·3·5·7번째 열
  - 점선 일회성 블록 구멍: 실선과 같은 크기(테두리 때문에 더 커 보임) → 0.5px 작게
- 사용자 요청으로 테스트·화면 확인은 하지 않음 (`pnpm typecheck` ✅, 린트 새 코드 0건, `pnpm format` 적용)
- 환경: 27차 변형 검사용 복사본을 만들며 `node_modules`를 junction으로 연결했다가 지운 뒤, 작업 폴더의 `node_modules`가 망가져 `pnpm exec` 때 전체 재설치가 일어났다 (pnpm 캐시에서, 잠금 파일·소스 변화 없음). 복사본에는 연결 대신 오프라인 설치를 쓴다

### 2026-11-25 — View 개편 V-2 (29차): 요일 머리글 아래 여백

- 지금 → 바꾼 후: 요일 머리글 아래 여백 8px(PC 12px) → 0(PC 2px). 28차부터 "다음주" 줄이 늘 자리를 잡아, "다음주"가 없는 화면에서 날짜 아래가 너무 비었다
- 사용자 요청으로 테스트·화면 확인은 하지 않음 (`pnpm typecheck` ✅, `pnpm format` 적용)

### 2026-11-25 — View 개편 V-2 (30차): 헤더 건의사항 링크

- 지금 → 바꾼 후: 헤더 링크가 문서(구글 드라이브) 하나 → 건의사항(구글 스프레드시트, `MessageSquarePlus` 아이콘)도. 문서 링크 왼쪽, 같은 크기·같은 탭에서 열림(드라이브 링크와 같음)
- 테스트: `Schedule.test.tsx`에 헤더 링크 1개

**검증:** `pnpm typecheck` ✅ / `Schedule.test.tsx` ✅ 8/8 / `pnpm format` 적용

### 2026-11-25 — View 개편 V-2 (31차): 합주 수정 Drawer

- 지금 → 바꾼 후
  - 합주 수정: PIN → 오른쪽에서 쌓이는 옛 Drawer 3단계(반복 여부 → 달력 → 시작·끝 칸) → 아래에서 올라오는 합주 수정 Drawer 하나 (합주 잡기 Drawer의 수정 모드). 지금 값이 채워져 있음
  - 팀: 바꿀 수 없음(그대로). 바뀐 것이 없으면 저장 버튼이 "바뀐 내용이 없어요"로 막힘
  - 반복 종료 날짜: 수정에서 바꿀 수 없음(그대로 둠) → 바꿀 수 있음
  - 겹침: 검사 없음 → 자신을 뺀 4개 겹침이면 막음, 저장 직전 다시 불러와 한 번 더 확인
  - 저장: 알림 없이 정보로 → "합주를 수정했어요." 알림 + 정보로. 서버에 보내는 날짜에 고른 때 시각 → 시작 시각
  - 수정 중 닫기: 원래 값으로 되돌리며 정보로 → 정보로 (값을 바꾸지 않으므로 되돌릴 것이 없음)
- 구조: `addEnsembleStore`에 `edit`(`EditTarget`)·`openUpdateEnsemble`, `AddEnsembleDrawer`에 `mode`(Board가 수정 모드로 하나 더 그림), `DrawerId` `updateEnsemble2~4` → `updateEnsemble`, `lib/ensemble`의 `withStartTime`(합주 잡기와 공유), `drawerParts`의 `formatEnsembleSummary`(저장 알림 설명 공유). 옛 `UpdateEnsembleDrawer2~4`·`HandleUpdateEnsemble` 삭제
- 테스트: `Board.test.tsx` 옛 수정 흐름 2개 → 6개 (지금 값·바뀐 것 없으면 막힘·저장 후 정보, 닫기, 반복 종료 채움·계속 반복으로, 한 번만으로, 자신을 뺀 겹침, 저장 실패)
- 확인: Playwright Chrome 390·1280px, WebKit 390px — 2시간 30분 합주가 직접 입력으로 채워짐, 겹침 알림에 자신 없음, 2시간으로 바꿔 저장(보낸 본문의 반복 종료 날짜 유지) → 정보 "11:00 – 13:00", 가로 넘침 없음, 콘솔 오류 없음. 헤더 건의사항 아이콘
- 번들: 1,301kB → 1,112kB (gzip 414 → 354kB). 옛 수정 달력이 마지막 antd DatePicker·Calendar 사용처였다

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 199/199 / `pnpm build` ✅ / `pnpm lint` → 에러 4·경고 24 (옛 수정 Drawer 삭제로 1건 감소, 새 코드 0건) / `pnpm format:check` ✅

### 2026-11-25 — View 개편 V-2 (32차): 반복 합주의 마지막 날 반원 구멍

- 지금 → 바꾼 후: 반원 구멍은 일회성 합주만 → 반복 합주의 마지막 날(반복 종료 날짜 전 마지막 그 요일)에도. 종료 날짜가 합주 요일과 달라도 계산한다 (수요일 합주·12/20(일) 종료 → 12/16(수))
- 구조: `lib/calendar`의 `isLastOccurrence`, `CalendarEvent.last`, `WeekCalendar`는 `last`로 구멍을 그림 (`data-one-time` → `data-last`)
- 테스트: `lib/calendar.test.ts` 5개(일회성, 다른 요일 종료, 같은 요일 종료·전날 종료 경계, 계속 반복·지난 종료, `toWeekSchedule`), `Schedule.test.tsx` 1개(주를 넘기며 마지막 주에만 구멍)
- 발견 (ISSUES V13, 제안 단계): 종료 날짜가 지난 주에도 반복 합주가 합주판에 보이고 겹침 계산에 들어간다

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 205/205 / `pnpm lint` → 에러 4·경고 24 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-25 — View 개편 V-2 마무리: 반복 종료 날짜 뒤 숨김(V13), 옛 합주표 코드 정리

- 지금 → 바꾼 후
  - 반복 합주: 반복 종료 날짜(`due`)가 지나도 합주판에 매주 보이고 겹침(최대 4개) 계산에 들어감 → 종료 날짜 뒤 날짜에서는 보이지 않고 세지 않음 (ISSUES V13, 사용자 승인)
  - 이미 지난 종료 날짜의 옛 데이터 1건: 계속 반복으로 봄 → 같은 규칙으로 숨김 (사용자 판단: 실제 합주판에도 보이지 않았다)
- 구조: `lib/ensemble`의 `parseRepeatEnd`(지난 날짜도 돌려줌, `getRepeatEnd`는 이것 + 지난 날짜 제외), `lib/calendar`의 `getOccurrence`가 `due`를 봄, `isLastOccurrence`는 `now` 인자 없이
- 정리 (화면 변화 없음): 옛 합주표용 `toBoard`·`isSkipped`(`lib/board`), `useBoard`(`queries/ensembles`), `EnsembleBlock`·`EnsembleBoard`(`types/domain`)와 그 테스트 삭제. 조회 훅 테스트(`queries.test`·`mutations.test`)는 `useBoardSchedule`로. ensemble context에서 옛 Drawer 단계용 `org*`·`setEnsembleOrgStates`·`currentMonth`와 쓰지 않는 setter(`setId`·`setStartTime`·`setEndTime`) 삭제
- 계획 문서: PIN·변경 흐름 추가 제안 3~5 삭제 (사용자 반려), V-2 완료 표시
- 테스트: `lib/calendar.test.ts` 3개(종료 뒤 null·지난 종료 날짜 숨김·겹침 계산), `Board.test.tsx`의 "지난 종료 날짜면 '…까지' 없음"을 "합주판에 보이지 않음"으로. 옛 `toBoard`·`isSkipped` 테스트 삭제. 변형 검사 2/2 (별도 복사본: 종료 뒤 숨김 제거, 마지막 날 판단의 종료 전 조건 제거)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 200/200 (옛 toBoard·isSkipped 테스트 삭제로 205 → 200) / `--maxWorkers=4` ✅ / `pnpm build` ✅ / `pnpm lint` → 에러 4·경고 24 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-25 — View 개편 V-3 (1차): 팀 목록, 공지·한마디 메인 화면, 설정·다크 모드, 스켈레톤

커밋 넷 (기능별): `3c215fe` 팀 목록 · `b4f54c4` 공지·한마디·푸터 · `be370ac` 설정·다크 모드 · `1cf237a` 스켈레톤

- 지금 → 바꾼 후
  - 팀 추가: 팀 목록 맨 끝의 점선 칩 → 카드 맨 위 "팀" 머리 줄 오른쪽 버튼
  - 팀 아닌 일정 칩: 팀 뒤에 이어짐·팀 색만 → 소모임 / 회의 등 줄을 나눔(펼쳤을 때·PC), 합주판과 같은 줄무늬 (합주 잡기 Drawer의 팀 고르기도)
  - 공지: 파란 바탕 antd 버튼 → 흰 카드 (첫 줄, 나머지 +N). 한마디: 점선 추가 버튼 + 테두리 카드 → 흰 카드 안 머리 줄·목록(PC 두 줄)·비었을 때 안내. 푸터 새 코드 (V-4·V-5를 미리. 추가·삭제 Drawer는 옛 그대로)
  - 처음 불러오는 동안: 빈 화면 → 스켈레톤(공지·팀·캘린더·한마디), 캘린더 빈 시간은 누를 수 없음
  - 헤더: 보기 방식 스위치 → 설정 버튼. 설정 Drawer에 "합주판 오늘부터 보기"(기본 꺼짐)·"다크 모드"(새 기능, 기본 기기 설정) 스위치, 기기에 기억
  - 다크 모드: 새 코드 전체(헤더·카드·캘린더·새 Drawer·알림). 팀 색 그대로. 옛 Drawer(팀 정보·추가·수정, 공지·한마디 추가/삭제)는 밝은 그대로
- 구조: `ui/add-pill`·`ui/icon-switch`·`ui/skeleton`, `settings/SettingsDrawer`·`settings/themeStore`, `styles/patterns`(줄무늬 공유), 토큰 `surface`·`on-ink`·`link`·`shadow-card`와 `.dark`. `DrawerId`에 `settings`. `common/Container`·`styles/cardRadius` 삭제
- 테스트: 팀 목록 머리 줄·줄무늬, 설정의 보기 방식 스위치(이전 헤더 스위치 테스트 대신)·다크 모드 스위치, 스켈레톤(응답을 막아 23개 → 0개). 팀 버튼 찾기를 "팀 목록" 묶음으로, 한마디 버튼 이름
- 확인: Playwright Chrome 390·1280px, 밝은·어두운 기기 설정 각각 — 메인·펼친 팀 목록·설정·합주 정보·합주 잡기 Drawer, 응답 2.5초 지연으로 스켈레톤. 가로 넘침 없음, 콘솔 오류 없음

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 203/203 / `pnpm build` ✅ / `pnpm lint` → 에러 4·경고 24 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-25 — View 개편 V-3 (2차): 다크 모드 색 다듬기

- 지금 → 바꾼 후 (다크 모드만, 밝은 모드는 그대로)
  - 팀 목록: 어두운 카드 바로 위의 칩 → 한 단계 밝은 판(#2c2c31) 위의 칩. 팀 색은 그대로
  - 합주판 점선 블록: 팀 색 그대로의 점선·글씨, 투명 바탕 → 테두리·글씨는 흰색을 섞어 밝게(팀 색 55%), 바탕에 팀 색을 옅게(18%)
- 확인: Playwright Chrome 390px 밝은·어두운 기기 설정, 남색·보라·빨강·노랑·회청 점선 블록과 펼친 팀 목록. 계산된 색 확인(남색 점선 글씨 #839ebe)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 203/203 / `pnpm lint` → 에러 4·경고 24 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-25 — View 개편 V-3 (3차): 설정 문구, 빗금 간격

- 지금 → 바꾼 후
  - 설정 Drawer: "이 기기에만 저장돼요"·항목별 회색 설명("일~토 요일 고정…"·"처음엔 기기 설정을 따라요" 등) → 없음 (제목 아래 설명은 화면에 보이지 않게 읽기 프로그램용으로만)
  - 팀 아닌 일정 빗금(합주판·팀 목록·합주 잡기 팀 고르기): 빗금 3px·간격 4px → 빗금 4px·간격 12px
- 사용자 요청으로 테스트·화면 확인은 하지 않음 (`pnpm typecheck` ✅, `pnpm format` 적용)

### 2026-11-25 — View 개편 V-3 (4차): 팀 정보 Drawer, 소모임·일정 정보 Drawer

- 지금 → 바꾼 후
  - 팀 정보: 오른쪽에서 열리는 옛 Drawer, 팀원·셋리를 탭으로 전환 → 아래에서 올라오는 Drawer(아래로 끌어 닫기), 팀 색 머리 + 팀원 6칸·셋리스트를 한 화면에. 셋리스트가 길면 Drawer 전체가 스크롤
  - 버튼: "합주 추가"·"팀 수정"·"팀 삭제"(큰 antd 버튼 3개) → 머리 안 흰 "합주 잡기"와 반투명 "수정"·"삭제"
  - 팀 종류: "세마치공연(정기/연말)" → "세마치공연 · 정기/연말". 빈 팀원 칸 → "없음", 빈 셋리스트 → "아직 셋리스트가 없어요"
  - 소모임·일정 정보: 옛 Drawer → 같은 모양의 줄무늬 머리 Drawer, "일정 추가" → "일정 잡기"
  - 다크 모드: 옛 Drawer라 밝은 그대로 → 본문이 어두운 바탕 (머리는 팀 색 그대로)
  - 수정·삭제는 아직 옛 Drawer 흐름 그대로 (위에 쌓이면 팀 정보가 내려갔다가 닫히면 다시 올라옴)
- 구조: `teams/TeamInfoDrawer`·`teams/EventInfoDrawer`를 새 코드로 (drawerId prop 없음), `BOTTOM_DRAWERS`에 `teamInfo`·`eventInfo`. 옛 TeamInfoDrawer의 key 없는 Fragment map 사라짐 (ISSUES V2 일부)
- 테스트: 팀 정보 테스트를 "한 화면에 종류·팀원·셋리스트"로, 소모임 정보에 "일정 잡기" 버튼, 버튼 이름 "합주 추가" → "합주 잡기" (Teams·App·AddEnsembleDrawer 테스트)
- 확인: Playwright Chrome 390·360·1280px, 밝은·어두운 기기 설정 — 긴 팀원 이름(12글자)·긴 셋리스트(30줄)·빈 팀·노랑 팀·보소. 가로 넘침 없음, 새 콘솔 오류 없음

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 203/203 / `pnpm lint` → 에러 4·경고 20 (옛 팀 정보 Drawer 삭제로 감소, 새 코드 0건) / `pnpm format:check` ✅

### 2026-11-26 — View 개편 V-3 (5차): 스크롤 막대 없애기, 팀 정보 문구, 모바일 끌어내림

- 지금 → 바꾼 후
  - 스크롤 막대: PC에서 Drawer 내용이 길면 막대가 생김(합주 잡기 Drawer만 숨김 + 아래 흰 그러데이션), 합주 잡기의 팀 고르기 목록에도 막대 → 새 코드의 세로 스크롤 영역 모두 막대 없음, 위·아래로 더 있으면 그쪽 끝을 흐리게 (마스크라 다크 모드·색 머리 위에서도 같음). 앞으로의 규칙으로 `CLAUDE.md`·계획 문서에 추가
  - 모바일: Drawer 맨 위에서 아래로 당기면 내용만 튕겨 내려가 머리 위에 빈 띠 → 튕기지 않음(`overscroll-y-none`), 이어서 당기면 Drawer가 끌려 내려감 (vaul은 마지막 스크롤 뒤 0.5초 동안은 끌기를 막는다). 혹시 튕겨도 색 머리 위는 머리 색
  - 팀 정보: "셋리스트" → "셋리스트 및 팀 정보"
- 구조: `index.css`의 `scroll-fade` 유틸리티, `components/ui/scroll-fade.ts`(`attachScrollFade`·`scrollFadeRef`: 스크롤·크기 변화에 따라 `data-fade-top`·`data-fade-bottom`), `drawerParts`의 `scrollAreaClassName`에 `scroll-fade overscroll-y-none`, `headerBackdrop`
- 테스트: `components/ui/scroll-fade.test.ts` 2개
- 확인: Playwright Chrome 1280×720·390px, 밝은·어두운 기기 설정 — 팀 정보(셋리스트 30줄) 맨 위·가운데·맨 아래의 흐림 속성과 막대 폭 0, 합주 잡기 Drawer·팀 고르기(팀 41개) 막대 없음·흐림. 실제 아이폰 끌어내림은 사용자 확인 필요

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 205/205 / `pnpm lint` → 에러 4·경고 20 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-26 — 백엔드: 반복 종료 날짜가 지난 반복 합주 빼기 (`api.js`)

- 백엔드 개발자 요청으로 사용자가 직접 수정, 커밋만 함께 (`480e745`). `GET /ensembles`의 반복 합주 조건 `{ repeat: true }` → `{ repeat: true, due: { $not: { $lt: today } } }` (due가 없으면 포함)

### 2026-11-26 — View 개편 V-3 (6차): 색 머리 위 흐림, 아이폰 아래 도구 막대 색

- 지금 → 바꾼 후
  - 흐림: 팀 색 머리가 위 끝을 지날 때 흰색·검은색으로 흐려짐 → 머리가 다 지나간 뒤부터 흐림 (`data-fade-skip`). 흐림 폭은 끝까지 남은 거리만큼(최대 28px)이라 부드럽게 생기고 사라짐
  - 아이폰 사파리 아래 도구 막대: 팀 정보는 늘, 합주 정보는 가끔 팀 색 → Drawer 바탕색. 원인: 5차에 스크롤 영역 바탕을 팀 색 그러데이션(`headerBackdrop`)으로 바꿈 (사파리 26은 화면 아래 끝 고정 요소에서 막대 색을 가져온다. 4차 스크린샷은 정상). 그러데이션 삭제, 스크롤 영역 바탕 `bg-surface`
  - 소모임·일정 정보: 줄무늬 머리가 Drawer 아래 끝까지 → 머리 아래 바탕에 소모임 색 "일정 잡기" 버튼 (아래 끝이 팀 색이 되지 않게)
  - 규칙: Drawer 아래 끝·스크롤 영역 바탕에 팀 색 금지 (`CLAUDE.md`·계획 문서)
- 테스트: `scroll-fade.test.ts` 2 → 3개 (흐림 폭, 색 머리 건너뛰기)
- 확인: Playwright Chrome 390px 밝은·어두운 기기 설정 — 머리가 반쯤 지난 위치에서 위 흐림 0, 머리를 지나면 28px, 화면 아래 끝 점의 요소 바탕이 모두 Drawer 바탕색. 실제 아이폰 도구 막대는 사용자 확인 필요

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 206/206 / `pnpm lint` → 에러 4·경고 20 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-26 — View 개편 V-3 (7차): 흐림·도구 막대의 진짜 원인, 빗금 정리

- 원인 (진행 중 발견): 5차에 만든 흐림 유틸리티 이름 `scroll-fade`가 shadcn의 같은 이름 유틸리티(`shadcn/tailwind.css`: 마스크 + 스크롤 연동 애니메이션)와 합쳐졌다. 6차에 마스크를 빼도 shadcn 쪽 마스크가 늘 걸려 있었다 (계산된 `mask-image`로 확인). 6차의 그러데이션 바탕 가설은 틀렸다
- 지금 → 바꾼 후
  - 흐림: shadcn 마스크(스크롤 연동, 색 머리 위도 흐림) → 이름 `edge-fade`, 끝에 붙는 바탕색 그러데이션. 색 머리가 있는 Drawer는 위쪽 흐림 없음 (끝까지 내려도 머리가 남는 길이에서 머리가 흐려지던 것 해결)
  - 아이폰 사파리 아래 도구 막대: 새 Drawer가 열려 있으면 팀 색이 되기도 함 → 마스크 제거 + 새 Drawer가 열려 있는 동안 화면 아래 끝에 Drawer 바탕색 띠(`layout/ToolbarTint`, 아이폰만, z-index 최대, 화면 밖으로 8px·안으로 4px). ISSUES V14
  - 빗금: 소모임 정보 Drawer 머리·합주 잡기의 팀 고르기 → 없음 (메인 화면 팀 목록·합주판에만)
  - 합주 잡기의 팀 고르기: 안쪽 여백을 안의 요소로 (흐림이 테두리 바로 안에 붙게)
- 테스트: `scroll-fade.test.ts` 3개(진하기 0~1, 색 머리면 위쪽 없음), `layout/ToolbarTint.test.tsx` 2개
- 확인: Playwright WebKit(아이폰 UA)·Chrome 390px 밝은·어두운 — 스크롤 영역 `mask-image: none`, 아래 흐림 진하기, 색 머리 Drawer의 위쪽 흐림 0, 띠(바탕색·z-index·위치 756~768px / 화면 760px), Drawer를 닫으면 띠 없음. 실제 아이폰 도구 막대는 사용자 확인 필요

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 208/208 / `pnpm lint` → 에러 4·경고 20 (새 코드 0건) / `pnpm format:check` ✅
- 사용자가 실기기(아이폰)에서 흐림·도구 막대 정상 확인 (ISSUES V14 해결)

### 2026-11-26 — View 개편 V-3 (8차): 문구·빗금

- 지금 → 바꾼 후
  - 합주 잡기 Drawer의 첫 소제목: 늘 "팀" → 일정(소모임·회의 등)이면 "일정"
  - 팀 정보에서 합주 잡기: "반복"이 맨 위로 스크롤된 채 열림(22차) → 맨 위에서 시작 (팀은 골라진 채)
  - 소모임·일정 빗금: 빗금 4px·간격 12px → 둘 다 8px
  - 팀 정보 버튼 "수정"·"삭제" → "팀 수정"·"팀 삭제" (모바일 글씨 15 → 14px, 아이콘 18 → 16px: 360px에서 "합주 잡기"가 잘리지 않게), 합주 정보 버튼 "수정"·"삭제" → "합주 수정"·"합주 삭제" (일정은 "일정 수정"·"일정 삭제")
- 사용자 요청으로 화면 확인은 생략. 버튼 이름·처음 스크롤이 바뀌어 해당 테스트만 고쳐 돌림 (Board·Teams·AddEnsembleDrawer·App 57개 ✅)

**검증:** `pnpm typecheck` ✅ / `pnpm format` 적용

### 2026-11-26 — View 개편 V-3 (9차): 밝은 모드 팀 목록 판, 팀 삭제 PIN 단계, 일정 문구

- 지금 → 바꾼 후
  - 메인 화면 팀 목록: 밝은 모드는 판 없음 → 다크 모드처럼 카드보다 흐린 회색 판(#f4f5f7)으로 묶음
  - 팀 삭제: 오른쪽에서 쌓이는 옛 Drawer(한 칸 PIN, "진짜 삭제해요", 알림 없음) → 팀 정보 Drawer 안의 PIN 단계 (합주 삭제와 같은 모양, 4칸, "삭제하기", 뒤로 가면 정보로). "팀의 합주도 모두 삭제되고, 되돌릴 수 없어요" 안내, 삭제 결과 알림("삭제했어요." / 실패)
  - 일정(소모임·회의 등)에서 보이던 "팀" → "일정": 합주 정보 PIN 단계 "팀 PIN 4자리" → "일정 PIN 4자리", 일정 수정 "팀은 바꿀 수 없어요" → "일정은 바꿀 수 없어요", 소모임 정보 Drawer의 설명 "팀 아닌 일정" → "일정", 합주 잡기 팀 고르기 목록의 이름(읽기 프로그램) → 소제목과 같게
  - PIN 단계 안내 문구가 낱말 중간에서 줄바꿈되던 것 → 낱말 단위 (`break-keep`)
- 구조: `schedule/pinSheet.tsx`(`usePinSheet`: 키보드 위 여백·최대 높이, 뒤 페이지 고정, 키보드 쪽 흰 판)를 합주 정보 Drawer에서 꺼내 팀 정보 Drawer와 함께 씀 (동작 그대로). 옛 `teams/DeleteTeamDrawer`·`DrawerId` `deleteTeam` 삭제
- 테스트: 팀 삭제 흐름을 새 PIN 단계 기준으로 (알림·Drawer 모두 닫힘 확인)
- 확인: Playwright Chrome 390·1280px 밝은·어두운 — 팀 목록 판, 팀 삭제 PIN 단계

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 208/208 / `pnpm lint` → 에러 4·경고 19 (옛 팀 삭제 Drawer 삭제로 1건 감소, 새 코드 0건) / `pnpm format:check` ✅

### 2026-11-26 — View 개편 V-3 (10차): 팀 추가 Drawer, 팀 종류 개편, 팀 자동 삭제(적용 예정)

- 지금 → 바꾼 후
  - 팀 추가: 옛 Drawer 6단계(완료 화면 "락앤롤!", 저장 실패 알림 없음) → 아래에서 올라오는 Drawer 하나 + 같은 Drawer 안의 PIN 만들기. 성공하면 닫고 "팀을 만들었어요." 알림, 실패하면 알리고 머묾
  - 팀 종류: 4개 → "교내 공연"·"외부 공연"·"기타 팀" (서버에 그대로, 고르면 아래 설명). 옛 값과 함께 쓴다
  - 팀 이름 예시(록 밴드) 23 → 48개, 팀원 칸마다 12자·셋리스트 200자(옛 Drawer와 같음), 팀원·셋리스트 안내 문구
  - PIN: 두 칸 → 4칸에 한 번 넣고 같은 칸에 한 번 더 (서로 다르면 흔든 뒤 처음부터)
  - 팀 자동 삭제 (새 기능, 적용 예정): 다 만들고 `teams/teamDue.ts`의 `TEAM_DUE_ENABLED`로 꺼 둠 (백엔드 팀 스키마에 `due`가 없음). 읽는 쪽(팀 정보의 "…까지", 합주 잡기의 매주 반복 제한)은 서버가 보내면 바로 동작. 상세: 계획 문서 "적용 예정: 팀 자동 삭제"
  - 메인 화면 팀 목록 판(밝은 모드): #f4f5f7 → #fbfbfc
- 구조: `teams/AddTeamDrawer.tsx`, `teams/teamDue.ts`, `schedule/formParts.tsx`(합주 잡기에서 꺼낸 입력 부품), `schedule/keyboardSheet.tsx`(`pinSheet` 이름 변경: 입력칸이 있는 Drawer 공용), `PinStep`의 `PinSlots`. 로직 층에 더한 것(덧붙이기만): `types/response` 팀 `due`, `types/domain`의 `Team.due`·`TeamType`(새 3개)·`LegacyTeamType`, `types/request`의 `due`, `lib/board`의 `toTeams`가 `due`를 넘김. 옛 `addTeamDrawers/` 삭제
- 테스트: 팀 추가 2개 → 3개(한 Drawer + PIN 두 번 → 본문 `type: '교내 공연'`·`due` 없음, 확인 PIN이 다르면 처음부터·저장 안 함, 저장 실패), 팀 자동 삭제 2개(삭제 날짜가 있으면 팀 정보 "12/10(목)까지"·계속 반복 막힘·안내, 없으면 그대로)
- 확인: Playwright Chrome 390·360·1280px 밝은·어두운 — 빈 화면·채운 화면·맨 아래·PIN 1·2단계·서로 다름, 스크롤 막대 0·가로 넘침 없음·새 콘솔 오류 없음

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 211/211 / `pnpm lint` → 에러 2·경고 19 (옛 팀 추가 Drawer 삭제로 에러 2건 감소, 새 코드 0건) / `pnpm format:check` ✅

### 2026-11-26 — View 개편 V-3 (11차): 팀 고정, 팀 추가 Drawer 다듬기

- 지금 → 바꾼 후
  - 팀 고정 (새 기능): 없음 → 팀 정보 Drawer의 핀 버튼으로 켜고 끔. 고정한 팀은 메인 화면 팀 목록 맨 앞(먼저 고정한 팀이 앞, 칩에 작은 핀), 이 브라우저에 기억. 팀 색은 그대로
  - 팀 추가·합주 잡기 Drawer의 머리 설명 문구 → 화면에서 뺌
  - 팀 추가: 팀 종류 기본 교내 공연, "팀 이름" → "팀명", 셋리스트 예시 "아티스트 - 제목 / ...", PIN 만들기의 단계 표시 삭제·설명 "숫자 4자리. 잊지 않게 팀원과 공유해 두세요"
  - 팀 추가 "다음" 버튼: 휴대폰 키보드 위에 딸려 올라옴 → 글자를 쓰는 동안 숨김 (`keyboardSheet`의 `keyboardOpen` 또는 터치 화면에서 입력칸 포커스)
  - 팀원·셋리스트가 비어 있으면: "다음"만 → "다음 (팀원 및 셋리스트 나중에 적기)" 등 + 소제목 옆 "권장"/"작성함" 배지
- 테스트: 팀 추가 흐름(기본 종류·팀명), "권장"·"나중에 적기" 문구 1개, 팀 고정(순서·기억·풀기) 1개
- 확인: Playwright Chrome 390px 터치(모바일) 밝은·어두운 — 고정 핀·목록 순서, 팀명·팀원 입력 중 "다음" 숨김·입력칸 사이 이동 중에도 숨김·포커스를 빼면 다시 보임

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 213/213 / `pnpm lint` → 에러 2·경고 19 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-26 — View 개편 V-3 (12차): "나중에 적기" 버튼 스타일

- 지금 → 바꾼 후
  - 팀 추가: 팀원·셋리스트 소제목 옆 "권장"/"작성함" 배지 → 삭제 (사용자 반려). 비운 칸이 있으면 "다음" 버튼이 점선 테두리만(바탕은 Drawer 바탕), 다 쓰면 꽉 찬 검정 버튼
  - "다음"과 "(… 나중에 적기)"가 붙어 보임 → 한 칸 띄움 (flex 안의 공백 글자는 그려지지 않아 gap으로)
- 사용자 요청으로 테스트·화면 확인은 하지 않음. 배지를 찾던 테스트 줄만 지움 (`pnpm typecheck` ✅, `pnpm format` 적용)

### 2026-11-26 — View 개편 V-3 (13차): 팀 수정 Drawer, "나중에 적기" 버튼 스타일 되돌림

- 지금 → 바꾼 후
  - 팀 추가 "다음" 버튼의 점선 테두리(12차) → 되돌림, "(… 나중에 적기)" 문구만
  - 팀 수정: 오른쪽에서 쌓이는 옛 Drawer 5단계(저장 알림 없음, 뒤로 가기마다 값 되돌리기) → 팀 정보 Drawer 안의 PIN 단계 → 팀 수정 Drawer 하나(팀 추가 Drawer의 수정 모드, 지금 값이 채워짐). 저장하면 고친 값으로 팀 정보로 돌아오며 알림, 닫으면 팀 정보로, 404면 모두 닫고 "이미 삭제된 팀이에요." (이전: 알림 없이 닫음)
  - 옛 팀 종류는 새 종류로 바꿔 채움 (손대지 않으면 "바뀐 내용이 없어요", 다른 것을 고쳐 저장하면 새 종류로 바뀜)
- 구조: `teams/editTeamStore`, `AddTeamDrawer`의 `mode`, `HandleUpdateTeam(id, input) → Promise<boolean>`, `TeamUpdateRequest`에 `due`(적용 예정). 옛 `updateTeamDrawers/` 삭제. team context를 `id·type·name·desc·setTeamStates`만으로 (옛 Drawer용 setter·PIN·org* 삭제)
- 테스트: 옛 팀 수정 흐름 3개(5단계·404·F1 뒤로 가기 회귀) → 새 3개 (PIN → 지금 값 채움·옛 종류 바꿔 채움·바뀐 것 없으면 막힘·저장하면 PUT 본문·팀 정보로 돌아와 새 이름, 닫으면 팀 정보, 404). F1(뒤로 가면 값이 지워짐)은 단계가 없어져 대상이 사라짐. context 테스트에서 PIN 제거
- 확인: Playwright Chrome 390px 밝은·어두운 — 옛 종류 팀의 수정 Drawer(교내 공연으로 채움), 값을 바꾸면 "수정하기"

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 213/213 / `pnpm lint` → 에러 1·경고 19 (옛 팀 수정 Drawer 삭제로 에러 1건 감소, 새 코드 0건) / `pnpm format:check` ✅

### 2026-11-26 — View 개편 V-3 (14차): 팀 추가·수정 스크롤, 알림 디자인

- 지금 → 바꾼 후
  - 팀 추가·수정 Drawer: 스크롤 그대로 → 팀 종류를 고르면 "팀 종류", 팀명을 다 쓰면 "팀명"이 맨 위로, 팀원·셋리스트를 다 쓰면 맨 아래로 (합주 잡기 Drawer와 같은 방식, `formParts`의 `useSectionScroll`). 팀명 칸에서 키보드의 다음 → 보컬 칸
  - 알림: 흰 사각 카드 → 위쪽 가운데의 둥근 반전 색 "섬", 결과 색의 동그란 아이콘, 굵은 제목·작은 설명 (`ui/sonner`). 위치는 그대로(위쪽 가운데)
- 확인: Playwright Chrome 390px(밝은·어두운)·1280px — 팀 종류를 고르면 소제목이 스크롤 영역 위 24px, 팀명 다음 → 24px, 팀원을 벗어나면 맨 아래. 성공·실패 알림 모양
- 테스트는 그대로 통과 (알림 문구로 찾는 테스트 포함)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 213/213 / `pnpm lint` → 에러 1·경고 19 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-26 — View 개편 V-3 (15차): 알림은 한 문장만

- 지금 → 바꾼 후: 팀 만들기·수정, 팀 고정·풀기(팀 이름), 합주·일정 잡기·수정(합주 요약)의 알림 아래 작은 설명 → 없음. 모든 알림이 굵은 한 문장 (다크 모드에서 설명이 보이지 않던 문제도 함께 사라짐)
- 정리: 쓰지 않게 된 `formatEnsembleSummary` 삭제, 알림의 설명 모양 삭제
- 테스트: 합주 요약을 찾던 2곳 → 알림 문장으로

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 213/213 / `pnpm lint` → 에러 1·경고 19 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-26 — View 개편 V-3 (16차): 미루기·바로 하기·반복으로 바꾸기 성공 알림

- 지금 → 바꾼 후: 성공해도 알림 없이 정보 화면만 바뀜 → "12/10(목)로 미뤘어요." / "12/3(목)부터 다시 해요." / "매주 반복으로 바꿨어요."
- 사용자 요청으로 새 테스트는 만들지 않음. 기존 합주 테스트 26개만 돌려 그대로 통과 확인 (`pnpm typecheck` ✅)

### 2026-11-26 — View 개편 V-3 (17차): 존재 확인 실패·이미 삭제된 팀 알림

- 지금 → 바꾼 후
  - 팀·합주 존재 확인이 실패하면: 이미 삭제됨(404)이든 서버 오류든 알림 없이 Drawer를 모두 닫음 → 404는 "이미 삭제된 팀이에요."/"이미 삭제된 합주예요." + 모두 닫음, 서버 오류 등은 "확인하지 못했어요. 잠시 후 다시 시도해 주세요." + 그 화면에 머묾
  - 합주 정보에서 팀 이름을 눌렀는데 그 팀이 이미 없음: 알림 없이 닫음 → "이미 삭제된 팀이에요."
  - 팀 정보에서 합주 잡기 저장 직전 팀 확인: 서버 오류도 "이미 삭제된 팀이에요."로 알림 → 위와 같이 나눔
- 문서: 계획 문서에 "V-4(한마디)·V-5(공지)에서 할 일" (알림 문구, V-2·V-3의 Drawer 규칙)
- 테스트 4개: 미루기 때 합주 404·서버 오류, 팀 이름을 눌렀는데 팀이 없음, 팀 수정 때 서버 오류

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 217/217 / `pnpm lint` → 에러 1·경고 19 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-26 — View 개편 V-3 마무리

- 사용자 실기기 확인: 팀 추가·수정의 키보드·"다음"/"수정하기" 숨김·소제목 스크롤, 알림 위치
- 사전 결정 3(폼) 확정: react-hook-form + Zod → Drawer 로컬 `useState` (검증이 필수 한두 개 + 글자 수뿐이라 폼 라이브러리로 얻는 것이 없다)
- V-3 결과: 팀 목록(고정·스켈레톤·다크 모드), 팀 정보·추가·수정·삭제, 합주 잡기(팀 정보에서), 소모임·일정 정보 → 아래에서 올라오는 새 Drawer. 옛 팀 Drawer(추가 6·수정 5·삭제·정보·소모임 정보) 모두 삭제, 팀·합주 쪽 코드에 antd·styled-components 없음. 팀 종류 3개 개편, 팀 자동 삭제(적용 예정)
- V-6으로 넘긴 것 (계획 문서 "V-6 상세"): `context/team`·`context/ensemble`(지금 보고 있는 팀·합주만 남음), 호환용 `useDrawerContext` 별칭, 옛 공용 Drawer(공지·한마디만 사용)
- ISSUES: V6(알림)·V12(키보드)를 공지·한마디만 남은 것으로 갱신

### 2026-11-26 — View 개편 V-4 (1차): 한마디 남기기·삭제 Drawer, 목록 다듬기

- 시작 전 기능 검토 → 사용자 결정은 계획 문서 "V-4 진행" (적용 7개, 백엔드와 상의·적용 안 함 4개)
- 지금 → 바꾼 후
  - 한마디 남기기: 오른쪽에서 열리는 옛 Drawer(글·PIN 한 칸·"완료 (일주일 후 삭제)", 알림 없음) → 아래에서 올라오는 Drawer 하나: 글(200자, 글자 수) → "다음" → 같은 Drawer 안의 PIN 4칸(한 번) → "남기기". 성공하면 닫고 "한마디를 남겼어요.", 실패하면 알리고 PIN 단계에 머묾
  - 한마디가 100개라 서버가 거절(400 `Note limit exceeded`): 알림 없음 → "한마디가 가득 찼어요. 며칠 뒤 다시 남겨 주세요." (그 밖의 실패는 "저장하지 못했어요. …")
  - 공백·줄바꿈만 있는 글: 그대로 남겨짐 → 남길 수 없음("내용을 써 주세요"), 앞뒤 공백은 빼고 보냄
  - 삭제: X → 옛 Drawer(PIN 한 칸, 넣는 순간 존재 확인, "진짜 삭제해요", 알림 없음) → X를 누를 때 존재 확인(404 "이미 삭제된 한마디예요." + 목록 다시 불러오기, 그 밖 "확인하지 못했어요. …") → 아래에서 올라오는 Drawer("한마디를 삭제할까요?" + 그 글, PIN 4칸, 틀리면 흔든 뒤 비움, "삭제하기"·Enter). "삭제했어요."(그새 삭제됐어도 같음), 실패 "삭제하지 못했어요. …" + PIN부터 다시
  - 한마디 카드: 작성 시각 없음 → 초까지("2026.11.26 14:03:22", 서버가 시각을 저장하지 않아 id(ObjectId) 앞 8자리에서 읽음). 낱말 중간에서도 줄바꿈 → 낱말 단위(긴 링크·영문만 자름). 글 속 주소(http(s)://·www.) → 누를 수 있는 링크(새 탭). 긴 한마디는 5줄까지 + "더 보기"/"접기". 목록은 처음 6개 + "전체 보기 (N개)"/"접기"
- 구조: 계획 문서 "V-4 진행" 1차. 옛 한마디 Drawer(antd·styled-components) 삭제
- 정리 (별도 커밋 `fee0faa`): V-3에서 남은 쓰지 않는 import 5개 (합주 잡기 Drawer 3·팀 테스트 2). V-3 기록의 "새 코드 0건"은 이것을 놓쳤다
- 테스트: `Note.test.tsx`를 새 Drawer 기준으로 다시 씀 (2개 → 6개: 남기기 본문·알림·닫힘, 공백만이면 막힘, 가득 참·저장 실패 알림과 머묾, 삭제 흐름·요청 수, X 때 이미 삭제됨, 작성 시각·링크·전체 보기), `lib/notes.test.ts` 작성 시각 1개
- 확인: Playwright Chrome 390px(밝은·어두운)·1280px, API는 모두 가짜 응답 — 링크·작성 시각·"더 보기"(긴 한마디)·"전체 보기", 긴 영문 낱말 줄바꿈, 남기기 → PIN → 가득 참 알림, 삭제 PIN 틀림. 가로 넘침 없음, 새 콘솔 오류 없음

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 222/222 / `pnpm lint` → 에러 1·경고 9 (옛 한마디 Drawer 삭제로 5건, 쓰지 않는 import 정리로 5건 감소, 새 코드 0건) / `pnpm format:check` ✅ / `pnpm build` ✅ (JS 1,088kB)

### 2026-11-26 — View 개편 V-4 (2차): "한마디" → "날적이" 리뉴얼

- 사용자 실기기 확인(1차) 뒤 결정
- 지금 → 바꾼 후
  - 이름: "한마디" → "날적이" (제목·버튼·Drawer·알림 문구 전체. 코드·API 이름은 note 그대로)
  - 제목 옆 아주 작은 물음표(신규): 누르면 날적이 유래 설명 말풍선 (`ui/popover`, Radix Popover)
  - 제목 아래 "일주일 후 자동으로 삭제돼요" → "아무말 대잔치만 해요.", 남기기 Drawer의 같은 안내 → 삭제. 자동 삭제 문구는 화면에서 모두 없앰
  - 남기기 Drawer 글 칸 예시 "내용 여따 써요" → 쓰는 규칙 두 줄("비방, 도배, …" / "공지나 건의 등도 …"), 낱말 단위 줄바꿈
  - 100개 가득 참 알림(1차) → 삭제 (제한 없이 쌓기로. 서버의 100개 제한·8일 자동 삭제는 사용자가 `api.js`에서 직접 지움)
- 로직 층: 1차에 더한 `api/note`의 `isNoteLimitExceeded` 삭제
- 테스트: 가득 참 테스트 → 저장 실패 테스트, 물음표 말풍선 1개, 문구 갱신
- 확인: Playwright Chrome 390px(밝은·어두운)·1280px, API 모두 가짜 응답 — 말풍선, 남기기 Drawer 예시 두 줄. 가로 넘침 없음

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 223/223 / `pnpm lint` → 에러 1·경고 9 (새 코드 0건) / `pnpm format:check` ✅

### 2026-11-26 — View 개편 V-4 (3차) 완료, V-5 (1차): 공지 Drawer

- V-4 3차 (사용자 실기기 확인 뒤)
  - 날적이 PIN 정하기: 제목 위 글 미리 보기 → 없음, 설명 "숫자 4자리. 날적이를 지울 때 필요해요" → "숫자 4자리. 지울 때 필요해요"
  - 백엔드(사용자 직접 수정, 커밋 `09ed9ef`): 날적이 8일 자동 삭제 제거, 100개 제한 주석 처리
- V-5 1차 — 지금 → 바꾼 후
  - 공지 Drawer: 오른쪽에서 열리는 옛 Drawer 3개(목록 / 올리기: 글 + PIN 한 칸 + "완료" / 삭제: PIN 한 칸 + "진짜 삭제해요", 알림 없음) → 아래에서 올라오는 Drawer 하나 안의 단계: 목록 → 올리기(관리자 PIN 4칸 → 맞으면 바로 글쓰기 → "올리기") / 삭제(X → 관리자 PIN → "삭제하기"). 올리거나 삭제하면 목록으로
  - 올리기 순서: 글 → PIN → PIN을 먼저 (공지는 고정된 관리자 PIN이라, 관리자가 아니면 글을 쓰기 전에 막힌다)
  - 목록: 공지 전체 글(낱말 단위 줄바꿈·링크) + 올린 날짜("2026.11.26", id(ObjectId)에서 읽음). 맨 아래 "공지 올리기 (관리자)" 줄
  - 알림: "공지를 올렸어요." / "삭제했어요."(그새 삭제됐어도 같음) / 저장·삭제 실패 / X 때 이미 삭제됨 "이미 삭제된 공지예요."(목록 다시 불러오기, 목록에 머묾) / 확인 실패. 올리기 실패면 글쓰기에, 삭제 실패면 PIN부터 다시
  - 공백만 있는 글 막기, 앞뒤 공백 빼고 보냄
  - 메인 화면 공지 카드: 작은 "공지" 글씨 → 없음 (읽기 프로그램용으로만)
  - 구조: `notice/NoticeDrawer` 새 코드, 옛 `AddNoticeDrawer`·`DeleteNoticeDrawer` 삭제, `BOTTOM_DRAWERS`에 `notice`, `Notice.createdAt`(로직 층 덧붙이기). 이제 기능 코드에서 옛 공용 Drawer·antd·styled-components를 쓰는 곳이 없다 (남은 것은 V-6)
- 테스트: `Notice.test.tsx`를 새 Drawer 기준으로 다시 씀 (3개 → 6개: 목록, 올리기 PIN → 글 → 본문·알림·목록으로, 틀린 PIN, 올리기 실패, 삭제 흐름·요청 수, X 때 이미 삭제됨)
- 확인: Playwright Chrome 390px(밝은·어두운)·1280px, API 모두 가짜 응답 — 메인 공지 카드, 목록(링크·날짜), PIN, 글쓰기. 가로 넘침 없음

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 226/226 / `pnpm lint` → 에러 1·경고 3 (모두 이제 쓰지 않는 옛 공용 Drawer·Tooltip, V-6에서 삭제) / `pnpm format:check` ✅ / `pnpm build` ✅ (JS 1,088kB → 883kB, gzip 349 → 283kB: 기능 코드에서 antd 사용처가 사라짐)

### 2026-11-26 — View 개편 V-5 마무리, V-6: 일괄 정리

- V-5: 사용자 실기기 확인 → 완료. 계획 문서는 사용자가 `docs/archive/`로 옮김 (경로 참조 갱신)
- 사용자 결정 (모두 추천안): 기능 단위 + 공용 로직 층 혼합 구조, 케밥 표기 파일 이름, Drawer 스택 유지, 팀 색 상수를 `constants/colors.ts`로
- 커밋 다섯 (동작 변화 없음)
  - ① `b330dde` 옛 코드·antd·styled-components 제거: `components/common`, `legacy.css`(옛 전역 스타일)·`media.ts`·`styled.d.ts`, antd Provider·패치, CSS의 legacy·antd 레이어, 패키지 5개. 옛 Drawer 구분(`BOTTOM_DRAWERS`·`sideDrawers`), 쓰지 않는 Drawer ID 2개. App 본문 밀기 → Tailwind `main`. 간격·글자 크기 토큰을 Tailwind 기본(rem)으로. 테스트 `renderWithTheme` → `renderWithProviders`, antd용 헬퍼·허용 경고 목록 삭제
  - ② `e34abee` `styles/theme.ts` → `constants/colors.ts` (팀·소모임 색 값·순서 그대로, 로직 층은 가져오는 경로만)
  - ③ `7780651` 팀·합주 context → `stores/selection`(Zustand), `useDrawerContext` 별칭 삭제. 내용은 그대로 들고 있다 (id만 두면 미루기·수정 직후 잠깐 이전 값이 보여서)
  - ④ `f4c30d7` 디렉터리 재구성: `app/`·`features/`·`components/(ui·sheet·layout)`, 케밥 표기, 52개 파일 `git mv`
  - ⑤ 문서: `docs/DIRECTORY_STRUCTURE.md`(새로), `CLAUDE.md`, `MODERNIZATION.md` 6·8·9번 ✅, ISSUES V1·V3·V4·V5·V8·E4·F9·F11·P3·P5 ✅
- 확인: 단계마다 Playwright로 전후 스크린샷 21장(390px 밝은·어두운, 1280px × 메인·팀 정보·합주 잡기 달력·팀 추가·공지·날적이·설정, API는 모두 가짜 응답) 픽셀 비교 0 (팀 추가의 팀 이름 예시는 무작위라 제외). 1280px 메인은 팀 목록 높이 애니메이션 도중에 찍히면 차이가 나 대기 시간을 늘려 확인
- 테스트: context 테스트 → `stores/drawer.test`·`stores/selection.test`, OkButton 테스트 삭제 (226 → 223)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 223/223 / `pnpm lint` → **에러 0·경고 0** / `pnpm format:check` ✅ / `pnpm build` ✅ (JS 883kB → 835kB, gzip 283 → 265kB)

### 2026-11-26 — View 개편 V-7: 마무리 (View 개편 완료)

| 항목 | 3단계 완료 (2026-11-23) | View 개편 완료 (2026-11-26) |
|---|---|---|
| 테스트 | 17개 파일, 93개 | 28개 파일, 223개 |
| 커버리지 (구문 · 분기 · 줄) | 91% · 81% · – | 92.2% · 85.0% · 95.4% (`lib` 99·93%, `stores` 100·92%. 낮은 곳은 shadcn 기본 부품과 진입점) |
| 린트 | 에러 5 · 경고 42 (모두 옛 View) | **에러 0 · 경고 0** |
| JS 번들 | 1,039kB (gzip 324kB) | **835kB (gzip 265kB)** + CSS 87kB (gzip 15kB). 가장 컸을 때 1,301kB(V-2 21차, antd와 새 달력이 함께 있던 때) |
| UI·스타일 | antd 5 + styled-components 6 | shadcn/ui(Radix·vaul·Sonner·input-otp·react-day-picker) + Tailwind 4 + lucide. antd·@ant-design 3개·styled-components 제거 |
| 상태 | Context 2개(team·ensemble) + Zustand(Drawer) | Zustand만 (Drawer, 보고 있는 팀·합주, 기능별 store), Context 0개 |
| Drawer | 오른쪽에서 쌓이는 옛 Drawer(기능마다 단계별 여러 개, 완료 화면) | 아래에서 올라오는 Drawer 하나에서 모두 입력, PIN 4칸, 키보드 처리 |
| 알림 | 없음 (3-6 폐기) | 모든 조회 실패·변경 결과에 Sonner 알림 (굵은 한 문장) |
| 새 기능 | – | 주 단위 합주판(12주, 보기 방식 2가지), 반복 종료 날짜, 미루기 취소·반복으로 바꾸기, 겹침 4개 제한, 팀 고정, 다크 모드, 스켈레톤, 날적이 작성 시각·링크 등 |
| 디렉터리 | 종류별(`components/`·`context/`) | 기능 단위(`features/`) + 공용 로직 층, 케밥 표기 (`docs/DIRECTORY_STRUCTURE.md`) |

- 번들 구성 (V-7에 소스맵으로 잰 압축 전 크기 비율): react-dom 25%, zod 14%, 앱 코드 13%, axios 8%, react-day-picker 6%(+ date-fns 7%), TanStack Query 7%, vaul 3%, sonner 3% 등. 500kB 경고는 남아 있다 → ISSUES V15 (줄일 후보, 적용 전 승인)
- 정리: 직접 쓰지 않는 `date-fns` 의존성 삭제 (react-day-picker의 자체 의존성, 번들 변화 없음), 지금 동작과 맞지 않는 주석 4곳
- 화면 확인: Playwright 360·390·430·600·768·900·1024·1280px × 밝은·어두운 (API 가짜 응답), 가로 넘침 0·콘솔 오류 0
- 문서: 계획 문서 완료 표시, `CLAUDE.md` 마이그레이션 단계, MODERNIZATION 진행 순서, ISSUES(F6·V11·E2 상태 ✅, V15 추가)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 223/223 / `pnpm test:coverage` ✅ / `pnpm lint` → 에러 0·경고 0 / `pnpm format:check` ✅ / `pnpm build` ✅

### 2026-11-27 — 백엔드 개편 계획 수립

- 사용자 결정: 백엔드(`api.js`)도 개편. `docs/archive/BACKEND_SUGGESTIONS.md`의 항목 대부분을 고치고, TypeScript로 옮기고, `main` 푸시 → GitHub Actions로 OCI 서버에 자동 배포. 사용자가 `api.js` 수정 권한을 줌 (`CLAUDE.md` 작업 범위 갱신)
- `docs/BACKEND_PLAN.md` 작성: 목표, 지금 상태, 사전 결정 8개(추천안: 같은 저장소의 `server/` + pnpm workspace, Node LTS·Express 5·Mongoose 최신, 빌드 없는 TS 실행, Docker + compose + Caddy, API를 `semachi.net/api`로 같은 주소에, Vitest + supertest + 메모리 MongoDB, 비밀값은 서버 `.env`에만, 데이터 변경 전 백업), 배포 구조 설명, 단계 B-0~B-9, OCI 작업 안내(계정을 받은 뒤 채움), 멈추고 보고할 조건
- 범위에서 뺀 것: D2(서버가 다음 합주 날짜 계산). 이미 해결: D4·D5
- 계획 수정 (같은 날, 사용자 요청): 저장소를 모노레포(`apps/web`·`apps/server`·`packages/shared`)로, 안내 방식(사용자가 배우며 따라가기, `docs/LEARNING_NOTES.md`)을 규칙으로 (`CLAUDE.md`), 단계 추가 — B-1 모노레포 + 검색 엔진 차단(noindex), B-6 베타 환경(`dev` 푸시 → `beta.semachi.net`, 별도 DB·테스터 암호), B-9 활동 기록 고도화(방문자·IP·기기·사용한 PIN 종류·바뀌기 전후, 관리자 보기), B-11 팀 자동 삭제 상시 적용(`TEAM_DUE_ENABLED` 제거) + 날짜 지난 팀·합주 정리 작업. 단계는 B-0~B-13
- 순서 수정 (같은 날, 사용자 요청): 급히 운영에 내는 것 없이 모든 단계를 마친 뒤 한 번에 올린다. OCI·DB 접근을 아직 받지 못해, 서버 없이 할 수 있는 코드 작업(B-1 모노레포 ~ B-11 배포 준비물)을 먼저 하고, 서버가 열리면 B-12 조사·백업 → B-13 베타 배포·확인 → B-14 운영 전환 → B-15 마무리. 긴급 수정(옛 B-0.5)은 삭제. 문서 맨 위에 요약 추가

### 2026-11-27 — 백엔드 개편 B-1: 모노레포 재구성, 검색 엔진 차단

- 사전 결정 전부 확정 (추천안). 추가 결정 10: 운영·베타가 같은 DB를 쓴다 (비용, 베타 테스트를 운영 데이터 그대로). 같은 DB를 쓸 때 지킬 것(베타 기간엔 옛 서버가 읽을 수 있는 모양으로만 저장, 정리 작업은 운영에서만)을 계획 문서에
- 사용자 수정 커밋 (`6b94ef1`): `.claude/settings.json`·`settings-fe.json`, `MODERNIZATION.md`를 archive로, 옛 `DIRECTORY_STRUCTURE.md` 삭제
- 지금 → 바꾼 후 (동작 변화는 검색 엔진 차단뿐)
  - 저장소: 루트 = 웹, `api.js`만 따로 → pnpm workspace 모노레포. `apps/web`(웹 전체 `git mv`: `src`·`public`·`env`·`index.html`·Vite·TS·shadcn 설정), `apps/server`(`api.js` + `package.json`: express 4·mongoose 8·dotenv·body-parser, 서버의 실제 버전은 B-12에서 확인), `packages/shared`(빈 패키지)
  - 루트 `package.json`: 웹 의존성 → `apps/web/package.json`. 루트는 린트·포맷 도구와 모든 패키지에 넘기는 스크립트(`pnpm -r --if-present`)만. 명령은 그대로 (`pnpm typecheck`·`test:run`·`lint`·`build`·`dev`)
  - 검색 엔진: 차단 없음 → `index.html`에 `noindex, nofollow` (`robots.txt`는 막지 않음: 막으면 noindex를 못 읽는다)
  - 설정: `.gitignore`(웹 env 경로), `.oxlintrc.json`(무시 경로를 모든 깊이로), `.prettierignore` 설명
- 문서: `docs/DIRECTORY_STRUCTURE.md`(웹·서버·공유 전체 구조와 둘 곳, 새로), `docs/LEARNING_NOTES.md`(B-1에서 배운 것, 새로), `CLAUDE.md`(모노레포 설명·명령·경로), 옮긴 `MODERNIZATION.md` 참조 경로
- 확인: 개발 서버는 이제 루트에서 `pnpm dev` (웹 폴더가 옮겨져 이전에 켜 둔 개발 서버는 다시 켜야 한다)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 223/223 / `pnpm lint` → 에러 0·경고 0 / `pnpm format:check` ✅ / `pnpm build` ✅ (JS 835kB, 그대로) / `node --check apps/server/api.js` ✅

### 2026-11-27 — 백엔드 개편 B-2: 지금 서버 동작을 테스트로 고정

- 사용자 수정 커밋 (`73ef918`): `.claude/settings.json`에 `git push` 금지 규칙 다시 추가
- 지금 → 바꾼 후 (서버 동작은 그대로)
  - `apps/server/api.js` 한 파일 → `app.js`(앱 조립: 스키마·미들웨어·API, `module.exports = app`) + `main.js`(`.env` → 앱 → DB 연결 → HTTPS 8081). `git mv`로 기록 이어짐. 실행은 `node main.js` (`pnpm --filter @semachi/server start`)
  - 로그 파일 위치: `__dirname/log.txt` 고정 → `LOG_FILE` 환경변수가 있으면 그곳 (운영은 그대로, 테스트는 임시 파일)
  - `body-parser` ^2.4 → ^1.20 (B-1에서 넣은 버전의 문제). `app.js`는 `bodyParser.json()`과 `express.json()`을 둘 다 쓰는데, 2.x가 본문을 읽은 뒤 Express 4 안의 1.x가 다시 읽으려다 "stream is not readable"로 **JSON 본문이 있는 요청이 모두 500**이었다. 운영이 동작하므로 운영도 1.x로 판단 (B-12에서 확인)
- 테스트 (`apps/server/test/`, Vitest + supertest + mongodb-memory-server, 실제 DB·포트 없음)
  - `teams`·`ensembles`·`notes`·`notices`·`middleware` 5개 파일, **96개**. API 23개(계획 문서의 "26개"는 잘못 센 것) 각각 정상·없는 대상·id 없음·잘못된 id·로그 줄, 모든 요청의 CORS·방문자 쿠키·요청 본문(JSON·form·깨진 JSON)·로그 파일(형식·5만 줄·파일 없음)·`GET /`
  - "현재 동작:"으로 고정한 이상한 동작: 어떤 Origin이든 쿠키와 함께 허용(S3), 로그 공개(S1), PIN 응답 포함(B3)·평문(S4)·시도 제한 없음(S2), 변경 API에 PIN 없음(B1), `DELETE /teams`(B2), 팀 없는 합주(B4), 검사 없는 저장(S5), PUT에서 빠진 필드는 지워짐(팀 name·desc·type, 합주 teamName 빼고 전부), 서버 시간대가 KST면 로그 시각에 9시간을 더 더함·UTC면 KST 오전 9시 전 시작 오늘 일회성 합주가 9시부터 빠짐(D1), 날적이 줄바꿈이 로그 줄을 나눔
  - 시간은 `Date`만 가짜로 (DB 타이머는 그대로), 서버 시간대 UTC 고정 (`vitest.config.mts`), 테스트용 마스터 PIN `9999` (루트 `.env`는 읽지 않음)
  - 로그는 응답 뒤 비동기로 파일을 읽고 다시 쓴다 → 앞 테스트의 덜 끝난 쓰기가 다음 테스트의 로그를 덮어써 가끔(10번에 1번쯤) 실패 → 로그를 비우기 전에 잠시 기다림(`resetLog`). 운영에서도 동시 요청이면 줄이 사라질 수 있다(O1)
  - 변형 검사 24/24 (별도 복사본 `.mutant/app.js`를 별칭으로 바꿔 끼움, 원본은 건드리지 않음): CORS·쿠키·로그 5만 줄·KST·목록 조건(`$lt`·`$gte`·0시)·연쇄 삭제·teamName 갱신·마스터 PIN·정렬·상태 코드·느슨한 비교 등
- 설정: `apps/server`의 `tsconfig.json`(지금은 테스트만 TS, `app.d.ts`로 `app.js` 타입), `vitest.config.mts`, 스크립트 `typecheck`·`test`·`test:run`(루트 `pnpm test:run`에 포함). `pnpm-workspace.yaml`의 `allowBuilds`(mongodb-memory-server 설치 스크립트 끔: 처음 테스트할 때 MongoDB 실행 파일 약 100MB를 받는다). 린트·포맷 제외 대상 `api.js` → `app.js`·`main.js`(B-3까지). 린트: 테스트의 `waitForLog`를 검사 함수로, `_id`·`__v` 허용

**검증:** `pnpm typecheck` ✅ (웹·서버) / `pnpm test:run` ✅ 웹 223 + 서버 96 (서버 10회 반복) / `pnpm lint` → 에러 0·경고 0 / `pnpm format:check` ✅ / `pnpm build` ✅ / `node --check` `app.js`·`main.js` ✅

### 2026-11-27 — 백엔드 개편 B-3: 파일 나누기, TypeScript, Express 5·Mongoose 9, 내 PC 개발 서버

커밋 넷. 단계마다 B-2 테스트가 그대로 통과하는지 확인했다
- ① `d5fd304` 파일 나누기 (JavaScript 그대로): `src/app.js` 한 파일 → `app`(조립, `createApp({ masterPin, logFile })`)·`config`·`main`·`models/`(4)·`routes/`(teams·ensembles·notes·notices·log-view)·`middleware/`(cors·visitor)·`lib/`(log·time). CommonJS → ES 모듈. 중복 JSON 해석기 중 `express.json`만 남기고 `body-parser` 삭제. 테스트는 앱을 `createApp`으로 만들고 마스터 PIN을 직접 넘긴다(환경변수에 기대지 않음). 본문 없는 요청 테스트 2개 추가(버전 올리기 전에 고정)
- ② `09b3038` TypeScript: `git mv`로 `.ts`, 타입만 추가. Node가 `.ts`를 바로 실행(type stripping): 가져오기에 `.ts` 확장자, 타입은 `import type`, `erasableSyntaxOnly`. `req.visitorId` 타입(`src/types/express.d.ts`). `packages/shared`의 `.ts`도 Node로 바로 가져올 수 있음을 임시로 확인 (사전 결정 3)
- ③ `d89884b` Express 4.22 → 5.3, Mongoose 8.24 → 9.13. 바뀐 것을 테스트가 잡음: Express 5는 본문 없는 요청의 `req.body`가 `undefined`라 본문 없는 PIN 확인이 400 대신 500 → Express 4처럼 빈 객체로. Mongoose 9의 더 엄격한 타입에 쿼리의 팀 id를 문자열로
- ④ 시작 검사·health·개발 서버
  - 지금 → 바꾼 후: 설정이 없어도·DB 연결에 실패해도 서버가 뜸 → 설정 오류·DB 연결 실패면 메시지를 남기고 바로 끝남(O4). HTTPS(인증서 경로 고정) → `TLS_KEY_FILE`·`TLS_CERT_FILE`이 있으면 HTTPS, 없으면 HTTP. 포트 8081 고정 → `PORT`(기본 8081, O6). 종료 신호(Ctrl+C·Docker 정지)에 하던 요청을 마치고 DB 연결을 닫음
  - `GET /health` (새로): DB에 연결돼 있으면 200 `{ status: 'ok' }`, 아니면 503. 방문자 쿠키·로그 없음 (다른 미들웨어보다 먼저)
  - 내 PC 개발 서버 `pnpm dev:server` (`apps/server/scripts/dev.ts`): 메모리 MongoDB(포트 27018, 데이터는 `apps/server/.dev-db/`에 남음, 처음엔 예시 데이터) + 서버 `http://localhost:8081`(`node --watch`, 코드를 고치면 서버만 다시 시작). 개발용 마스터 PIN `0000`·예시 팀 PIN `1234`. 데이터 지우기 `pnpm --filter @semachi/server dev:reset`
  - 웹을 개발 서버에 연결 `pnpm dev:local` (`vite --mode localserver`, `apps/web/env/.env.localserver`의 `VITE_API_URL=http://localhost:8081`)
  - `.gitignore`: `apps/server/.dev-db/`, `apps/server/log.txt`
- 확인: 개발 서버를 켜고 `/health`·`/teams`·`/ensembles`·마스터 PIN 확인·CORS 사전 요청(Origin `localhost:3000`, PUT)·날적이 남기기 → 다시 켜도 데이터 유지·예시 데이터 다시 넣지 않음, 코드 수정 시 서버만 다시 시작. `dev:local` 빌드 결과에 `localhost:8081`(운영 주소 없음). 설정 없이 실행 → "설정 오류" 종료 코드 1, 닿지 않는 DB → "DB에 연결하지 못했습니다" 종료 코드 1. 브라우저로 화면까지 본 것은 아님 (이 PC에 브라우저 자동화 도구가 없음) → 사용자 확인
- 린트: 서버는 node 환경, `console` 허용, async 핸들러 규칙 끔 (Express 5가 async 오류를 넘겨 준다)

**검증:** `pnpm typecheck` ✅ (웹·서버) / `pnpm test:run` ✅ 웹 223 + 서버 105 (서버 5회 반복) / `pnpm lint` → 에러 0·경고 0 / `pnpm format:check` ✅ / `pnpm build` ✅

### 2026-11-27 — 백엔드 개편 B-4: CI (GitHub Actions), 내 PC 서버를 운영 DB에

- CI: `.github/workflows/ci.yml` (새로). 모든 브랜치 푸시·PR마다 작업 "검사": pnpm 설치(`packageManager`) → Node(`.nvmrc`) → `pnpm install --frozen-lockfile` → 린트 → 포맷 → 타입 → 테스트(웹 223 + 서버 105) → 빌드. pnpm 내려받기와 MongoDB 실행 파일(서버 테스트용)은 캐시. 같은 브랜치에 새로 푸시하면 이전 실행은 멈춤, 권한은 읽기만
- Node: `.nvmrc` 24 → 26 (최신 LTS 26.13, 사전 결정 2). 이 PC는 아직 24.14 → 사용자가 설치 (CI가 Node 26에서 처음 확인한다. 임시 Node 26을 받아 미리 돌려 보려 했으나 권한 규칙에 막혀 하지 않음)
- 리눅스(CI)는 파일 이름 대소문자를 구분한다: git의 파일 188개 이름이 디스크와 대소문자까지 같고, 글꼴 경로도 맞음을 확인
- 내 PC 서버를 운영 DB에 (사용자 허용): `pnpm dev:server:prod` (`apps/server/scripts/dev-prod-db.ts`). 루트 `.env`의 MONGO_DB·MASTER_PIN만 읽어(값은 출력하지 않음) `http://localhost:8081`로 켠다. 활동 로그는 `apps/server/.dev-db/log-prod-db.txt`. 웹은 `pnpm dev:local`. Claude는 실행하지 않았다 (실제 DB 연결). 이 PC에서 운영 DB에 접속할 수 있는지는 모른다 (DB 위치는 B-12)
- 남은 것 (사용자): `api3.0` 푸시 → Actions 탭에서 첫 결과, `main`·`dev` 브랜치 보호 (저장소 관리자 권한), PC의 Node 26 설치

**검증:** 워크플로 YAML 읽기 ✅ / `pnpm typecheck` ✅ / `pnpm lint` → 에러 0·경고 0 / `pnpm format:check` ✅ / 첫 CI 실행은 푸시 후

### 2026-11-27 — 백엔드 개편 B-5: 보안·운영 수정

- B-4: 사용자가 `api3.0`을 푸시해 첫 CI 통과 ✅ (브랜치 보호·`dev` 병합은 사용자가 나중에)
- 항목마다 커밋 하나. 지금 → 바꾼 후 (운영 반영은 모든 단계를 마친 뒤 B-14)
  - S1 `2104304`: `GET /`가 활동 로그 전체를 누구에게나 HTML로 → 404 (관리자 보기는 B-7)
  - B2 `326a90b`: 인증 없는 `DELETE /teams`(모든 팀 삭제) → 404
  - S3 `f6fe94b`: 어떤 주소의 웹이든 쿠키와 함께 허락 → `CORS_ORIGINS`에 적은 주소만 (기본 없음: 운영·베타는 같은 주소). 개발 서버는 `http://localhost:3000`
  - 쿠키 `25f9953`: 방문자 쿠키 `SameSite=None` → `Lax` (같은 사이트에만)
  - S2 `cd526f2`: PIN 확인 시도 제한 없음 → 틀린 시도만 세어 같은 IP·같은 대상(팀·날적이) 15분 10번, 같은 IP 전체 30번이면 429 `{ error: 'Too many PIN attempts' }` + `Retry-After` (express-rate-limit). `TRUST_PROXY` 설정(프록시 뒤의 진짜 IP, B-11에서 정함)
  - O5 `9920793`: 삭제가 찾고 → 지우기(조회 두 번) → 한 번(`findByIdAndDelete`), 팀 삭제는 팀 먼저. id가 없으면 DB에 묻지 않고 404. 먼저 "id 없음·빈 id면 아무것도 지우지 않는다" 테스트를 고정한 뒤 바꿈 (응답은 그대로)
  - O6 `0a0bb55`: 보안 헤더(helmet, CORP는 same-site), `ensembles.teamId` 인덱스, 네 모델에 `createdAt`·`updatedAt` (새 문서는 둘 다, 옛 문서는 고칠 때 `updatedAt`만)
- 개발 서버 `66405bb`: 이미 켜 둔 개발 서버가 있으면 "이미 쓰고 있는 포트" 안내 후 종료 (전에는 메모리 MongoDB가 알기 어려운 오류)
- 진행 중 발견: 확인하려고 개발 서버를 켰을 때, 사용자가 13:06에 켜 둔 `pnpm dev:server`가 8081을 쓰고 있었다 (끄지 않음). 그 서버는 CORS_ORIGINS를 넣기 전에 켜져 환경변수가 없어(코드는 자동으로 다시 읽지만 환경변수는 켤 때 것) 지금 웹(localhost:3000)의 요청을 막는다 → 사용자가 다시 켜야 함. 그 서버에 읽기 요청(`/health`·`/notices`·공지 PIN 확인 31번)을 보내 그 서버의 PIN 시도 제한이 15분 동안 걸렸다 (다시 켜면 풀림)
- 웹: 429면 지금 문구 "PIN을 확인하지 못했어요. 잠시 후 다시 시도해 주세요."가 나온다 (웹 테스트 그대로)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 웹 223 + 서버 124 / `pnpm lint` → 에러 0·경고 0 / `pnpm format:check` ✅ / `pnpm build` ✅

### 2026-11-27 — 내 PC 개발 서버 명령 이름 바꿈 (사용자 요청)

- 사용자는 내 PC에서도 운영 DB의 실제 데이터를 보려 했는데 `pnpm dev:server`(예시 데이터)를 켜 "예시밴드"가 보였다 → 기본을 운영 DB로
- `pnpm dev:server`: 메모리 DB + 예시 데이터 → **운영 DB** (`scripts/dev-prod-db.ts`, 옛 `dev:server:prod`)
- 예시 데이터: `pnpm dev:server:sample` (`scripts/dev.ts` → `dev-sample.ts`), 지우기 `pnpm --filter @semachi/server dev:sample:reset`
- Claude는 운영 DB에 닿는 `dev:server`를 실행하지 않는다 (`CLAUDE.md`)
- 사용자가 켜 보니 `DB에 연결하지 못했습니다: querySrv ECONNREFUSED`. 운영 DB는 MongoDB Atlas(`mongodb+srv://`, 인터넷에서 접속하는 클라우드 DB). DB가 아니라 DB 주소를 찾는 DNS 조회에서 실패했다: 이 PC의 Node는 DNS 서버를 `127.0.0.1`로 알고 있는데 응답이 없다(윈도우 자체 `nslookup`은 통신사 DNS로 성공, 공용 DNS 8.8.8.8로도 성공). → 서버에 `DNS_SERVERS` 설정(있으면 `dns.setServers`), `dev:server`는 이 PC의 DNS로 찾지 못할 때만 공용 DNS(8.8.8.8·1.1.1.1)로. DB에는 Claude가 접속하지 않고 DNS 조회만 확인

### 2026-11-27 — 백엔드 개편 B-6: PIN (서버에서 확인·응답에서 제거·해시 준비, 틀린 횟수, 마스터 PIN 관리)

- 사용자 요청 두 가지: PIN이 틀릴 때 갑자기 막지 말고 틀린 횟수 "(7/10)"을, 마스터 PIN은 관리자 화면에서 관리
- 서버 `f54c467` — 지금 → 바꾼 후
  - B1: 팀 수정·삭제, 합주 수정·삭제, 날적이 삭제, 공지 올리기·삭제가 PIN을 보지 않음 → 요청 본문의 `pin`(팀·글 PIN 또는 마스터 PIN)이 맞아야, 없거나 틀리면 403 `{ error: 'Wrong PIN' }`. 합주는 그 합주 팀의 PIN (팀이 없으면 마스터 PIN만). 합주 추가는 그대로 (웹에 PIN 단계가 없다)
  - B3: `GET /teams`·`GET /notes`에 PIN → 없음 (모델 `select: false`, 확인할 때만 `+pin`)
  - S4: 새 PIN 평문 저장 → `PIN_HASH=true`면 해시(Node `scrypt`, `scrypt$N$r$p$소금$해시`). 기본은 꺼짐 (같은 DB의 옛 서버가 평문 비교, 사전 결정 10). 확인은 평문·해시 둘 다, `timingSafeEqual`. 기존 평문을 바꾸는 `scripts/hash-pins.ts` (기본 세어 보기, `--apply`, 이미 해시면 건너뜀, 값은 출력하지 않음). 메모리 DB로만 테스트, 실행은 B-14
  - 틀린 횟수: 응답 헤더 `Pin-Attempts: 틀린 횟수/한도` (같은 대상 10·IP 전체 30 중 빠듯한 쪽). 대상별 횟수를 확인 API와 변경 API가 함께 센다 (`team:<id>` 등, 하나의 제한기). CORS로 `Pin-Attempts`·`Retry-After`를 웹에 공개
  - 마스터 PIN: `.env`의 `MASTER_PIN`만 → DB `settings`의 `masterPin`(해시)이 있으면 그것, 없으면 `.env`. `PUT /admin/master-pin { currentPin, newPin }`(숫자 4자리, 시도 제한). 매번 DB에서 읽어 운영·베타가 바로 같이 따른다
- 웹 `6501cbf` — 지금 → 바꾼 후
  - PIN 단계에서 맞은 PIN을 변경 요청에 함께 보냄 (`PinStep`의 `onConfirm(pin)`, 수정 Drawer는 열 때 받은 PIN을 들고 있음, 공지 올리기는 글을 쓰는 동안)
  - PIN이 틀리면 "PIN이 맞지 않아요. 다시 입력해 주세요" → 뒤에 "(7/10)"
  - 너무 많이 틀리면 "PIN을 확인하지 못했어요…" 알림 → 그 자리에 "너무 많이 틀렸어요. N분 뒤에 다시 입력해 주세요"
- 진행 중 알게 된 것: 사용자가 켜 둔 `pnpm dev:server`(운영 DB)가 코드를 고칠 때마다 새 서버 코드로 다시 켜졌다. Claude는 그 서버에 요청을 보내지 않았다. 새 코드가 켜지면서 운영 DB에 생길 수 있는 것: 빈 `settings` 컬렉션 (Mongoose가 모델을 준비할 때 만든다. 데이터는 바뀌지 않고 옛 서버는 무시)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 웹 228 + 서버 144 / `pnpm lint` → 에러 0·경고 0 / `pnpm format:check` ✅ / `pnpm build` ✅

### 2026-11-27 — B-6 뒤: PIN 틀린 횟수를 팀별로·맞추면 0으로, 합주 잡기도 PIN, 디렉터리 문서 자세히

- 사용자 지적: 맞는 PIN을 넣어도 쌓인 틀린 횟수가 지워지지 않는다. 그렇다고 한 번 맞추면 모두 지우면, 새 팀을 만들어 그 PIN으로 지워 가며 끝없이 시도할 수 있다 → 팀별로 따로 세고 맞추면 그 팀만 0으로 (날적이는 전체를 하나로)
- Claude 의견으로 더한 것 (사용자 제안 + 하나): IP 전체 30번은 맞춰도 그대로. 마스터 PIN은 어느 팀 자리에서든 통과하므로, "내 팀에서 마스터 PIN 후보 9번 → 내 팀 PIN으로 0으로"를 되풀이하면 대상별 제한만으로는 끝없이 찾을 수 있다
- 서버 `cc9c239` — 지금 → 바꾼 후
  - 틀린 횟수: IP·대상(팀·날적이 글 하나하나·합주 하나하나·마스터) 10번과 IP 전체 30번, 맞아도 지워지지 않음 → 대상(팀 — 그 팀 합주의 잡기·수정·삭제도 그 팀으로, 날적이 전체, 마스터 — 공지·관리자) 10번은 맞추면 그 대상만 0으로, IP 전체 30번은 그대로. 없는 팀 id로 확인해도 틀린 시도. 한도에 닿으면 처음 틀린 때부터 15분까지 맞는 PIN도 확인하지 않고 429
  - express-rate-limit → `lib/pin-guard.ts` (서버 메모리 표, IPv6는 앞 64비트로 셈). 요청 전에 세는 라이브러리로는 "DB에서 합주를 읽은 뒤 그 팀으로 세기"와 "맞추면 그 대상만 지우기"가 안 된다. 의존성 삭제
  - `POST /ensemble`(합주 잡기): PIN 없음 → 그 팀의 PIN 또는 마스터 PIN. 없는 팀은 마스터 PIN만
- 웹 `4c8694b` — 지금 → 바꾼 후 (사용자 결정)
  - 팀 정보의 "합주 잡기"·소모임/일정 정보의 "일정 잡기": 바로 합주 잡기 Drawer → 같은 Drawer 안의 PIN 단계 → 맞으면 팀이 고정된("팀은 바꿀 수 없어요") 합주 잡기 Drawer
  - 합주판(빈 칸·"같은 시간에 다른 팀 합주 잡기"): 다 고른 뒤 "합주 잡기" → 같은 Drawer 안에서 고른 팀의 PIN → 맞으면 바로 저장. 저장에 실패하면(그새 4개 겹침 등) 입력 화면으로 돌아가 이유를 보인다
- 관리자 화면 들어가기: 마스터 PIN으로 (사용자 결정, B-7에서 만든다)
- 문서: `docs/DIRECTORY_STRUCTURE.md`에 "서버 자세히" (요청이 지나가는 길, 미들웨어·라우터·핸들러·모델 같은 용어, 폴더·파일별 역할, scripts의 종류). 사용자 요청: 백엔드를 처음 보는 컴퓨터공학 고학년 수준

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 웹 229 + 서버 150 / `pnpm lint` → 에러 0·경고 0 / `pnpm format:check` ✅ / `pnpm build` ✅

## 남은 일

> 발견된 문제 전체(백엔드·버그·구조·View·환경)는 `docs/ISSUES.md`에 ID별로 정리했다. 아래 표는 린트 기준 요약이다.

### 린트 지적 사항 (3단계 완료 시점, 모두 View 쪽 코드)

View 개편 때 해당 코드와 함께 정리한다. 로직 층은 0건.

| 규칙 | 건수 | 위치 | 관련 ID |
|---|---|---|---|
| `react(jsx-key)` ❌ | 2 | 완료 화면 Drawer 2곳 | V2 |
| `react(set-state-in-effect)` ❌ | 3 | 공용 `Drawer`, 팀 이름 Drawer 2곳 | V3 |
| `react-hooks/exhaustive-deps` | 16 | **모두 Drawer** (컨테이너·App·로직 0건) | F9 |
| `react(exhaustive-effect-dependencies)` | 1 | 공용 `Drawer`의 resize effect | F9 |
| `no-unused-vars` | 25 | 모두 View 파일(Drawer·layout·common): 쓰지 않는 import·styled 컴포넌트 | F11 등 |

### 1단계 잔여물 ✅ 모두 처리
- ✅ `index.html`: CRA 안내 주석, description 문구, `lang="en"`
- ✅ `public/manifest.json`: CRA 기본 앱 이름
- ✅ `VITE_API_URL` 선언만 있고 실제로는 `constants`에 하드코딩된 URL 사용
- ✅ 프론트엔드 env를 백엔드 `.env`에서 분리
- ✅ Vite config loader 경고 (`"type": "module"` 대신 `vite.config.mts`로 해결)
- ✅ 폰트 TTF → woff2, `@font-face` `src` 중복
- ✅ 디버그용 `console.log`

### 적용 예정 (상세는 `docs/archive/MODERNIZATION.md`)

| 항목 | 대체 대상 | 시점 |
|---|---|---|
| ~~React 19 (+ `@ant-design/v5-patch-for-react-19`)~~ | ~~React 18~~ | ✅ 완료 (2026-11-19) |
| ~~Zod~~ | ~~수동 응답 정제~~ | ✅ 3단계 (항목 단위 응답 검증) |
| ~~TanStack Query~~ | ~~`context/fetch` (`fetchData`, `xxxExists` 사전 확인)~~ | ✅ 3단계 |
| ~~Zustand~~ | ~~`context/drawer`·`team`·`ensemble`~~ | ✅ 3-9 · V-6 |
| ~~Tailwind CSS v4~~ | ~~styled-components~~ | ✅ V-1 도입, V-6 제거 완료 |
| ~~shadcn/ui~~ | ~~antd~~ (`PinInput` → input-otp, 알림은 Sonner) | ✅ V-1 도입, V-6 제거 완료 |
| ~~React Compiler~~ | ~~수동 `useCallback`/`useMemo`~~ | ✅ V-1 (2026-11-23) |

### 환경
- 로컬 Node가 24.14.0인데, jsdom 31의 일부 하위 의존성이 `^24.15.0`을 요구해 설치 시 engine 경고가 뜬다(동작에는 문제 없음). → B-4에서 `.nvmrc`를 26(최신 LTS)으로. PC의 Node를 26으로 바꾸면 경고도 사라진다

### 다음 순서
1. ~~2단계 TS 전환~~ ✅ 완료
2. ~~로직 개선 전 `context/fetch` 정제 로직에 characterization test 작성~~ ✅ 완료 (`src/context/fetch.test.tsx`)
3. ~~3단계 내부 로직 개선~~ ✅ 완료 (2026-11-23)
4. ~~View 개편~~ ✅ 완료 (2026-11-26, 기록: `docs/archive/VIEW_REDESIGN_PLAN.md`, 디렉터리 구조: `docs/DIRECTORY_STRUCTURE.md`)
5. 남은 것: 백엔드 대기 항목(ISSUES B1·B3, 팀 자동 삭제, 반복 종료 합주의 실제 삭제), 번들 줄이기 제안(ISSUES V15)
