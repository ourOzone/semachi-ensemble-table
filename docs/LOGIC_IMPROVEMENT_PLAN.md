# 3단계: 내부 로직 개선 계획

> 작업 규칙은 `CLAUDE.md`(로직 vs 뷰, 동작이 바뀌는 수정은 승인 후), 진행 기록은 `docs/MIGRATION.md`를 따른다.
> 문제는 `docs/ISSUES.md`의 ID(`F1`, `P2` 등)로 참조한다. 도입 라이브러리의 근거는 `docs/MODERNIZATION.md` 5~7번.
> 이 문서는 **어떤 순서로, 어떤 단위로 작업을 지시할지**를 정리한 실행 계획이다. (작성: 2026-11-20)

## 전제

1. **View 개편 때 Drawer 방식이 바뀐다.**
   - 지금: API 요청 하나를 위해 Drawer를 단계별로 연다. 팀 추가 6개, 팀 수정 5개, 합주 추가 4개, 합주 수정 4개.
   - 개편 후: Drawer 하나 안에서 모든 값을 입력한다. 완료 화면 Drawer(`AddTeamDrawer6`, `AddEnsembleDrawer4`의 "락앤롤!")는 삭제한다.
2. 따라서 3단계는 **View 개편 후에도 남는 층**에 집중한다. 서버 통신(api), 서버 상태(TanStack Query), 순수 도메인 함수, 전역 UI 상태가 여기에 해당한다.
   (알림은 3-6을 폐기하면서 기능 자체를 삭제했다. View 개편 때 새로 추가한다)
   단계 사이 값 전달, 단계별 `onClose` 초기화, `orgXxx` 복원, PIN 단계 같은 **Drawer 내부 로직은 원칙적으로 손대지 않는다.** 예외는 사전 결정 6번(F1)과 F3의 호출부 한 줄뿐이다.
3. 백엔드 문제(B1~B3)는 모두 전달됐다. B1(서버 측 PIN 검증)이 고쳐지면 변경 API가 PIN을 받게 된다. 그때 `api/`와 mutation 훅의 인자만 바뀌도록 층을 나눈다. 미리 인자를 만들어 두지는 않는다.

## 목표 아키텍처

```
[View] components/*            ← View 개편 때 교체 (단일 Drawer 폼)
   │  useTeams(), useBoard(), useUpdateTeam().mutateAsync(...)
   ▼
[queries/]  TanStack Query 훅: 조회 query · 변경 mutation, 캐시 무효화, 404("이미 삭제됨") 처리
   │
   ├─▶ [api/]     axios 클라이언트 + 엔드포인트 함수 + Zod parse
   └─▶ [lib/]     순수 함수: 서버 응답 → 화면 데이터(합주표·색상·다음 날짜), 이번 주 날짜, 요청 본문 생성
       [stores/]     Zustand: 전역 UI 상태 (열린 Drawer)
```

| 지금 | 3단계 후 | View 개편 후 |
|---|---|---|
| `context/fetch` (`fetchData`, 상태 4개, 정제 로직) | `queries/*`의 조회 훅 + `lib/board` | 그대로 사용 |
| 컨테이너의 `handleXxx` (try/catch, 존재 확인, `fetchData()`) | `queries/*`의 mutation 훅 | 그대로 사용 (폼 submit에서 호출) |
| `useMessage` + 컴포넌트마다 `contextHolder` | **삭제** (3-6 폐기, 알림 없음) | 새 알림 기능 추가 (Sonner 등) |
| `context/drawer` | `stores/drawer` (Zustand) | 단일 Drawer에 맞게 축소 |
| `context/team`, `context/ensemble` (단계 간 입력값, `orgXxx`) | **그대로** | 폼 로컬 상태로 흡수 후 삭제 |

