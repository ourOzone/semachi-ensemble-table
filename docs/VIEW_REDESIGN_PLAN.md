# View 개편 계획 (styled-components → Tailwind v4, antd → shadcn/ui)

> View 개편 동안 작업을 지시받을 때마다 이 문서를 기준으로 한다. (작성: 2026-11-23)
> 3단계(로직) 결과는 `docs/archive/LOGIC_IMPROVEMENT_PLAN.md`, 문제 목록은 `docs/ISSUES.md`(V·F·E 항목), 진행 기록은 `docs/MIGRATION.md`.

## 진행 방식 (확정)

**기반 작업 한 번 → 기능 단위로 하나씩 새로 만들기 → 끝까지 손대지 않은 부분 일괄 정리**

- 일괄 전환(모두 먼저 바꾸고 나중에 수정)은 하지 않는다. Drawer 약 30개는 어차피 새로 만들 코드라 옮기는 비용이 버려지고, 전환하는 동안 흐름 테스트(antd 내부에 의존, ISSUES E4)를 쓸 수 없다.
- 기능 단위(합주표 → 팀 → 한마디 → 공지)로 진행한다. Drawer 단일화는 기능 하나의 여러 Drawer를 하나로 합치는 작업이라 컴포넌트가 아니라 기능이 단위다.
  - 순서 (사용자 결정, 2026-11-23): 합주표·팀을 먼저 만들며 디자인 컨셉을 잡고, 한마디·공지는 그 컨셉을 따라 마지막에 만든다
- **각 단계가 끝나면 앱 전체가 동작해야 한다.** 새 코드(shadcn·Tailwind)와 옛 코드(antd·styled-components)가 함께 있는 기간이 있다.

## 디자인 원칙 (사용자 결정, 모든 단계에 적용)

### 반응형: UX는 모바일, UI는 모바일·PC 모두
- 사용자의 약 90%가 모바일로 접속한다. **사용 흐름(UX)은 모바일 기준**으로 설계한다: 한 손 조작, 터치 대상 최소 44px, 아래에서 올라오는 Drawer(사전 결정 2), 화면 아래쪽에 주요 버튼
- **화면 배치(UI)는 모바일·PC 모두 불편함이 없어야 한다.** 폴더블(펼친 화면)·태블릿처럼 가로가 넓은 화면이 늘었으므로, 넓은 화면에서 모바일 화면을 그대로 늘리지 않는다 (지나치게 긴 줄·버튼, 텅 빈 여백, 가운데 좁은 기둥만 남는 배치를 피한다)
- 스타일은 모바일 우선으로 쓴다: 접두사 없는 클래스 = 모바일, `sm:`·`md:`·`lg:`로 넓은 화면을 덧붙인다
- 기능 단계의 화면 구성안에는 **화면 폭별 배치**를 함께 제안한다. 확인 폭: 360px(작은 폰) · 390~430px(일반 폰) · 약 600~900px(폴더블 펼침·태블릿 세로) · 1024px 이상(PC)
- 화면이 바뀌는 작업은 개발 서버에서 위 폭들로 확인한다 (공통 검증)

### 팀 색 20종은 바꾸지 않는다
- `src/styles/theme.ts`의 `teamColors` 20종은 이 서비스의 아이덴티티다. **색 값·개수·순서를 바꾸지 않는다** (순서가 바뀌면 팀마다 배정되는 색이 바뀐다, `lib/board`의 `buildColorMap`)
- 예외 (사용자 요청, V-2): 노랑 `#fdd835` → `#f1d041` (흰 글씨가 보이도록 채도만 조금 낮춤, 겨자색까지는 아님). 같은 노랑을 쓰는 소모임 색(베소)도 함께. 그 외 색은 그대로
- V-1에서 토큰으로 옮길 때 값을 그대로 옮긴다. 새 디자인의 다른 색(배경·글자·강조색 등)은 이 팀 색과 어울리도록 정한다
- 소모임 색 `eventColors`도 팀 색과 같은 팔레트에서 나온 값이라 그대로 옮긴다

## 사전 결정 (V-0 ✅ 확정, 2026-11-23)

