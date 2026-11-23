# 발견된 문제점 목록

> 2026-11-18 ~ 2026-11-20 마이그레이션(개발 도구 정비, 1·2단계) 중 발견한 문제를 모은 문서.
> 3단계 계획(`docs/LOGIC_IMPROVEMENT_PLAN.md`)은 이 목록의 ID(`B1`, `F1` 등)를 참조한다. 새로 발견하면 추가하고, 처리하면 상태를 갱신한다.
>
> - 심각도: 🔴 Major (보안 · 데이터 손실 · 사용자에게 잘못된 결과) / 🟡 Minor (UX · 코드 품질 · 성능) / ⚪ 참고
> - 확인 방법: **재현** = 테스트·스크립트로 실제 실행해 확인 / **코드** = 코드를 읽어 확인 (실행 검증 안 함)
> - 처리 시점: **백엔드**(이 저장소 범위 밖) / **3-N**(3단계 계획의 단계 번호) / **View**(View 개편) / **환경**
> - View 개편 때 Drawer는 "단계별 여러 Drawer"에서 "Drawer 하나에서 모두 입력"으로 바뀌고 완료 화면 Drawer는 삭제된다. 그래서 Drawer 내부에만 있는 문제는 **View**로 분류하고 3단계에서 비용을 쓰지 않는다.

## 요약

| 심각도 | 백엔드 | 프론트 동작 | 구조·성능 | View | 환경·테스트 |
|---|---|---|---|---|---|
| 🔴 Major | 3 | 3 | – | – | – |
| 🟡 Minor | – | 7 | 7 | 6 | 4 |
| ⚪ 참고 | 1 | 1 | 2 | 1 | 2 |

---

## 1. 백엔드 (`api.js`, 이 저장소 범위 밖 → 백엔드 개발자에게 전달)

| ID | 심각도 | 내용 | 확인 | 상태 |
|---|---|---|---|---|
| B1 | 🔴 | **변경 API가 서버에서 PIN을 검증하지 않는다.** 팀 수정·삭제, 합주 추가·수정·삭제, 한마디 삭제, 공지 등록·삭제가 PIN 없이 동작한다. PIN 확인은 프론트가 `check-xxx-pin`을 따로 호출하는 방식이라, API를 직접 호출하면 누구나 데이터를 바꾸거나 지울 수 있다. (공지 등록은 "관리자 전용"이지만 마찬가지) | 코드 | 전달됨 (2026-11-20) |
| B2 | 🔴 | **`DELETE /teams`가 인증 없이 모든 팀을 삭제한다.** 로그만 남긴다. 프론트에서는 사용하지 않는 엔드포인트 | 코드 | 전달됨 (2026-11-20) |
| B3 | 🔴 | `GET /teams`, `GET /notes` 응답에 각 팀·한마디의 PIN이 그대로 포함된다. 브라우저 개발자 도구로 누구나 볼 수 있다 | 코드 | 전달됨 (2026-11-19) |
| B4 | ⚪ | `POST /ensemble`이 `teamId`의 팀이 실제로 있는지 검사하지 않는다. 삭제된 팀의 합주가 만들어질 수 있다. 프론트는 합주 추가 전 `teamExists` 확인을 유지해 대응 (3단계 계획 결정 5). 참고로 수정·삭제·PIN 확인 API는 대상이 없으면 404를 준다 | 코드 | 미전달 |

- 참고: 팀 삭제 시 그 팀의 합주는 함께 삭제된다 (연쇄 삭제는 정상).
- 위 문제 외의 개선 제안(보안·API 설계·데이터·운영)은 백엔드 개발자 전달용으로 `docs/BACKEND_SUGGESTIONS.md`에 따로 정리했다.

## 2. 프론트엔드 동작 버그