**team·ensemble Context를 Zustand로 옮기지 않는 이유:** 이 두 Context는 단계별 Drawer 사이에 입력값을 넘기려고 존재한다.
단일 Drawer 폼에서는 입력값을 폼 로컬 상태(shadcn/ui Form의 표준인 react-hook-form + Zod)에 둔다. 지금 Zustand로 옮기면 View 개편 때 같은 작업을 한 번 더 하게 된다.
입력 한 글자마다 다시 렌더링되는 문제(P3)와 `orgXxx` 복제(P5)는 그때 함께 사라진다.

### 조회 (query)

| query key | API | 용도 |
|---|---|---|
| `['teams']` | `GET /teams` | 팀 목록 (소모임·회의 제외는 `select`), 합주표 색상 |
| `['ensembles']` | `GET /ensembles` | 합주표 |
| `['notes']` | `GET /notes` | 한마디 |
| `['notices']` | `GET /notices` | 공지 |

- 4개를 **병렬로** 요청한다 (P1).
- `useBoard()`는 teams와 ensembles를 조합한다: `lib/board.toBoard(teams, ensembles, now)`.

### 변경 (mutation)

| mutation | 성공 후 무효화 | 404일 때 |
|---|---|---|
| 팀 추가 | teams | – |
| 팀 수정 | teams, ensembles (서버가 합주의 `teamName`도 함께 바꿈) | "이미 삭제된 팀이에요." |
| 팀 삭제 | teams, ensembles (연쇄 삭제) | "이미 삭제된 팀이에요." |
| 합주 추가 | ensembles | 서버가 팀 존재를 검사하지 않아(B4) `teamExists` 사전 확인을 유지 |
| 합주 수정·미루기·삭제 | ensembles | "이미 삭제된 합주예요." |
| 한마디 추가·삭제 | notes | "이미 삭제된 한마디예요." |
| 공지 추가·삭제 | notices | "이미 삭제된 공지예요." |

- **훅의 책임:** 서버 요청, 캐시 무효화, 404 판별 (알림은 없음: 3-6 폐기)
- **호출부의 책임:** UI 반응(Drawer 닫기, 입력값 초기화). `mutateAsync`의 결과나 `onSuccess` 옵션으로 처리한다.
- 이렇게 나누는 이유: View 개편에서는 UI 반응만 바뀌고 훅은 그대로 남는다.

### 테스트 전략

- **기존 흐름 테스트(54개, Drawer 단위)가 3단계의 안전망이다.** 리팩터링 커밋은 이 테스트를 수정 없이 통과해야 한다.
- 이 테스트들은 View 개편 때 다시 작성된다. 그래서 **새 Drawer 흐름 테스트는 추가하지 않는다.** 예외는 F1 회귀 테스트 1개다.
- 새 테스트는 개편 후에도 남는 층에 쓴다.
  - `lib/` 순수 함수: `now`를 인자로 받아 가짜 타이머 없이 테스트
  - `queries/` 훅: `renderHook` + QueryClient + MSW. 404·500 같은 오류 경로를 포함한다 (E2).
- `fetch.test.tsx`의 characterization 기대값은 3-2에서 `lib/board.test.ts`로 그대로 옮긴다. 기대값은 승인된 버그 수정 커밋에서만 바꾼다.

## 사전 결정 ✅ 확정 (2026-11-20, 8개 모두 추천안 채택)