| # | 항목 | 선택지 | 확정 | 이유 |
|---|---|---|---|---|
| 1 | 공존 기간 CSS 충돌 | (a) CSS 레이어 순서 지정 + antd `StyleProvider`의 `layer` / (b) 전환 기간에 Tailwind preflight 끄기 | **(a)** (추천안) | Tailwind v4의 기본 스타일 초기화(preflight)가 antd 스타일을 덮어쓸 수 있다. 레이어 순서(`theme, base, antd, components, utilities`)를 정하면 둘 다 의도대로 적용된다. 문제가 크면 (b)로 |
| 2 | 단일 Drawer 컴포넌트 | (a) shadcn **Sheet**(오른쪽에서 열림) / (b) shadcn **Drawer**(vaul, 아래에서 올라옴) | **(b)** (사용자 선택) | 사용자 대부분이 모바일이라 아래에서 올라오는 Drawer가 한 손 조작에 맞다. 넓은 화면에서는 폭을 제한하고 가운데에 두는 등 PC에서 어색하지 않게 한다. 넓은 화면의 구체 배치(예: PC에서는 Dialog로 바꾸는 반응형 방식)는 V-2 화면 구성안에서 제안한다 |
| 3 | 폼 | react-hook-form + Zod (shadcn Form) / 로컬 `useState` | **react-hook-form + Zod** (추천안) | shadcn Form의 표준. 요청 본문 검증(Zod)을 폼 검증과 같이 쓸 수 있다. `context/team`·`ensemble`은 이걸로 대체하고 삭제 |
| 4 | 아이콘 | lucide-react / `@ant-design/icons` 유지 | **lucide-react** (추천안) | shadcn 기본. 마지막 정리 때 `@ant-design/icons` 제거 |
| 5 | 달력 | shadcn Calendar(react-day-picker + date-fns 한국어) / 직접 구현 | **shadcn Calendar** (추천안) | 날짜 계산 로직은 dayjs(`lib/`) 그대로 두고, 컴포넌트 경계에서 `Date` ↔ `Dayjs`만 변환 |
| 6 | 알림 | shadcn **Sonner**(토스트) | **Sonner** (추천안) | 앱 루트에 `<Toaster />` 하나. 3-6 폐기 때 알림을 삭제했으므로 새로 추가한다 (ISSUES V6). 모바일에서 아래 Drawer와 겹치지 않는 위치(위쪽)에 둔다 |
| 7 | React Compiler | 기반 작업에서 켜기 / 나중에 | **기반 작업에서 켜기** (추천안) | 새 코드를 처음부터 수동 메모이제이션 없이 쓰는 것이 가장 저렴 (`MODERNIZATION.md` 10번 판단 메모) |
| 8 | 디자인 방향 | 지금 화면을 새 도구로 재현 / 새 디자인 | **새 디자인** (추천안 + 사용자 조건) | 위 "디자인 원칙"(반응형, 팀 색 유지)을 지킨다. 디자인 컨셉은 V-2(합주표) 화면 구성안에서 제안해 정하고, 이후 단계는 그 컨셉을 따른다. 화면 구성은 기능 단계마다 제안하고 승인을 받는다 |

## 단계

| 단계 | 내용 | 관련 ID |
|---|---|---|
| V-0 ✅ | 사전 결정 확정 (2026-11-23) | |
| V-1 ✅ | **기반 작업**: 아래 "V-1 상세" (2026-11-23) | V6(조회 실패 알림) |
| V-2 🔄 | **합주표**: 합주표 그리드, 합주 정보·수정·미루기·삭제 → 단일 Drawer, 달력·시간 선택. **디자인 컨셉을 이 단계에서 정한다** (색·글꼴·간격·모서리·Drawer 모양, 화면 폭별 배치). 아래 "V-2 진행" | F6, F10 |
| V-3 | **팀**: 팀 버튼, 팀 정보·추가·수정·삭제, 합주 추가, 소모임 정보 → 단일 Drawer. 규모가 커서 필요하면 V-3a(팀) / V-3b(합주 추가·소모임)로 나눈다. 합주 추가의 달력·시간 선택은 V-2의 컴포넌트를 다시 쓴다 | F11, V7 |
| V-4 | **한마디**: 한마디 목록·등록·삭제 (V-2·V-3에서 정한 컨셉을 따른다) | |
| V-5 | **공지**: 공지 버튼·목록·등록·삭제 → 단일 Drawer (V-2·V-3에서 정한 컨셉을 따른다) | V1·V2 일부 |
| V-6 | **일괄 정리**: 아래 "V-6 상세" | V1~V5, E4, F9 |
| V-7 | **마무리**: 린트·커버리지·번들 비교, 문서 | |

