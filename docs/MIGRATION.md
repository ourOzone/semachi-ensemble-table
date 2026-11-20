# 마이그레이션 진행 기록

> 단계 정의와 규칙은 `CLAUDE.md`, 추가 최신화 항목의 근거는 `docs/MODERNIZATION.md` 참고.

## 현황

| 단계 | 상태 |
|---|---|
| 1. CRA → Vite | ✅ 완료 (잔여물 처리 완료) |
| 2. JS → TS 100% 전환 | ✅ 완료 (2026-11-20, `src`의 JS 0개, 계획: `docs/TS_MIGRATION_PLAN.md`) |
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
1. ~~2단계 TS 전환~~ ✅ 완료
2. ~~로직 개선 전 `context/fetch` 정제 로직에 characterization test 작성~~ ✅ 완료 (`src/context/fetch.test.tsx`)
