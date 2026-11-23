# View 개편 계획 (styled-components → Tailwind v4, antd → shadcn/ui)

> View 개편 동안 작업을 지시받을 때마다 이 문서를 기준으로 한다. (작성: 2026-11-23)
> 3단계(로직) 결과는 `docs/archive/LOGIC_IMPROVEMENT_PLAN.md`, 문제 목록은 `docs/ISSUES.md`(V·F·E 항목), 진행 기록은 `docs/MIGRATION.md`.

## 진행 방식 (확정)

**기반 작업 한 번 → 기능 단위로 하나씩 새로 만들기 → 끝까지 손대지 않은 부분 일괄 정리**

- 일괄 전환(모두 먼저 바꾸고 나중에 수정)은 하지 않는다. Drawer 약 30개는 어차피 새로 만들 코드라 옮기는 비용이 버려지고, 전환하는 동안 흐름 테스트(antd 내부에 의존, ISSUES E4)를 쓸 수 없다.
- 기능 단위(공지 → 한마디 → 합주표 → 팀)로 진행한다. Drawer 단일화는 기능 하나의 여러 Drawer를 하나로 합치는 작업이라 컴포넌트가 아니라 기능이 단위다.
- **각 단계가 끝나면 앱 전체가 동작해야 한다.** 새 코드(shadcn·Tailwind)와 옛 코드(antd·styled-components)가 함께 있는 기간이 있다.

## 사전 결정 (V-0에서 확정)

| # | 항목 | 선택지 | 추천 | 이유 |
|---|---|---|---|---|
| 1 | 공존 기간 CSS 충돌 | (a) CSS 레이어 순서 지정 + antd `StyleProvider`의 `layer` / (b) 전환 기간에 Tailwind preflight 끄기 | **(a)** | Tailwind v4의 기본 스타일 초기화(preflight)가 antd 스타일을 덮어쓸 수 있다. 레이어 순서(`theme, base, antd, components, utilities`)를 정하면 둘 다 의도대로 적용된다. 문제가 크면 (b)로 |
| 2 | 단일 Drawer 컴포넌트 | (a) shadcn **Sheet**(오른쪽에서 열림) / (b) shadcn **Drawer**(vaul, 아래에서 올라옴) | **(a)** | 지금처럼 오른쪽 패널(모바일 전체 폭·PC 767px)이라 사용 흐름이 유지된다. 모바일 중심으로 바꾸려면 (b) |
| 3 | 폼 | react-hook-form + Zod (shadcn Form) / 로컬 `useState` | **react-hook-form + Zod** | shadcn Form의 표준. 요청 본문 검증(Zod)을 폼 검증과 같이 쓸 수 있다. `context/team`·`ensemble`은 이걸로 대체하고 삭제 |
| 4 | 아이콘 | lucide-react / `@ant-design/icons` 유지 | **lucide-react** | shadcn 기본. 마지막 정리 때 `@ant-design/icons` 제거 |
| 5 | 달력 | shadcn Calendar(react-day-picker + date-fns 한국어) / 직접 구현 | **shadcn Calendar** | 날짜 계산 로직은 dayjs(`lib/`) 그대로 두고, 컴포넌트 경계에서 `Date` ↔ `Dayjs`만 변환 |
| 6 | 알림 | shadcn **Sonner**(토스트) | **Sonner** | 앱 루트에 `<Toaster />` 하나. 3-6 폐기 때 알림을 삭제했으므로 새로 추가한다 (ISSUES V6) |
| 7 | React Compiler | 기반 작업에서 켜기 / 나중에 | **기반 작업에서 켜기** | 새 코드를 처음부터 수동 메모이제이션 없이 쓰는 것이 가장 저렴 (`MODERNIZATION.md` 10번 판단 메모) |
| 8 | 디자인 방향 | 지금 화면을 새 도구로 재현 / 새 디자인 | **사용자 결정** | 색(`theme.ts`)은 토큰으로 옮겨 유지하는 것을 권장. 화면 구성은 기능 단계마다 제안하고 승인을 받는다 |

## 단계