### V-1 상세 (기반 작업) ✅ 2026-11-23
- [x] Tailwind v4.3(`@tailwindcss/vite`), 진입 CSS `src/styles/index.css`, 사전 결정 1의 레이어 순서 → 아래 "공존 기간 규칙"
- [x] shadcn/ui 초기화(`shadcn@4.23`, Radix 기반, 스타일 `radix-nova`): `components.json`, `src/components/ui/`(button·drawer·sonner), `cn()`(`src/lib/utils.ts`, shadcn 공식 `cn` 패키지를 다시 내보냄)
- [x] 디자인 토큰: 팀 색 20종·소모임 색 11종을 `@theme`의 `--color-team-0~19`·`--color-event-0~10`으로 (값·순서 그대로, `src/styles/tokens.test.ts`가 `theme.ts`와 같은지 확인). 그 외 색·모서리는 shadcn 기본값으로 두고 V-2에서 컨셉을 정할 때 새로 정한다
- [x] 단일 Drawer: shadcn Drawer(vaul 1.1.2) 추가. vaul은 마지막 배포가 2024-12이고 React 19를 지원하며, 내부는 계속 유지되는 Radix Dialog다. jsdom에서 열기·입력·닫기 확인(`drawer.test.tsx`). **모바일 키보드에 입력칸이 가려지는지는 실제 폼이 생기는 V-2에서 확인** (headless 브라우저로는 확인 불가)
- [x] 반응형·회귀 확인: 설치된 Chrome + Playwright(`playwright-core`, 작업 폴더 밖)로 화면 폭별 스크린샷을 찍어 픽셀 비교. 아래 "옛 화면 확인 결과"
- [x] 글꼴: 옛 `GlobalStyle`(styled-components)을 `src/styles/legacy.css`로 옮기고 삭제. 새 코드용 `--font-sans`는 나눔스퀘어 네오(300·400·700, 같은 woff2). shadcn이 넣은 Geist 글꼴은 한글이 없어 제거
- [x] 알림: `<Toaster />`(위쪽 가운데, 밝은 테마, `next-themes` 제거)를 앱 루트에. 조회 실패는 `QueryCache.onError` → `lib/notify`의 `notifyQueryError()` (같은 id로 띄워 여러 조회가 동시에 실패해도 하나). 변경 알림은 기능 단계마다
- [x] React Compiler: `babel-plugin-react-compiler` 1.0 + `@rolldown/plugin-babel` (플러그인 내장 Rust판은 실험 단계라 Babel판). 옛 코드 포함 전체에 적용, 기존 테스트 93개 통과
- [x] 테스트 헬퍼: `renderWithTheme`·`renderApp`에 `<Toaster />`, `createTestQueryClient()`는 앱과 같은 `createQueryClient({ retry: false })`, 새 UI용 `findDialog(제목)`. jsdom 보정은 ISSUES E7

#### 공존 기간 규칙 (V-1에서 정함, V-6까지 지킨다)
- **CSS 레이어 순서:** `theme, base, legacy, antd, components, utilities` (뒤가 우선). `index.html`의 `<style>`과 `src/styles/index.css` 두 곳에 같은 순서로 선언한다
  - 레이어 순서는 **문서에서 레이어 이름이 처음 나온 순서**로 정해진다. antd는 스타일을 컨테이너 맨 앞에 넣으므로, head에 넣으면 antd가 가장 낮은 레이어가 된다 → `StyleProvider`에 `layer`와 `container={document.body}`, 아이콘 스타일은 `IconProvider value={{ layer: 'antd' }}`(없으면 달력의 중첩 `ConfigProvider`가 head 맨 앞의 아이콘 스타일을 `@layer antd`로 바꿔 같은 문제가 생김) (`src/index.tsx`)
  - `legacy` = 옛 전역 스타일(`legacy.css`). preflight보다 뒤라 옛 화면이 그대로다. preflight가 바꾸는 `line-height`(html·버튼)는 legacy에서 브라우저 기본값으로 되돌렸다
  - styled-components의 컴포넌트 스타일은 레이어 밖(가장 우선)이지만 옛 요소에만 붙는다
- **새 코드는 `ui` 클래스 요소 안에 둔다** (V-2에서 바꿈). legacy의 요소 규칙(`* { font-size; font-family: Regular; margin; padding }`, 버튼 `line-height`)은 `.ui` 안에 적용되지 않고, `.ui`가 글꼴(나눔스퀘어 네오)·기본 글자 크기(14px)·줄 간격(1.5)을 정한다 (`index.css` base). Drawer처럼 body로 포털되는 새 컴포넌트도 그 루트에 `ui`를 붙인다 (예: Sonner)
- **Tailwind 간격·글자 크기·모서리는 px로 정의했다** (`--spacing: 4px`, `--text-*`, `--radius`). legacy가 html 글자 크기를 화면 폭에 따라 16·12·10px로 바꿔(옛 화면의 rem 기준) rem이면 새 코드도 함께 줄어든다. 화면 폭 기준(`sm`·`md`)은 미디어 쿼리라 영향 없음. V-6에서 rem으로 되돌린다
- **새 코드에 styled-components·antd를 쓰지 않는다.** 스타일은 Tailwind, 컴포넌트는 `src/components/ui/`
- shadcn 컴포넌트 추가: `pnpm dlx shadcn@4.23.0 add <이름>` 후 `pnpm format`. 생성된 파일을 읽고 필요 없는 의존성(예: `next-themes`)이 들어오면 정리한다
- 알림 문구·함수는 `src/lib/notify.ts`에 모은다

#### 옛 화면 확인 결과 (V-1 전후 픽셀 비교)
- 비교: 메인(전체 페이지)·팀 추가·공지·팀 정보·달력(합주 추가)·PIN 입력 × 390px·1280px, 개발 서버와 프로덕션 빌드 모두
- 결과: 모두 0픽셀 차이. 단 PC 폭에서 antd Drawer를 연 화면은 포커스 외곽선 색만 다름(1,832픽셀, ISSUES V8)
- 과정에서 찾아 고친 것: ① preflight의 `line-height: 1.5`로 팀 버튼이 커짐 ② 버튼이 헤더의 `line-height: 64px`을 물려받아 아이콘 이동 ③ antd 레이어가 맨 앞으로 가 달력 화살표 버튼의 테두리·배경이 사라짐 (위 레이어 규칙)