| # | 항목 | 선택지 | 추천 | 이유 |
|---|---|---|---|---|
| 1 | Zustand 범위 | (a) Context 4개 모두 / (b) Drawer 상태만 / (c) 3단계에서는 도입 안 함 | **(b)** | team·ensemble은 View 개편 때 폼 로컬 상태로 흡수된다 (위 설명). Drawer 열기·닫기 API는 개편 후에도 남고, 컴포넌트 밖(mutation 콜백 등)에서 `getState()`로 부를 수 있다 |
| 2 | ~~알림 구조~~ ❌ 폐기 (2026-11-23: 알림 기능 자체를 삭제) | (a) 루트 holder 1개 + `lib/notify`, `useMessage`는 같은 시그니처로 유지 / (b) 그대로 두고 View 개편 때 Sonner | **(a)** | 호출부를 고치지 않고 F5(contextHolder 누락)가 해소된다. mutation 훅에서 바로 알림을 띄울 수 있고, Sonner 교체는 한 파일만 바꾸면 된다. 동작 차이: 지금은 컴포넌트마다 holder가 따로라 다른 컴포넌트의 알림이 동시에 보일 수 있지만, 바꾸면 항상 마지막 알림 하나만 보인다 |
| 3 | 조회 기본값 | 탭 복귀 시 다시 불러오기, 재시도, 조회 실패 알림 | **켜기 · 조회 1회(변경 0회) · 알림** (조회 실패 알림은 알림 기능 삭제로 적용 안 함) | 지금은 처음 한 번과 변경 후에만 불러온다. 탭 복귀 때 다시 불러오면 다른 사람의 변경이 반영된다(TanStack 기본값). 지금은 조회가 실패해도 아무 표시가 없고, 처리되지 않은 Promise 에러로 끝난다 → 에러 알림을 한 번 띄운다 |
| 4 | Zod parse 실패 처리 | (a) 조회 실패로 처리 (3번의 알림) / (b) 콘솔 경고 후 원본 사용 | **(a)** → **수정 (2026-11-20, 3-4): 목록은 항목 단위 검증.** 실제 서버에 `endTime`이 `null`인 합주가 1건 있어, (a)면 합주표 전체가 안 보인다. 배열이 아니면 조회 실패, 잘못된 항목만 제외하고 경고 | 응답 형태가 다르면 화면이 어차피 깨진다. 같은 서버라 실패할 가능성은 낮고, 실패하면 원인을 바로 알 수 있다. 스키마는 모르는 필드를 허용하는 지금 상태를 유지한다 |
| 5 | 존재 확인 사전 요청(P2) 제거 범위 | 컨테이너 · 클릭 시점 · PIN Drawer 내부 | **컨테이너와 클릭 시점만 제거** | 서버의 수정·삭제·PIN 확인은 대상이 없으면 404를 준다 → mutation 에러로 처리한다. 합주 추가의 팀 확인은 유지한다(B4). PIN Drawer 안의 확인은 View 개편과 B1 대응 때 PIN 흐름 자체가 바뀌므로 그대로 둔다. 효과: 미루기 흐름의 `GET /ensemble/:id`가 5회에서 2회로 준다 (남는 2회는 Drawer 안). 블록·팀 클릭 시점의 확인이 없어지면, 사이에 삭제된 대상의 정보 Drawer가 열릴 수 있다. 이후 동작에서 404가 나면 지금과 같은 "이미 삭제된…" 알림을 띄운다 |
| 6 | F1(팀 수정 데이터 손실) | (a) 최소 수정 / (b) View 개편까지 둠 | **(a)** | 지금 운영 중인 데이터 손실 버그이고, View 개편이 언제 배포될지 정해지지 않았다. 수정 범위는 `onClose` 2줄이다: 뒤로 가면 그 단계의 값을 원래 값(`orgDesc`)으로 되돌린다. 회귀 테스트 1개를 추가한다 |
| 7 | 동작 변경 버그 수정 | 아래 표 | 전부 승인 권장 | 모두 View 개편 후에도 남는 로직이다 |
| 8 | `noUncheckedIndexedAccess` | 켜기 / 끄기 | **3-10에서 켜기** | 에러 21개 중 11개는 3단계에서 다시 쓰는 로직(`context/fetch` 6, `board/index` 3, `teams/index` 2)이라 가드로 정리한다. 나머지 10개는 Drawer(View 개편 때 삭제될 코드)라 `!`와 주석으로 처리한다. 이후 View 개편에서 새로 쓰는 코드가 처음부터 이 검사를 받는다 |

### 7번: 동작이 바뀌는 버그 수정