| 단계 | 내용 | 관련 ID |
|---|---|---|
| V-0 | 사전 결정 확정 | |
| V-1 | **기반 작업**: 아래 "V-1 상세" | V6 |
| V-2 | **공지**: 공지 버튼·목록·등록·삭제 → 단일 Drawer | V1·V2 일부 |
| V-3 | **한마디**: 한마디 목록·등록·삭제 | |
| V-4 | **합주표**: 합주표 그리드, 합주 정보·수정·미루기·삭제 → 단일 Drawer, 달력·시간 선택 | F6, F10 |
| V-5 | **팀**: 팀 버튼, 팀 정보·추가·수정·삭제, 합주 추가, 소모임 정보 → 단일 Drawer. 규모가 커서 필요하면 V-5a(팀) / V-5b(합주 추가·소모임)로 나눈다 | F11, V7 |
| V-6 | **일괄 정리**: 아래 "V-6 상세" | V1~V5, E4, F9 |
| V-7 | **마무리**: 린트·커버리지·번들 비교, 문서 | |

### V-1 상세 (기반 작업)
- Tailwind v4(`@tailwindcss/vite`) 설치, 진입 CSS 파일, 사전 결정 1의 레이어 순서
- shadcn/ui 초기화: `components.json`, 컴포넌트 위치 `src/components/ui/`, `cn()` 유틸 (`src/lib/utils.ts`)
- 디자인 토큰: `src/styles/theme.ts`의 색·팀 색상(`teamColors`·`eventColors`)을 CSS 변수(Tailwind `@theme`)로 옮긴다. 공존 기간에는 `theme.ts`도 유지 (styled 쪽이 사용)
- 폰트: `GlobalStyle`의 `@font-face`(woff2)를 CSS로 옮길 준비 (실제 제거는 V-6)
- 알림: `<Toaster />`를 앱 루트에 두고, 조회 실패(TanStack Query `QueryCache.onError`)를 연결. 변경(mutation) 알림은 기능 단계마다 그 기능의 훅에 연결
- React Compiler (사전 결정 7)
- 테스트 헬퍼: 렌더링 헬퍼에 `<Toaster />`, 새 UI용 공용 헬퍼(역할 기반 조회) 추가. 기존 antd용 헬퍼(`findEnabledButton`·`findDrawer`)는 V-6까지 유지

### 기능 단계(V-2 ~ V-5)에서 할 일
1. **화면 구성안을 먼저 제안하고 승인을 받는다** (Drawer 하나에 무엇을 넣는지, 입력 순서, 완료·실패 표시). 동작이 바뀌는 부분은 목록으로 밝힌다
2. 새 컴포넌트를 shadcn + Tailwind로 만든다. 서버 요청은 3단계의 mutation 훅(`src/queries/`)을 호출한다. 성공·실패 알림(Sonner)을 그 기능에 연결한다
3. 폼 입력값은 폼 로컬 상태(react-hook-form)에 둔다. 그 기능이 쓰던 `context/team`·`context/ensemble` 값과 `orgXxx` 복원 로직을 쓰지 않게 한다
4. 그 기능의 옛 Drawer와 완료 화면 Drawer("락앤롤!")를 삭제하고, `src/types/drawer.ts`의 `DrawerId`에서 해당 ID를 뺀다
5. 그 기능의 흐름 테스트를 새 UI 기준(역할·이름 기반 조회)으로 다시 쓴다. `lib/`·`queries/` 테스트는 그대로 통과해야 한다
6. PIN 흐름: 백엔드 B1(변경 API의 서버 측 PIN 검증)이 바뀌기 전까지는 폼 안에서 `check-xxx-pin`으로 확인한 뒤 저장한다. 바뀌었다는 통보가 오면 그때 저장 요청 하나로 합친다

### V-6 상세 (일괄 정리)
- 끝까지 손대지 않은 View: `layout`(Header·Footer), `common`(Drawer·OkButton·PinInput·Tooltip·Container), App의 본문 밀기(`openedDrawers` 기반 translate), `GlobalStyle`·`media`·`styled.d.ts`
- 제거: `antd`, `@ant-design/icons`, `@ant-design/v5-patch-for-react-19`(+ `src/index.tsx`의 import), `styled-components`, `src/styles/theme.ts`(토큰으로 이전 완료 후), `context/team`·`context/ensemble`·`ContextProvider`, 호환용 `useDrawerContext` 별칭
- `stores/drawer`를 단일 Drawer 구조에 맞게 줄인다 (스택이 필요 없으면 "열린 Drawer 하나 + 대상 id")
- antd 의존 테스트 헬퍼(`findEnabledButton`·`findDrawer`·달력 `td[title]`) 정리 (E4), App 테스트의 허용 경고 목록(`KNOWN_WARNINGS`) 정리