### V-2 진행 (합주표)

**진행 방식 (사용자 결정, 2026-11-23):** V-2부터는 **사용자가 디자인 컨셉(시안)을 먼저 제안 → 그대로 만든다 → 사용자가 상세 수정**을 요청하는 식으로 진행한다. 아래 "기능 단계에서 할 일" 1번(구성안 제안)은 사용자 시안이 있으면 대신한다. 시안에 없는 부분(데이터상 애매한 점 등)만 묻거나 보고한다

- [x] **1차: 합주판 카드 (2026-11-23).** 클릭 동작은 아직 옛 Drawer를 연다 (사용자 지시: 동작은 나중에)
  - 카드: 주 제목("11월 16일 – 22일") + 이전 주·오늘·다음 주 → 팀 목록 → 주 단위 캘린더. 옛 Teams·Board 카드 두 개를 하나로 (`src/components/schedule/`)
  - 주 이동: 이번 주부터 12주 뒤까지 (`MAX_WEEK_OFFSET`), 지난 주는 보여주지 않음
  - 팀 목록: 한 줄로 줄이고 오른쪽이 흐려짐, "전체 N"(N = 팀 수, 팀 아닌 일정 제외)을 누르면 화면 폭 전체로 펼침. 팀 → "팀 추가" → 팀 아닌 일정 순 (펼치면 팀 아닌 일정은 새 줄) → 2차에서 바뀜
  - 캘린더: 흰 바탕 + 한 시간마다 가로선만, 오늘 열은 옅은 파랑, 오늘 날짜는 파란 원. 시간칸(30분) 높이 모바일 22px·PC 26px → 2차에서 바뀜
  - 블록: 솔리드 팀 색 + 흰 글씨(굵기 500, 11~12px, 블록 높이에 맞춰 최대 3줄). 1시간 30분 이상이고 폭이 72px 이상이면 이름 한 줄 + 둘째 줄에 시간. 폭 20px 미만이면 글씨 없이 색 띠만 → 2차에서 바뀜
  - 블록 상태: 기본(솔리드) / 팀 아닌 일정(줄무늬) / 이번 주 쉼(팀 색 점선 테두리 + 팀 색 취소선 글씨) / 겹침(가로로 나눔: `lib/calendar`의 `assignLanes`)
  - 데이터: 백엔드 변경 없음. 서버의 합주(요일·시간칸·반복·다음 날짜)에서 주마다 보이는 합주와 상태를 계산한다 (`lib/calendar`의 `getOccurrence`·`toWeekSchedule`, 로직 층에 새 파일로 추가하고 기존 함수는 바꾸지 않음). 한계는 ISSUES V9
- [x] **2차: 사용자 상세 수정 반영 (2026-11-23).** 합주판이 예쁜지 보기 위해 주변(헤더·배경)도 함께 손봄
  - 공통: PC 글자를 전체적으로 키움(제목 28px, 팀 15px, 요일 14px·날짜 20px, 블록 이름 14px·시간 11px, 시간 라벨 13px). 모바일은 팀 목록만 13 → 14px
  - 색 (토큰 `index.css`): 페이지 바탕 `--color-page` `#f2f3f5`(이전 연한 파랑 회색 `#f5f8ff`), 글씨 `--color-ink` `#18181b`, 오늘 `--color-today` `#18181b`(검정 원) + `--color-today-tint`(아주 옅은 회색 열). `index.html`·`manifest.json`의 테마 색도 같이
  - 헤더: 새 코드로 다시 만듦 (`layout/Header`, antd Layout·styled 제거). 검은 제목, 블러 없이 페이지 바탕색, 스크롤을 내리면 들어가고 올리면 나옴 (`hooks/useHideOnScroll`). 옛 `useScrollPosition` 삭제
  - 팀 목록: PC(md 이상)는 "전체" 버튼 없이 모두 펼침. 모바일은 좌우로 밀어 보고, 밀기 시작하면 "전체" 버튼이 아이콘만 남고 맨 왼쪽으로 돌아오면 글자가 다시 나옴. "전체" 버튼은 옅은 회색 바탕 + 짙은 회색 테두리 + 검은 글씨. 펼치고 접을 때 높이가 부드럽게 바뀜
  - 캘린더: 시간칸 높이 PC 26 → 30px. 주를 바꾸면(오늘 포함) 옆에서 살짝 밀려 들어옴(0.2초, 동작 줄이기 설정이면 없음)
  - 블록 이름: 말줄임표(…) 없이 블록 높이만큼의 줄에서 뚝 끊김. 2개 겹침까지는 모바일에서도 항상 이름이 보임(좁으면 한 글자씩 세로로). 3개 이상 겹치면 1024px 미만(모바일·태블릿)에서는 색 띠만
  - 시간(PC, 1시간 30분 이상): 이름보다 작은 11px. 자리를 이름보다 먼저 잡아 항상 보이게(이름 줄 수를 그만큼 줄임). 겹쳐서 아주 좁으면 시작·끝 시각을 두 줄로 쌓음. 3개 이상 겹치면 1024px 이상에서만
  - 쉼(점선): 바탕을 비워 뒤의 가로선이 보이게