| ID | 심각도 | 내용 | 위치 | 확인 | 처리 |
|---|---|---|---|---|---|
| F1 | 🔴 | **팀 수정 중 멤버 단계에서 뒤로 갔다가 다시 진행해 저장하면, 기존 멤버·셋리스트가 모두 빈 값으로 저장된다 (데이터 손실).** 멤버 단계(`UpdateTeamDrawer4`)의 `onClose`가 `desc` 7칸을 전부 비운다. 셋리 단계(`UpdateTeamDrawer5`)의 `onClose`도 셋리스트를 비운다 | `teams/updateTeamDrawers/UpdateTeamDrawer4·5` | 재현 (저장 요청 `desc`가 `["","","","","","",""]`) | ✅ 3-1 (2026-11-20). 뒤로 가면 그 단계의 값을 수정 전 값(`orgDesc`)으로 되돌림. 회귀 테스트 추가 |
| F2 | 🔴 | **일요일에는 합주표 날짜 라벨 7개가 모두 다음 주 날짜로 표시된다.** `dayjs().day(1)`은 일요일 시작 주 기준이라 일요일에 "내일(월)"을 가리킨다. 예: 2026-11-22(일)에 11-23~11-29 표시, "오늘" 열은 11-29. 또 `week`·`todayIdx`가 모듈 로드 시 한 번만 계산돼, 자정을 넘겨 켜 두면 갱신되지 않는다 | `board/index.tsx` 상단 | 재현 (일요일 날짜로 계산) | ✅ 3-3 (2026-11-20). 오늘이 속한 주의 월~일(`lib/week`), `useToday`로 자정마다 다시 계산 |
| F3 | 🔴 | **팀 추가·합주 추가가 저장 결과를 기다리지 않고 완료 화면("락앤롤!")을 연다.** 서버 저장이 실패해도 성공한 것처럼 보인다 | `AddTeamDrawer5`, `AddEnsembleDrawer3` | 코드 | 3-8 (mutation 결과 확인, 호출부 한 줄. 완료 화면은 View 개편 때 삭제) |
| F4 | 🟡 | 미루기(`handleSkipEnsemble`)가 수정 요청을 기다리지 않고 "잘 미뤘어요"를 띄우고, 화면의 다음 날짜(`setNextDate`)도 서버 결과와 무관하게 7일 뒤로 바꾼다. 이어서 수정 결과 메시지("잘 바꿔놨어요" 또는 오류)가 덮어쓴다. 존재 확인 요청이 많다: 합주 블록 클릭부터 미루기 저장까지 `GET /ensemble/:id` 5회 (재현으로 확인) | `board/index.tsx` | 코드 | 3-8 (존재 확인 5회 → 2회, 남는 2회는 Drawer 안 → View) |
| F5 | 🟡 | 팀 삭제 Drawer가 `useMessage()`의 `contextHolder`를 렌더링하지 않아, 네트워크 오류 알림이 화면에 표시되지 않는다 | `teams/DeleteTeamDrawer.tsx` | 코드 | ✅ 해소: 알림 기능 삭제 (2026-11-23, 3-6 폐기) |
| F6 | 🟡 | 합주 수정 PIN 단계의 네트워크 오류가 `console.error`로만 처리되어 사용자에게 알림이 없다 | `UpdateEnsembleDrawer1.tsx` | 코드 | View (PIN 단계 Drawer). 현재는 알림 기능 자체가 없음(V6) |
| F7 | 🟡 | 반복 합주의 "다음 날짜"가 오늘·다른 요일로 재계산되면 자정이 아니라 **현재 시각**이 붙는다. 이 값으로 미루기를 하면 시각이 붙은 날짜가 서버에 저장된다 | `context/fetch.tsx` → `lib/board` | 재현 (characterization test로 고정) | ✅ 3-3 (2026-11-20). 다시 계산한 날짜는 그날 0시 |
| F8 | 🟡 | 팀 목록에 없는 팀의 합주는 `teamColor`가 `-1`이 되어 그대로 CSS 배경색 값이 된다 (팀 삭제는 합주도 지우므로 드묾) | `context/fetch.tsx` → `lib/board`, `board/index.tsx` | 재현 (characterization test) | ✅ 3-3 (2026-11-20). `theme.blueGray`로 표시, 타입도 `string`으로 |
| F9 | 🟡 | `useCallback` 의존성 누락 31건(`exhaustive-deps`). 예: 공지·한마디의 `handleClickDelete`는 deps가 `[]`라 첫 렌더링의 함수를 계속 참조한다. 지금은 참조하는 값들이 대부분 고정이라 눈에 띄는 오동작은 확인하지 못함 | 여러 곳 | 린트 | 컨테이너·App: 3-5~3-9 (App의 effect 의존성 경고 2건은 3-5에서 해소. 3-7에서 공지·한마디 컨테이너의 경고 해소, deps `[]`였던 `handleClickDelete` 포함. 남은 경고는 3-10에서 집계) / Drawer: View |
| F10 | 🟡 | 합주 정보 Drawer가 `handleSkip`으로 prop을 받지만 부모는 `handleSkipEnsemble`로 넘겨 항상 `undefined`. 실제로 쓰이지 않아 동작 영향 없음 | `EnsembleInfoDrawer.tsx` | 코드 | View |
| F11 | ⚪ | 쓰이지 않는 prop·인자: `NoticeDrawer`의 `setId`, 공지 추가의 `pin` 인자(부모가 버림), `Header`의 `scrollPosition`, Input에 없는 `controls={false}`(8곳) | 여러 곳 | 코드 (타입 주석으로 표시) | View |