### 멈추고 보고할 조건
- `lib/`·`queries/`·`api/` 테스트가 깨진다 (View 작업이 로직을 바꿨다는 뜻)
- 로직 층(`src/lib`·`src/queries`·`src/api`·`src/stores`)을 바꿔야만 진행할 수 있다 → 무엇을 왜 바꿔야 하는지 보고
- antd와 Tailwind의 스타일 충돌을 레이어 순서로 해결하지 못한다
- 화면 구성에서 승인받지 않은 결정이 필요하다

## View 개편 체크리스트 (3단계에서 넘긴 일)

> 3단계는 "View 개편 후에도 남는 층"만 정리하고, Drawer·폼에 묶인 정리는 여기로 넘겼다. (`MODERNIZATION.md`에서 옮김)
> 근거: `docs/archive/LOGIC_IMPROVEMENT_PLAN.md` 사전 결정 1·5번, `docs/ISSUES.md`의 View 항목.

- [ ] **Drawer 단일화:** API 요청 하나에 Drawer 하나. 그 안에서 모든 값을 입력하고, 완료 화면 Drawer("락앤롤!" 등)는 삭제
- [ ] **`context/team`·`context/ensemble` 제거:** 단계 사이 입력값 전달용이다. 폼 로컬 상태(shadcn/ui Form = react-hook-form + Zod)로 옮긴 뒤 삭제한다. Zustand로 옮기지 않는다
  - 함께 사라지는 것: 입력 한 글자마다 다시 렌더링(P3), 수정 취소용 `orgXxx` 복제(P5, 폼 초기값으로 대체), `setTeamStates()`·`setEnsembleStates()` 초기화 호출
- [ ] **`stores/drawer` 축소:** 3-9에서 Context → Zustand로 옮긴 Drawer 스택을 단일 Drawer 구조에 맞게 줄이고, 호환용 `useDrawerContext` 별칭을 삭제한다
- [ ] **PIN 흐름:** 지금은 PIN 단계 Drawer가 존재 확인과 `check-xxx-pin`을 따로 호출한다(P2 잔여, F6). 백엔드 B1 대응(변경 API에서 PIN 검증)에 맞춰 폼 submit 하나로 합친다
- [ ] **(트렌디한) 알림 기능 새로 추가:** 3-6을 폐기하면서 기존 알림(`useMessage`)을 프로젝트에서 삭제했다(2026-11-23). 지금은 성공·실패·"이미 삭제됨"을 사용자에게 알리지 않는다
  - 권장: shadcn/ui의 **Sonner**(토스트)를 앱 루트에 하나 두고, mutation 훅의 `onSuccess`·`onError`(404 → "이미 삭제됨")와 TanStack Query `QueryCache.onError`(조회 실패)에서 호출
  - 이전 알림 문구는 git 기록(`8af5868` 이전 코드)에서 참고할 수 있다
- [ ] **폼은 3단계의 mutation 훅을 호출한다** (`useUpdateTeam().mutateAsync(...)` 등). 캐시 갱신은 훅이 처리한다 (알림은 위 항목에서 새로 연결)
- [ ] **Drawer 쪽 잔여 이슈:** F9(Drawer의 `exhaustive-deps`), F10, F11, V1~V5, V7, E4
- [ ] **테스트:** Drawer 흐름 테스트를 새 UI 기준으로 다시 작성한다. `lib/`·`queries/` 테스트는 유지한다
- [ ] **React Compiler 도입 판단** (`MODERNIZATION.md` 10번)

## 스타일링: Tailwind CSS v4 (styled-components 대체) 📌

> `MODERNIZATION.md` 8번에서 옮김

- styled-components는 공식적으로 **유지보수 모드**다. 런타임 CSS-in-JS라 React 19 / RSC 흐름과 맞지 않는다.
- 지금 코드에는 `.ant-drawer-close svg`처럼 **antd 내부 클래스를 덮어쓰는 코드와 `!important`가 많다.** UI 라이브러리 교체와 함께 정리된다.
- 현재 사용처: styled-components를 쓰는 파일 44개. 반응형 헬퍼 `src/styles/media.ts`(767px 기준), 전역 스타일·폰트 `src/styles/GlobalStyle.ts`, 색 `src/styles/theme.ts`
- 새 코드 규칙: 스타일은 Tailwind 클래스로, 조건부 클래스는 `cn()`으로. 색·간격은 토큰(`@theme`)을 쓰고 값을 직접 쓰지 않는다. 반응형은 Tailwind 기본 breakpoint를 쓰되 지금의 767px 기준이 필요하면 토큰으로 정의