- [x] **3차: 사용자 상세 수정 반영 (2026-11-23)**
  - 카드 순서: 팀 목록 → 주 제목·이동 → 캘린더 (날짜 행을 캘린더에 붙임)
  - 오늘 표시: 검정 → 차분한 파랑 `#3e63dd`(원) + 옅은 파랑 열 배경 (위 팀 색들과 어울리게, 사용자 요청)
  - "전체" 버튼 테두리: 짙은 회색 → 바탕보다 확실히 짙은 회색(neutral-400)
  - 애니메이션의 흰 깜빡임 제거: 주 이동·팀 목록 펼침에서 투명도(fade) 애니메이션을 빼고, 주 이동은 옆으로 살짝(16px) 미는 것만, 펼침은 높이만
  - 시간 표시(PC): 1시간 30분 이상 → 1시간 이상 (30분 시작이라서가 아니라 1시간 블록이라 안 나왔다). 30분 블록은 이름 한 줄 높이뿐이라 시간 없음
  - 잘리는 이름 줄: 다음 줄 글자의 윗부분이 살짝 비치던 것 → 줄 간격 1.25 → 1.4, 자르는 위치를 줄 경계보다 0.15em 위로 (기기마다 픽셀 반올림이 달라도 여유)
- [x] **4차: 사용자 상세 수정 반영 (2026-11-23)**
  - "전체" 버튼: 펼친 동안은 "× 닫기". 테두리를 더 연한 회색(neutral-300)으로
  - 팀 목록을 밀어 왼쪽이 "전체" 버튼 밑으로 들어가는 동안 왼쪽도 오른쪽과 같은 폭으로 흐리게
  - 캘린더 맨 아래에 24 라벨과 가로선 (표의 끝 표시)
  - 오늘 표시: 파랑 → 파란빛이 은은한 회색(슬레이트) `#4a5568`
  - 큰 카드(공지·합주판·한마디) 모서리: 24px → **스쿼클**(아이폰 앱 아이콘처럼 곡률이 이어지는 모서리, `corner-shape: squircle`, 28px). 지원하지 않는 브라우저(사파리 등)는 일반 둥근 모서리 18px. 새 코드는 `rounded-card`(index.css), 옛 styled 코드는 `src/styles/cardRadius.ts`
- [x] **5차: 사용자 상세 수정 반영 (2026-11-24)**
  - 스쿼클을 메인 화면 전체로: 팀 칩·"전체"·"팀 추가", 주 이동·"오늘" 버튼, 오늘 날짜 표시, 합주 블록, 헤더 드라이브 버튼, 한마디 추가 버튼·카드. 새 코드는 `squircle` 유틸리티(index.css, 지원 브라우저에서만 `corner-shape: squircle`), 옛 코드는 `styles/cardRadius.ts`의 `squircle()`. 알약 모양(rounded-full)은 스쿼클이면 끝이 덜 둥근 둥근 사각형이 된다
  - 누를 수 있는 것: `.ui` 안의 버튼·링크는 손가락 커서(index.css base). 마우스를 올리면 색 버튼(팀 칩·합주 블록)은 살짝 진하게, 흰 버튼은 옅은 회색 바탕, 쉼 블록은 옅은 회색 바탕. 누르면 살짝 작아짐(블록 제외). 마우스 올림 효과는 마우스가 있는 기기에서만 (Tailwind `hover:`)
- [x] **6차: 사파리(아이폰)에서도 스쿼클 (2026-11-24)** → 7차에서 되돌림
  - 원인: `corner-shape`는 Chrome 계열(139+)만 지원하고 사파리는 미지원·일정 미발표. 아이폰은 모든 브라우저가 사파리 엔진이라 모바일에서 브라우저와 관계없이 안 보였다
  - 대체 방식: 같은 곡선(x⁴ + y⁴ = 1)의 SVG를 9분할 마스크(`-webkit-mask-box-image`, 사파리·Chrome 지원)로 씌움. 테두리 없는 요소는 `squircle`, 실선 테두리 요소는 테두리·바탕을 두 겹 가상 요소로 그리는 `squircle-border`, 큰 카드는 `rounded-card` + 그림자를 바깥에서 그리는 `card-shadow`(마스크가 그림자를 자르므로). 옛 코드는 `cardRadius.ts`의 `squircle`·`squircleBordered`·`squircleShadow`
  - 따라 그릴 수 없는 것: 점선 테두리(팀 추가, 쉼 블록, 한마디 추가 버튼)는 사파리에서 일반 둥근 모서리 (`squircle-native`·`squircleNative`). 파이어폭스는 둘 다 미지원이라 전부 일반 둥근 모서리
  - 빌드 함정: `@supports (A) and (-webkit-mask-box-image: none)` 꼴은 빌드의 CSS 최적화(lightningcss)가 접두사를 떼어 사파리에서 조건이 거짓이 된다(개발 서버에서는 정상) → `not ((A) or (not (B)))` 꼴로 쓰고 `styles/squircle.test.ts`로 고정
  - 확인: Playwright WebKit(사파리 엔진)에서 지원 조건을 강제로 끈 채 개발 서버·빌드 결과 모두 마스크 적용·화면 확인, Chrome은 기존 `corner-shape` 그대로
