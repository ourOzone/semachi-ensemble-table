# 디렉터리 구조

> V-6(2026-11-26)에 정리한 `src/` 구조와 파일을 둘 곳. 새 파일을 만들 때 이 문서를 따른다.

## 한눈에 보기

```
src/
├─ app/            앱 조립: main.tsx(진입), app.tsx(화면 배치)
├─ features/       기능별 화면 + 그 기능만 쓰는 상태
│  ├─ schedule/    합주판 (캘린더, 빈 시간, 합주 정보·잡기·수정)
│  ├─ teams/       팀 목록, 팀 정보·추가·수정, 소모임 정보
│  ├─ notes/       날적이 (코드 이름은 API와 같은 note)
│  ├─ notices/     공지
│  └─ settings/    설정
├─ components/     여러 기능이 같이 쓰는 화면 부품
│  ├─ ui/          기본 부품 (shadcn: button, drawer, popover …)
│  ├─ sheet/       아래에서 올라오는 Drawer의 공용 부품 (틀, 입력 부품, PIN, 키보드 처리)
│  └─ layout/      헤더, 푸터, 아이폰 도구 막대 색
├─ api/            서버 요청 (리소스별)
├─ queries/        TanStack Query 훅 (조회·변경)
├─ lib/            순수 함수·유틸 (화면과 관계없는 계산)
├─ types/          도메인·요청·응답 타입
├─ stores/         여러 기능이 쓰는 전역 상태 (Zustand)
├─ hooks/          여러 기능이 쓰는 훅
├─ constants/      고정 값 (요일·시간, 팀 색 등)
├─ styles/         index.css(Tailwind·토큰), 패턴
├─ assets/         글꼴
└─ test/           테스트 공용 (MSW 서버, render, fixtures)
```

## 어디에 둘까

| 만들려는 것 | 둘 곳 |
|---|---|
| 한 기능에서만 쓰는 화면·store·타입 | `features/<기능>/` |
| 두 기능 이상이 쓰는 화면 부품 | `components/` (Drawer 관련이면 `sheet/`, 기본 부품이면 `ui/`) |
| 두 기능 이상이 쓰는 상태 | `stores/` |
| 서버 데이터 읽기·쓰기 | `api/`(요청) + `queries/`(훅) |
| 화면 없이 계산만 하는 함수 | `lib/` (테스트하기 쉽게 현재 시각 등은 인자로) |

- 처음엔 기능 폴더에 두고, 다른 기능도 쓰게 되면 그때 `components/`·`stores/`로 옮긴다.
- 기능 폴더 안은 파일이 많지 않아 하위 폴더 없이 둔다. 10개를 넘게 되면 `components/`·`stores/`로 나눈다.

## 규칙

- **파일 이름은 케밥 표기:** `team-info-drawer.tsx`, `use-today.ts`. 컴포넌트·함수 이름은 그대로 `TeamInfoDrawer`, `useToday`.
  - 윈도우는 대소문자만 다른 이름 변경을 알아채지 못한다. 대소문자만 바꿀 때는 `git mv a.tsx tmp.tsx` → `git mv tmp.tsx a-b.tsx` 두 단계로.
- **테스트는 대상 파일 옆에** `*.test.ts(x)`.
- **가져오기:** `src` 안은 `@/` 경로, 같은 폴더는 `./`. 폴더마다 `index.ts`로 다시 내보내기(배럴)는 만들지 않는다 (Vite 개발 서버가 느려지고 순환 참조가 생기기 쉽다).
- **기능끼리 가져오기:** 되도록 피하고, 필요하면 그 파일을 직접 가져온다. 지금 있는 것:
  - 합주판 카드 → 팀 목록 (`schedule/schedule-card` → `teams/teams`)
  - 팀 → 합주 잡기 (`teams/teams`·`team-info-drawer`·`event-info-drawer` → `schedule/add-ensemble-store`·`add-ensemble-drawer`)
  - 설정 → 합주판 보기 방식 (`settings/settings-drawer` → `schedule/board-view-store`)
- **로직 층(`api`·`queries`·`lib`·`types`·`stores`)은 화면(`features`·`components`)을 가져오지 않는다.**

## 이렇게 나눈 이유

- 기능 단위로 묶으면(bulletproof-react 등 최근 React 프로젝트에서 많이 쓰는 방식) 한 기능을 고칠 때 한 폴더만 보면 된다.
- 다만 `api`·`queries`·`lib`·`types`는 기능 폴더로 나누지 않았다. 팀과 합주처럼 여러 기능이 서로의 데이터를 쓰기 때문에, 나누면 기능끼리 가져오기가 오히려 늘어난다.

## 옮긴 파일 (V-6 이전 → 이후)

| 이전 | 이후 |
|---|---|
| `index.tsx`, `App.tsx` | `app/main.tsx`, `app/app.tsx` |
| `components/schedule/index.tsx` | `features/schedule/schedule-card.tsx` |
| `components/board/index.tsx`, `board/types.ts` | `features/schedule/board.tsx`, `features/schedule/types.ts` |
| `components/schedule/`의 캘린더·Drawer·store | `features/schedule/` (케밥 표기) |
| `components/schedule/TeamChips.tsx` | `features/teams/team-chips.tsx` |
| `components/schedule/drawerParts`·`formParts`·`PinStep`·`keyboardSheet` | `components/sheet/` |
| `components/teams/index.tsx` 등 | `features/teams/teams.tsx` 등 |
| `components/note/index.tsx` 등 | `features/notes/note-card.tsx` 등 |
| `components/notice/index.tsx` 등 | `features/notices/notice-card.tsx` 등 |
| `components/settings/` | `features/settings/` |
| `components/note/linkify.tsx` | `lib/linkify.tsx` |
| `context/team`·`context/ensemble` | `stores/selection.ts` (지금 보고 있는 팀·합주) |
| `styles/theme.ts`의 팀 색·소모임 색 | `constants/colors.ts` |
| 삭제 | `components/common/`, `styles/legacy.css`·`media.ts`·`styled.d.ts`·`theme.ts`, `context/` |