## UI 라이브러리: shadcn/ui (antd 대체) 📌

> `MODERNIZATION.md` 9번에서 옮김

- Radix/Base UI + Tailwind 기반이고, 컴포넌트 코드를 직접 소유한다 (`src/components/ui/`).
- 전제 조건: **React 19** ✅, 기본 alias `@/` ✅
- 알림은 기존 `useMessage`를 삭제했으므로(3-6 폐기) Sonner로 **새로 추가**한다.
- 현재 antd 사용처와 대체 후보:

| antd (import 횟수) | 대체 |
|---|---|
| `Button` (18) | Button |
| `Input`·`Input.TextArea` (9), `InputRef`·`GetRef` | Input · Textarea (ref는 React 19의 `ref` prop) |
| `PinInput`(자체, `Input` 기반) | **input-otp** (InputOTP) |
| `Drawer` (공용 `common/Drawer`) | Sheet (사전 결정 2) |
| `Segmented` (2, 팀 정보 탭) | Tabs 또는 ToggleGroup |
| `Calendar` + `ConfigProvider`(한국어) (2) | Calendar (react-day-picker, 사전 결정 5) |
| `Result` (2, 완료 화면) | 삭제 (완료 화면 Drawer 제거) |
| `Divider` (3) | Separator |
| `Tooltip` (1) | Tooltip |
| `Layout`(Header) (1) | 일반 `header` 요소 |
| `@ant-design/icons` (11개 파일) | lucide-react (사전 결정 4) |

## 작업마다 갱신할 문서

작업(단계 또는 지시 하나)이 끝날 때마다 아래를 확인하고, 해당하는 것을 **같은 작업 안에서** 갱신한다.

| 문서 | 언제 | 무엇을 |
|---|---|---|
| `docs/MIGRATION.md` | 매 작업 | 작업 로그에 날짜·변경 내용·**동작 차이**·검증 결과. 상단 "현황"의 View 개편 상태 |
| `docs/VIEW_REDESIGN_PLAN.md` (이 문서) | 매 작업 | 단계·체크리스트 ✅, 사전 결정 확정 내용, 진행 중 바뀐 계획 |
| `docs/ISSUES.md` | 처리하거나 새로 발견할 때 | 처리한 ID에 ✅와 날짜·방법, 새 문제는 ID를 붙여 추가 (심각도·확인 방법·처리 시점), 린트 현황 표 |
| `docs/MODERNIZATION.md` | 상태가 바뀔 때 | 8·9·10번 항목의 상태 표시(📌 → 🔄 → ✅), "진행 순서" |
| `CLAUDE.md` | 작업 규칙이 바뀔 때 | 예: 새 컴포넌트 위치, styled-components 사용 금지 시점, 테스트 규칙, 명령어 |
| `docs/archive/LOGIC_IMPROVEMENT_PLAN.md` | 3단계 결과(훅·구조)를 바꿀 때만 | 바뀐 내용과 이유 (원칙적으로 로직 층은 바꾸지 않는다) |

- 커밋은 기능 단위로 나누고, 동작이 바뀌는 커밋은 메시지에 "지금 → 바꾼 후"를 적는다. 형식: `feat(notice): ...`, `refactor(ui): ...`, `build: ...`, `chore: ...`, `docs: ...`
- 백엔드 관련 내용은 검토하지 않는다 (`CLAUDE.md` 작업 범위). 백엔드 변경 통보가 오면 그때 PIN 흐름 등 반영 범위를 다시 본다

## 공통 검증 (작업마다)

- `pnpm typecheck` / `pnpm test:run` / `pnpm format:check` / `pnpm build`
- `pnpm lint`: 에러·경고가 늘지 않아야 한다 (View 개편 시작 시점: 에러 5·경고 42, 모두 옛 View 코드). 새 코드는 0건
- 테스트를 스크립트로 판정할 때는 `CLAUDE.md`의 테스트 규칙(기준선 먼저, `Tests N failed`로 판정)을 따른다
- 화면이 바뀌는 작업은 개발 서버로 실제 렌더링을 확인한다