| ID | 지금 | 바꾼 후 | 단계 |
|---|---|---|---|
| F2 | 일요일에는 합주표 날짜 7개가 다음 주를 가리킨다. 모듈을 불러올 때 한 번만 계산된다 | 오늘이 속한 주의 월~일을 표시한다(일요일은 마지막 칸). 자정이 지나면 다시 계산한다(`useToday` 훅) | 3-3 |
| F7 | 반복 합주의 다음 날짜를 다시 계산하면 현재 시각이 붙는다 | 그날 0시 | 3-3 |
| F8 | 목록에 없는 팀의 합주는 배경색이 `-1`(무효한 CSS 값)이다 | `theme.blueGray` (회의 버튼과 같은 회청색) | 3-3 |
| F3 | 팀 추가·합주 추가가 저장 결과와 관계없이 완료 화면을 연다 | 성공했을 때만 완료 화면. 실패하면 현재 단계에 머문다 (에러 알림은 알림 기능 삭제로 없음) (완료 Drawer는 View 개편 때 삭제되므로 호출부 한 줄만 수정) | 3-8 |
| F4 | 미루기가 저장을 기다리지 않고 "잘 미뤘어요"를 띄운다. 화면 날짜를 먼저 바꾸고, 이어서 "잘 바꿔놨어요"가 덮어쓴다 | 저장이 성공한 뒤에 날짜를 바꾼다 (알림 문구는 알림 기능 삭제로 없음) | 3-8 |

## 단계 (지시 단위)

각 단계는 커밋 하나 이상이다. **리팩터링(동작 동일)과 버그 수정(동작 변경)은 커밋을 나눈다.** (`refactor(...)` / `fix(...)`)

### 3-0. 기반 준비 (동작 변경 없음) ✅
- 사전 결정 확정, `@tanstack/react-query`·`zustand` 설치
- `src/lib/queryClient.ts`(결정 3의 기본값) 추가, `src/index.tsx`에 `QueryClientProvider` 연결
- 테스트 헬퍼: 테스트마다 새 QueryClient(재시도 끔)를 쓰도록 `renderWithTheme`·`renderApp`에 포함
- (승인 시) E3: `.claude/settings.json` 허용 목록을 pnpm 명령 기준으로 갱신

### 3-1. F1 최소 수정 (결정 6 승인 시) ✅
- `UpdateTeamDrawer4`의 `onClose`: 멤버 6칸을 `orgDesc`로 되돌린다. `UpdateTeamDrawer5`의 `onClose`: 셋리스트를 `orgDesc[6]`으로 되돌린다.
- `Teams.test.tsx`에 회귀 테스트: 멤버 단계에서 뒤로 갔다가 다시 진행해 저장해도 기존 값이 유지되는지

### 3-2. 순수 함수 추출 (동작 동일) ✅
- `lib/board.ts`: `toTeams`, `buildColorMap`, `resolveNextDate(ensemble, now)`, `toBoard(teams, ensembles, now)`, `isSkipped(block, now)`(Board 렌더링 안의 회색 판단)
- `lib/week.ts`: `getWeek(now)`, `getTodayIdx(now)`. **F2 버그는 이 커밋에서 그대로 유지한다.**
- `lib/ensemble.ts`: `toEnsembleRequest(...)`. 요일 변환과 레거시 `type`·`due` 계산이 board와 teams에 중복돼 있다. `idx2hour[endTime + 1].split(':')` 파싱 중복도 함께 정리한다.
- `context/fetch.tsx`는 lib 함수를 호출하도록 바꾼다 → 기존 `fetch.test.tsx`가 그대로 통과해야 한다.
- lib 단위 테스트를 추가한다 (characterization 기대값을 `now` 인자 방식으로 옮김).

### 3-3. 순수 함수 버그 수정 (결정 7 승인분) ✅
- F2, F7, F8을 ID마다 커밋 하나씩 고친다. 각 커밋에서 해당 characterization 기대값을 바꾸고, 바꾼 이유를 커밋 메시지에 적는다.
- F2의 자정 갱신을 위해 `useToday()` 훅을 추가한다 (다음 자정에 타이머로 다시 렌더링).