- [x] **7차: 스쿼클 범위 축소, 사파리 대체 방식 제거 (2026-11-24, 사용자 결정)**
  - 6차의 SVG 마스크 대체 방식이 모바일에서 "전체" 버튼처럼 크기가 바뀌는 요소에서 크게 깨져, 고치지 않고 되돌림
  - 남긴 기준 (사용자): ① 모양이 고정돼 있고 사파리 등에서 일반 둥근 모서리로 보여도 어색하지 않음 ② 스쿼클이면 예쁜 곳 → 큰 카드 3개, 합주 블록, 한마디 추가 버튼·카드. `corner-shape` 지원 브라우저(Chrome 계열)에서만 스쿼클
  - 원래대로: 팀 칩·"전체"·"팀 추가"·"오늘"·화살표·오늘 날짜·헤더 버튼 (알약·원 모양은 스쿼클이면 모양 자체가 바뀜). 5차의 손가락 커서·마우스 올림 효과는 그대로
- [x] **8차: 합주 정보 Drawer (2026-11-24, 사용자 시안)**
  - 아래에서 올라오는 Drawer(vaul), 아래로 끌어내리면 닫힘. PC는 가운데 520px 폭으로 같은 모양 (`schedule/EnsembleInfoDrawer.tsx`)
  - 머리: 팀의 지금 색 바탕에 팀 이름 버튼(누르면 팀 정보 Drawer로 바뀜, 팀 아닌 일정은 버튼 없이 이름만)·닫기·요일과 시간·반복 여부. 본문: 쉬는 날(미뤘을 때)·다음 합주(날짜·시간·길이·며칠 뒤)·미루기·미루기 취소·수정·삭제. 일회성은 "합주 날짜" + "매주 반복으로 바꾸기". 맨 아래 "같은 시간에 다른 팀 합주 잡기"(팀만)
  - 미루기 취소 (새 기능): 여러 번 미뤘어도 한 번에, 미루지 않았다면 다음 합주였을 날짜(오늘부터 처음 오는 그 요일)로 되돌린다 (`lib/calendar`의 `getRegularNextDate`·`getEnsembleSchedule`). 캘린더도 여러 번 미룬 주를 모두 "쉼"으로 표시 (이전: 마지막 주만)
  - PIN·입력 단계는 아직 옛 Drawer: 그 Drawer가 쌓이면 이 Drawer는 내려가고, 닫히면 다시 올라온다 (`stores/drawer`의 `BOTTOM_DRAWERS`. 이 Drawer는 본문을 밀지 않음). 미루기 취소·반복으로 바꾸기는 미루기 PIN Drawer를 문구만 바꿔 재사용 (`unskipEnsemble`·`repeatEnsemble`)
  - 시안과 다른 점: 반복 합주의 "12/20(일)까지"는 끝나는 날짜가 저장되지 않아(반복 합주의 `due`는 항상 2099-12-31) "매주 반복"만. "같은 시간에 다른 팀 합주 잡기"는 팀을 고르는 화면이 없어 아직 "준비 중" 알림만 (ISSUES V11)
- [x] **9차: 사용자 수정 요청 (2026-11-24)**
  - 모바일(아이폰 사파리)에서 Drawer 아래 브라우저 도구 막대 쪽 여백이 팀 색 → 흰색. Drawer를 위로 끌어올리면 아래가 뚫려 합주판이 비침 → 흰색으로 가림. 원인: Drawer 바탕을 팀 색으로 칠하고 `overflow-hidden`을 걸어, vaul이 Drawer 아래에 바탕색을 이어 붙이는 `::after`가 팀 색이거나 잘렸다. Drawer는 흰 바탕(잘라내지 않음), 팀 색은 머리에만, 손잡이는 머리 위에 겹쳐 그림
  - 합주판 점선 블록: 이름 취소선 제거. 미래로 잡은 일회성 합주도 오늘부터 그 날짜 전까지 같은 요일·시간에 점선 (이전: 그 날짜에만 보임)
  - 점선의 세 경우(반복 미룸, 반복 미래 시작, 일회성 미래)는 서버 데이터로 1·2를 구분할 수 없다 → 정보 Drawer 문구 개선안을 사용자에게 제안 (적용 보류)
