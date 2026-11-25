# 마이그레이션 진행 기록

> 단계 정의와 규칙은 `CLAUDE.md`, 추가 최신화 항목의 근거는 `docs/MODERNIZATION.md` 참고.

## 현황

| 단계 | 상태 |
|---|---|
| 1. CRA → Vite | ✅ 완료 (잔여물 처리 완료) |
| 2. JS → TS 100% 전환 | ✅ 완료 (2026-11-20, `src`의 JS 0개, 계획: `docs/archive/TS_MIGRATION_PLAN.md`) |
| 3. 내부 로직 개선 | ✅ 완료 (2026-11-23, 계획: `docs/archive/LOGIC_IMPROVEMENT_PLAN.md`. 3-6은 폐기하고 알림 기능 삭제) |
| View 개편 | 🔄 V-2 합주표 진행 중: 합주판 카드 1~7차(사용자 수정 반영), 8차 합주 정보 Drawer·9~10차 수정·11차 합주 잡기 Drawer·12~14차·15~20차 PIN 단계·21~24차 합주 잡기 Drawer·25차 완료 (2026-11-25, 브랜치 `ui3.0`, 계획: `docs/VIEW_REDESIGN_PLAN.md`) |

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
- team·ensemble Context는 Zustand로 옮기지 않고 View 개편 때 폼 로컬 상태로 흡수 → `docs/MODERNIZATION.md`에 "View 개편 체크리스트" 추가
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

- 3단계에서 넘긴 일: `LOGIC_IMPROVEMENT_PLAN.md` "View 개편 때 넘겨주는 것", View 개편 체크리스트 (현재 `docs/VIEW_REDESIGN_PLAN.md`)

**검증:** `pnpm typecheck` ✅ / `pnpm test:run` ✅ 93/93 / `pnpm test:coverage` ✅ / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 에러 5·경고 42

### 2026-11-23 — View 개편 계획 수립

- `docs/VIEW_REDESIGN_PLAN.md` 작성: 진행 방식(기반 작업 → 기능 단위 → 일괄 정리, 사용자 확정), 사전 결정 8개(V-0에서 확정), 단계 V-0 ~ V-7, 기능 단계에서 할 일, 멈추고 보고할 조건, 작업마다 갱신할 문서, 공통 검증
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

### 적용 예정 (상세는 `docs/MODERNIZATION.md`)

| 항목 | 대체 대상 | 시점 |
|---|---|---|
| ~~React 19 (+ `@ant-design/v5-patch-for-react-19`)~~ | ~~React 18~~ | ✅ 완료 (2026-11-19) |
| ~~Zod~~ | ~~수동 응답 정제~~ | ✅ 3단계 (항목 단위 응답 검증) |
| ~~TanStack Query~~ | ~~`context/fetch` (`fetchData`, `xxxExists` 사전 확인)~~ | ✅ 3단계 |
| Zustand | ~~`context/drawer`~~ ✅ 3-9 / `context/team`·`ensemble`은 Zustand가 아니라 폼 로컬 상태로 | View 개편 |
| Tailwind CSS v4 | styled-components | View 개편 (V-1에서 도입, 기능 단계마다 대체) |
| shadcn/ui | antd (`PinInput` → input-otp), **알림 기능 새로 추가**(Sonner, 기존 `useMessage`는 3-6 폐기 때 삭제) | View 개편 |
| ~~React Compiler~~ | ~~수동 `useCallback`/`useMemo`~~ | ✅ V-1 (2026-11-23) |

### 환경
- 로컬 Node가 24.14.0인데, jsdom 31의 일부 하위 의존성이 `^24.15.0`을 요구해 설치 시 engine 경고가 뜬다(동작에는 문제 없음). Node 24 최신으로 업데이트 권장.

### 다음 순서
1. ~~2단계 TS 전환~~ ✅ 완료
2. ~~로직 개선 전 `context/fetch` 정제 로직에 characterization test 작성~~ ✅ 완료 (`src/context/fetch.test.tsx`)
3. ~~3단계 내부 로직 개선~~ ✅ 완료 (2026-11-23)
4. View 개편: 계획 `docs/VIEW_REDESIGN_PLAN.md` (V-0·V-1 ✅, 다음은 V-2 합주표)