### 3-4. API 층 (P6, P8) ✅
- `api/index.ts`: 응답 스키마를 받아 parse하는 형태로 바꾼다 (결정 4).
- `isNotFound(err)` 헬퍼를 추가한다 (axios 404 판별, mutation에서 사용).
- P8: `ensemble?id=` → `/ensemble?id=`. 최종 요청 URL이 같은지 테스트로 확인한다.

### 3-5. 조회를 TanStack Query로 (P1) ✅
- `queries/{teams,ensembles,notes,notices}.ts`에 key와 조회 훅, `queries/board.ts`에 `useBoard()`
- 컴포넌트의 `useFetchContext()`를 훅으로 바꾼다. `fetchData()` 호출은 임시로 `invalidateQueries`로 대체한다 (3-7·3-8에서 mutation으로 바뀌며 사라짐).
- `App`의 최초 fetch effect를 삭제한다 (F9 중 2건 해소).
- `context/fetch`를 삭제한다. `fetch.test.tsx`는 3-2에서 lib 테스트로 옮겨졌으니 삭제하고, 조회 훅 테스트를 추가한다.

### 3-6. ~~알림 중앙화~~ ❌ 폐기 → 알림 기능 삭제 (2026-11-23)
- 알림 중앙화(루트 holder + `lib/notify`)를 구현했으나, 진행 중 드러난 흐름 테스트의 간헐적 실패 조사에 시간이 오래 걸려 **사용자 결정으로 폐기**하고 **알림 기능을 프로젝트에서 삭제**했다
- 삭제: `hooks/useMessage.tsx`·테스트, 사용처 13개 파일의 `message.xxx()` 39곳·`contextHolder` 11곳. 비게 된 catch 25곳에는 주석
- 결과: 성공·실패·"이미 삭제됨"을 사용자에게 알리지 않는다 (흐름 제어·초기화는 그대로). F5·P4는 대상이 사라져 해소
- **View 개편 때 새 알림 기능을 추가한다** (아래 "View 개편 때 넘겨주는 것")

### 3-7. 변경을 mutation으로: 공지·한마디 (P2) ✅
- `useAddNotice`·`useDeleteNotice`, `useAddNote`·`useDeleteNote`
- 컨테이너의 `handleXxx`는 mutation 호출과 UI 반응만 남긴다. 클릭 시점의 존재 확인은 제거한다(결정 5). deps가 `[]`였던 `handleClickDelete` 문제(F9)도 함께 해소된다.
- `checkXxxExists`는 PIN Drawer가 prop으로 쓰므로 남긴다.

### 3-8. 변경을 mutation으로: 팀·합주 (P2, F3, F4) ✅
- 리팩터링 커밋: `useAddTeam`·`useUpdateTeam`·`useDeleteTeam`, `useAddEnsemble`(팀 확인 유지)·`useUpdateEnsemble`·`useDeleteEnsemble` (미루기는 `useUpdateEnsemble`을 사용해 별도 훅을 만들지 않음). `handleClickTeamInfo`는 캐시에서 팀을 찾는다(없으면 "이미 삭제된 팀").
- 수정 커밋: F3 (`AddTeamDrawer5`·`AddEnsembleDrawer3`의 호출부 한 줄씩), F4 (미루기)

### 3-9. Drawer 상태를 Zustand로 (결정 1)
- `stores/drawer.ts`: 지금과 같은 API(`openedDrawers`, `openDrawer`, `closeDrawer`, `closeAllDrawers`, `setOpenedDrawers`)
- `useDrawerContext`는 store 훅의 별칭으로 남긴다 → Drawer 파일 수정 없음 (View 개편 때 정리)
- `App`은 selector로 "열린 Drawer가 있는지"만 구독한다. `DrawerContextProvider`를 제거한다.