## 3. 구조 · 성능 (3단계 리팩터링 대상)

| ID | 심각도 | 내용 | 대응 (단계) |
|---|---|---|---|
| P1 | 🟡 | `fetchData`가 4개 API를 순서대로 기다린다(병렬 아님). 무엇이든 하나 바뀌면 전체를 다시 불러온다 | ✅ 병렬 조회 3-5 (2026-11-20). "하나 바뀌면 전체를 다시 불러옴": 공지·한마디는 ✅ 3-7(해당 목록만), 팀·합주는 임시 `useRefetchAll`로 남아 3-8에서 해소 |
| P2 | 🟡 | 거의 모든 변경 전에 `xxxExists`로 존재 확인 요청을 한 번 더 보낸다 (PIN 입력·버튼 클릭마다 중복) | 404를 mutation 에러로 처리. 공지·한마디 ✅ 3-7 (삭제 흐름의 존재 확인 3회 → 1회), 팀·합주 3-8. 합주 추가의 팀 확인(B4)과 PIN Drawer 안의 확인은 유지 → View·B1 대응 |
| P3 | 🟡 | Context Provider의 `value`가 매 렌더링 새 객체라, 입력 한 글자마다 구독하는 컴포넌트 전체가 다시 렌더링된다 | View (입력값이 폼 로컬 상태로 이동). Drawer 상태만 3-9에서 Zustand |
| P4 | 🟡 | `useMessage`가 렌더링마다 새 객체를 반환해 이를 의존하는 `useCallback`이 사실상 무의미. 거의 같은 알림 함수 4개가 반복 | ✅ 해소: 알림 기능 삭제 (2026-11-23, 3-6 폐기) |
| P5 | 🟡 | 수정 취소 복원용 `orgXxx` 상태를 따로 복제해 관리 (team·ensemble context) | View (단일 Drawer 폼의 초기값으로 대체) |
| P6 | 🟡 | 서버 응답을 런타임 검증 없이 사용 (Zod 스키마는 정의만 됨) | ✅ 3-4 (2026-11-20). 목록은 항목 단위 검증(`getList`), 존재 확인·PIN 확인은 boolean 검증 |
| P9 | ⚪ | 실제 서버 데이터에 `endTime`이 `null`인 합주가 1건 있다 (반복 합주, `startTime` 26, `type` '일회성'·`due` 2025-09-13으로 레거시 필드도 서로 맞지 않음). 검증 전에도 칸이 만들어지지 않아 화면에 보이지 않았다 | 3-4에서 해당 항목만 제외하고 콘솔 경고. DB 정리 여부는 별도 판단 |
| P7 | 🟡 | `noUncheckedIndexedAccess`를 켜면 타입 에러 21개 (teams 9, context 6, board 6). 대부분 배열 인덱스 접근. 3-2 이후 19개 (lib/board 6, board/index 1, teams/index 2, Drawer 10) | 3-10에서 켜기 (로직 11곳은 가드, Drawer 10곳은 `!`) |
| P8 | ⚪ | API 경로 오타: `ensemble?id=`(앞의 `/` 누락). baseURL과 합쳐져 동작은 함 | ✅ 3-4 (2026-11-20). 최종 요청 URL이 같음을 테스트로 확인 |

## 4. View (View 개편 시 해소 예정)