- [ ] 10차 이후: 사용자 상세 수정 → 수정·미루기·삭제의 PIN·입력 단계를 새 Drawer로 (V-2 본 작업)
- [ ] V-2 끝에 정리: 옛 합주표용 `toBoard`·`useBoard`·`isSkipped`·`EnsembleBoard`·`EnsembleBlock` (새 캘린더로 대체되어 테스트에서만 쓰임)

#### 나중에 할 일 (사용자 요청 메모)
- **합주 겹침은 최대 4개.** 등록·수정할 때 그 시간에 이미 4개가 겹쳐 있으면 막는다 (2026-11-23 요청, 합주 등록·수정 Drawer를 만드는 V-2 본 작업·V-3에서). 반복 합주는 여러 주에 걸쳐 겹침을 세야 한다. 서버에서도 막으려면 백엔드 변경이 필요하다 (백엔드에 전달할지는 사용자 판단)

### 기능 단계(V-2 ~ V-5)에서 할 일
1. **화면 구성안을 먼저 제안하고 승인을 받는다** (Drawer 하나에 무엇을 넣는지, 입력 순서, 완료·실패 표시, **화면 폭별 배치**). 동작이 바뀌는 부분은 목록으로 밝힌다. V-2부터 사용자 시안이 있으면 그것으로 대신한다
2. 새 컴포넌트를 shadcn + Tailwind로 만든다. 서버 요청은 3단계의 mutation 훅(`src/queries/`)을 호출한다. 성공·실패 알림(Sonner)을 그 기능에 연결한다
3. 폼 입력값은 폼 로컬 상태(react-hook-form)에 둔다. 그 기능이 쓰던 `context/team`·`context/ensemble` 값과 `orgXxx` 복원 로직을 쓰지 않게 한다
4. 그 기능의 옛 Drawer와 완료 화면 Drawer("락앤롤!")를 삭제하고, `src/types/drawer.ts`의 `DrawerId`에서 해당 ID를 뺀다
5. 그 기능의 흐름 테스트를 새 UI 기준(역할·이름 기반 조회)으로 다시 쓴다. `lib/`·`queries/` 테스트는 그대로 통과해야 한다
6. PIN 흐름: 백엔드 B1(변경 API의 서버 측 PIN 검증)이 바뀌기 전까지는 폼 안에서 `check-xxx-pin`으로 확인한 뒤 저장한다. 바뀌었다는 통보가 오면 그때 저장 요청 하나로 합친다

### V-6 상세 (일괄 정리)
- 끝까지 손대지 않은 View: `layout`(Footer. Header는 V-2에서 새로 만듦), `common`(Drawer·OkButton·PinInput·Tooltip·Container), App의 본문 밀기(`openedDrawers` 기반 translate), `media`·`styled.d.ts`
- 공존 기간 장치 제거: `src/styles/legacy.css`와 `legacy` 레이어, `src/styles/cardRadius.ts`(옛 코드용 스쿼클), `index.html`의 레이어 선언 중 `antd`, `src/index.tsx`의 `StyleProvider`·`IconProvider`, 테스트 setup의 vaul 외 antd용 보정(`matchMedia` 등은 필요 여부 확인)
- `theme.ts` 제거 전: `lib/board`의 `buildColorMap`이 `theme.teamColors`를 쓴다 → 팀 색 상수를 로직 층으로 옮겨야 한다 (로직 변경이므로 먼저 보고. `tokens.test.ts`도 그 상수와 비교하도록)
- 제거: `antd`, `@ant-design/icons`, `@ant-design/cssinjs`, `@ant-design/v5-patch-for-react-19`(+ `src/index.tsx`의 import), `styled-components`, `src/styles/theme.ts`(토큰으로 이전 완료 후), `context/team`·`context/ensemble`·`ContextProvider`, 호환용 `useDrawerContext` 별칭
- `stores/drawer`를 단일 Drawer 구조에 맞게 줄인다 (스택이 필요 없으면 "열린 Drawer 하나 + 대상 id")
- antd 의존 테스트 헬퍼(`findEnabledButton`·`findDrawer`·달력 `td[title]`) 정리 (E4), App 테스트의 허용 경고 목록(`KNOWN_WARNINGS`) 정리

### 멈추고 보고할 조건
- `lib/`·`queries/`·`api/` 테스트가 깨진다 (View 작업이 로직을 바꿨다는 뜻)
- 로직 층(`src/lib`·`src/queries`·`src/api`·`src/stores`)을 바꿔야만 진행할 수 있다 → 무엇을 왜 바꿔야 하는지 보고
- antd와 Tailwind의 스타일 충돌을 레이어 순서로 해결하지 못한다
- 화면 구성에서 승인받지 않은 결정이 필요하다
- 팀 색 20종을 바꿔야만 디자인이 성립한다 (바꾸지 않고 보고)

## View 개편 체크리스트 (3단계에서 넘긴 일)

> 3단계는 "View 개편 후에도 남는 층"만 정리하고, Drawer·폼에 묶인 정리는 여기로 넘겼다. (`MODERNIZATION.md`에서 옮김)
> 근거: `docs/archive/LOGIC_IMPROVEMENT_PLAN.md` 사전 결정 1·5번, `docs/ISSUES.md`의 View 항목.