### 3-10. 마무리
- `noUncheckedIndexedAccess` 켜기 (결정 8)
- 린트: 컨테이너·App의 `exhaustive-deps` 경고 해소를 확인한다. 남은 경고는 Drawer 쪽(View 개편 대상)으로 분류해 ISSUES를 갱신한다. 이번에 손댄 파일의 쓰지 않는 import도 정리한다.
- 커버리지를 2단계 완료 시점(구문 87%·분기 77%)과 비교한다 (E2).
- React Compiler 판단 메모: 3단계 후 남는 수동 메모이제이션은 대부분 Drawer에 있으므로, View 개편 때 함께 판단한다 (MODERNIZATION 10번).
- 문서: `MIGRATION.md`, `ISSUES.md`, `MODERNIZATION.md`

**묶어서 진행해도 되는 단위:** [3-0, 3-1] · [3-2, 3-3] · [3-4] · [3-5] · ~~3-6~~ · [3-7] · [3-8] · [3-9, 3-10]

## 공통 검증 (단계마다)

- `pnpm typecheck` / `pnpm test:run`(2회) / `pnpm format:check` / `pnpm build`
- `pnpm lint`: 에러·경고 수가 늘지 않아야 한다 (시작 시점: 에러 5·경고 62)
- 동작이 바뀌는 커밋은 메시지에 "지금 → 바꾼 후"를 적고, `ISSUES.md`의 해당 ID를 처리 완료로 표시한다.

## 멈추고 보고할 조건

- 리팩터링 커밋에서 기존 테스트가 깨진다 (= 동작이 바뀌었다는 뜻)
- 승인받지 않은 동작 변경이 필요해진다
- Drawer 내부를 크게 고쳐야만 진행할 수 있다 (View 개편 대상이라 우회 방법을 보고)
- 실제 서버 응답이 Zod 스키마와 다르다

## ISSUES 처리 계획

| ID | 처리 |
|---|---|
| B1 | 백엔드 대응 시 `api/`와 mutation 훅 인자만 변경 |
| B4 | 프론트는 합주 추가 전 `teamExists`를 유지해 대응 |
| F1 | 3-1 (결정 6) |
| F2 · F7 · F8 | 3-3 |
| F3 · F4 | 3-8 |
| F5 | ✅ 알림 기능 삭제로 해소 (3-6 폐기) |
| F9 | 컨테이너·App 쪽은 3-5~3-9에서 해소 / Drawer 쪽은 View 개편 |
| P1 | 3-5 |
| P2 | 3-7·3-8 (PIN Drawer 안의 확인은 View 개편·B1 대응) |
| P4 | ✅ 알림 기능 삭제로 해소 (3-6 폐기) |
| P6 · P8 | 3-4 |
| P7 | 3-10 |
| E2 | 3-2·3-5~3-8의 lib·훅 테스트 |
| E3 | 3-0 (승인 시) |
| **손대지 않음 → View 개편 때 해소** | F6(PIN 단계 Drawer), F10·F11(Drawer props), P3·P5(폼 로컬 상태로 대체), V1~V5, E4 |

## View 개편 때 넘겨주는 것

- 폼은 mutation 훅을 호출한다. 예: `await updateTeam.mutateAsync({ id, type, name, desc })`. 캐시 갱신은 훅이 처리한다.
- 폼 입력값은 폼 로컬 상태에 둔다 (shadcn/ui Form = react-hook-form + Zod). 그다음 `context/team`·`context/ensemble`과 `orgXxx`를 삭제한다.
- **알림 기능을 새로 추가한다** (3-6 폐기와 함께 기존 알림을 삭제했다). shadcn/ui의 Sonner 같은 최신 토스트 라이브러리를 앱 루트에 하나 두고, mutation 훅의 `onSuccess`·`onError`(404 = "이미 삭제됨" 포함)와 QueryCache `onError`(조회 실패)에서 띄우는 구조를 권장
- `stores/drawer`를 단일 Drawer 구조에 맞게 줄이고, `useDrawerContext` 별칭을 정리한다.
- 흐름 테스트를 새 UI 기준으로 다시 작성한다. lib·훅 테스트는 그대로 유지한다.