| ID | 심각도 | 내용 |
|---|---|---|
| V1 | 🟡 | styled-components 커스텀 props가 DOM으로 새어 React 경고 발생 (`scrollPosition`, `isEvent`, `openedDrawers`, `row`, `idx`, `gray`, `teamColor`, `visible`, `error`, `controls` 등). App 테스트에 기존 경고로 허용 중 |
| V2 | 🟡 | 리스트 key 누락: `TeamInfoDrawer`의 key 없는 Fragment map, 완료 화면 `Result`의 `extra={[<OkButton />]}` 2곳(`jsx-key` 린트 에러) |
| V3 | 🟡 | effect 안에서 바로 setState (`set-state-in-effect` 린트 에러 3건): `Drawer`의 창 너비, 팀 이름 입력의 무작위 예시 이름 2곳 |
| V4 | 🟡 | antd Drawer의 deprecated prop `maskStyle` 사용 |
| V5 | 🟡 | JS 번들 936kB (500kB 경고). 대부분 antd. 2단계 중 +79kB는 React 19가 주원인으로 판단 |
| V6 | 🟡 | **알림 기능이 없다.** 3-6(알림 중앙화)을 폐기하면서 기존 알림(`useMessage`)을 삭제했다(2026-11-23). 성공·실패·"이미 삭제됨"을 사용자에게 알리지 않는다 → View 개편 때 Sonner 등으로 새로 추가 (`MODERNIZATION.md` View 개편 체크리스트) |
| V7 | ⚪ | 공용 Drawer가 열림 애니메이션이 끝난 뒤 첫 입력칸으로 포커스를 옮긴다(`afterOpenChange`). 그 전에 다른 칸에 입력 중이면 포커스가 되돌아간다 (팀 추가 PIN 단계의 "한 번 더" 칸, 한마디·공지 등록의 PIN 칸도 같은 구조). 사람이 겪을 가능성은 낮음. 테스트는 포커스가 옮겨진 뒤 입력하도록 수정 |

## 5. 환경 · 테스트

| ID | 심각도 | 내용 |
|---|---|---|
| E1 | 🟡 | 로컬 Node 24.14.0 < jsdom 31 하위 의존성 요구 `^24.15.0` → 설치 시 engine 경고 (동작 문제 없음). Node 24 최신으로 업데이트 권장 |
| E2 | 🟡 | 테스트 커버리지 구문 87%·분기 77%. 미실행 부분은 대부분 네트워크 오류·"이미 삭제됨" catch 경로, Drawer 닫기 초기화, Enter 키 제출 → 3단계의 lib·훅 테스트로 보강 (Drawer 흐름 테스트는 추가하지 않음) |
| E3 | 🟡 | `.claude/settings.json`의 권한 허용 목록이 `npm run ...`, `npx vitest ...` 기준이라 pnpm 전환 후 명령과 맞지 않음 → ✅ 3-0에서 pnpm 기준으로 갱신 (2026-11-20) |
| E4 | ⚪ | 테스트가 antd 내부 구현에 의존하는 부분: 비활성 버튼의 `visibility: hidden`(`findEnabledButton`), Drawer 클래스(`findDrawer`), 달력 셀 `td[title]`. antd 교체 시 함께 수정 |
| E5 | ⚪ | jsdom의 XHR이 mock 응답에도 CORS를 검사해, 테스트 페이지 origin을 API origin으로 맞춰 둠 (`vite.config.mts`) |
| E6 | 🟡 | 흐름 테스트가 간헐적으로 실패했다 (`--maxWorkers=4`에서 잘 재현, 2단계부터 있었고 3-5 이후 잦아짐). ✅ 원인 3가지를 테스트 쪽에서 수정 (2026-11-23): ① Board `openEnsembleInfo`가 `findAllByText`의 두 번째 요소를 클릭 → 합주표가 늦게 그려지면 `undefined` 클릭 ② Teams `openTeamInfo`가 첫 번째 `'테스트밴드'`를 클릭 → 가끔 합주 블록이 잡혀 Drawer가 닫힘 ③ 팀 추가 PIN 단계에서 Drawer의 지연 포커스(V7). 수정 후 기본 3회·`--maxWorkers=4` 4회 모두 통과. 알림 삭제로 렌더링 타이밍도 바뀌어, 각 수정의 기여도를 완전히 분리하지는 못함. 3-7에서 한마디·공지 등록 테스트가 드물게 실패(2/9회) → 같은 구조(③)로 보고 포커스를 기다리도록 수정. 실패 시점 DOM으로 확인하지는 못했다(재현 12회 중 0회). 수정 후 6회 통과 |

---

## 린트 현황 (2단계 완료 시점, 모두 기존 코드)

| 규칙 | 건수 | 관련 ID |
|---|---|---|
| `react(jsx-key)` ❌ | 2 | V2 |
| `react(set-state-in-effect)` ❌ | 3 | V3 |
| `react-hooks/exhaustive-deps` | 31 | F9 |
| `react(exhaustive-effect-dependencies)` | 2 | F9 (App·Drawer effect) |
| `no-unused-vars` | 29 | F11 등 (쓰지 않는 import·변수) |