- [ ] **Drawer 단일화:** API 요청 하나에 Drawer 하나. 그 안에서 모든 값을 입력하고, 완료 화면 Drawer("락앤롤!" 등)는 삭제
- [ ] **`context/team`·`context/ensemble` 제거:** 단계 사이 입력값 전달용이다. 폼 로컬 상태(shadcn/ui Form = react-hook-form + Zod)로 옮긴 뒤 삭제한다. Zustand로 옮기지 않는다
  - 함께 사라지는 것: 입력 한 글자마다 다시 렌더링(P3), 수정 취소용 `orgXxx` 복제(P5, 폼 초기값으로 대체), `setTeamStates()`·`setEnsembleStates()` 초기화 호출
- [ ] **`stores/drawer` 축소:** 3-9에서 Context → Zustand로 옮긴 Drawer 스택을 단일 Drawer 구조에 맞게 줄이고, 호환용 `useDrawerContext` 별칭을 삭제한다
- [ ] **PIN 흐름:** 지금은 PIN 단계 Drawer가 존재 확인과 `check-xxx-pin`을 따로 호출한다(P2 잔여, F6). 백엔드 B1 대응(변경 API에서 PIN 검증)에 맞춰 폼 submit 하나로 합친다
- [ ] **(트렌디한) 알림 기능 새로 추가:** (V-1: Sonner와 조회 실패 알림 ✅, 변경 알림은 기능 단계마다) 3-6을 폐기하면서 기존 알림(`useMessage`)을 프로젝트에서 삭제했다(2026-11-23). 지금은 성공·실패·"이미 삭제됨"을 사용자에게 알리지 않는다
  - 권장: shadcn/ui의 **Sonner**(토스트)를 앱 루트에 하나 두고, mutation 훅의 `onSuccess`·`onError`(404 → "이미 삭제됨")와 TanStack Query `QueryCache.onError`(조회 실패)에서 호출
  - 이전 알림 문구는 git 기록(`8af5868` 이전 코드)에서 참고할 수 있다
- [ ] **폼은 3단계의 mutation 훅을 호출한다** (`useUpdateTeam().mutateAsync(...)` 등). 캐시 갱신은 훅이 처리한다 (알림은 위 항목에서 새로 연결)
- [ ] **Drawer 쪽 잔여 이슈:** F9(Drawer의 `exhaustive-deps`), F10, F11, V1~V5, V7, E4
- [ ] **테스트:** Drawer 흐름 테스트를 새 UI 기준으로 다시 작성한다. `lib/`·`queries/` 테스트는 유지한다
- [x] **React Compiler 도입 판단** (`MODERNIZATION.md` 10번): V-1에서 켜기로 확정 (사전 결정 7, 2026-11-23)

## 스타일링: Tailwind CSS v4 (styled-components 대체) 📌

> `MODERNIZATION.md` 8번에서 옮김

- styled-components는 공식적으로 **유지보수 모드**다. 런타임 CSS-in-JS라 React 19 / RSC 흐름과 맞지 않는다.
- 지금 코드에는 `.ant-drawer-close svg`처럼 **antd 내부 클래스를 덮어쓰는 코드와 `!important`가 많다.** UI 라이브러리 교체와 함께 정리된다.
- 현재 사용처: styled-components를 쓰는 파일 44개. 반응형 헬퍼 `src/styles/media.ts`(767px 기준), 전역 스타일·폰트 `src/styles/GlobalStyle.ts`, 색 `src/styles/theme.ts`
- 새 코드 규칙: 스타일은 Tailwind 클래스로, 조건부 클래스는 `cn()`으로. 색·간격은 토큰(`@theme`)을 쓰고 값을 직접 쓰지 않는다. 반응형은 모바일 우선(디자인 원칙)으로, Tailwind 기본 breakpoint를 쓰되 지금의 767px 기준이 필요하면 토큰으로 정의

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
| `Drawer` (공용 `common/Drawer`) | Drawer (vaul, 사전 결정 2) |
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
- `pnpm lint`: 에러·경고가 늘지 않아야 한다 (View 개편 시작 시점: 에러 5·경고 42, 모두 옛 View 코드. V-2 2차 후 에러 5·경고 41). 새 코드는 0건
- 테스트를 스크립트로 판정할 때는 `CLAUDE.md`의 테스트 규칙(기준선 먼저, `Tests N failed`로 판정)을 따른다
- 화면이 바뀌는 작업은 개발 서버로 실제 렌더링을 확인한다. 디자인 원칙의 확인 폭(모바일·폴더블·PC)에서 모두 본다
- 옛 화면이 남아 있는 동안은, 바꾸지 않은 옛 화면이 그대로인지도 확인한다 (V-1의 픽셀 비교 방식: 작업 전 커밋을 worktree로 띄워 같은 상황을 비교)
