# 2단계: JS → TS 전환 계획

> 작업 규칙은 `CLAUDE.md`(TS 전환 규칙, 로직 vs 뷰), 진행 기록은 `docs/MIGRATION.md`를 따른다.
> 이 문서는 **어떤 순서로, 어떤 단위로 작업을 지시할지**를 정리한 실행 계획이다.

## 현황 (2026-11-19 기준)

- 남은 JS 파일: **57개, 약 5,300줄** (`.js` 9개, `.jsx` 48개)
- 이미 TS: `index.tsx`, `vite-env.d.ts`, `styles/theme.ts`, `styles/styled.d.ts`, 테스트 파일들
- 환경: React 19 + `@types/react` 19, TypeScript 7, `strict: true`, `allowJs: true`(전환 중 JS·TS 공존)
- 안전망: `pnpm test:run` (api 클라이언트, OkButton, **App 전체 렌더링 스모크 테스트**)

---

## 진행 순서 한눈에 보기

의존성이 적은 쪽(아래)부터 위로 올라간다. 각 단계는 **커밋 1개**다.

| 단계 | 범위 | 파일 | 줄 | 지시 예시 |
|---|---|---|---|---|
| ✅ **2-0** | 사전 결정 + `src/types/` 도메인 타입 | 신규 | – | `2-0 진행해줘` |
| ✅ **2-1** | `constants`, `styles` (media, GlobalStyle) | 3 | 187 | `2-1 진행해줘` |
| ✅ **2-2** | `api` (index, team, ensemble, note, notice) | 5 | 99 | `2-2 진행해줘` |
| ✅ **2-3** | `hooks` (useMessage, useScrollPosition) | 2 | 126 | `2-3 진행해줘` |
| ✅ **2-4** | `context` (drawer, team, ensemble, fetch, index) | 5 | 321 | `2-4 진행해줘` |
| **2-5** | `components/common` | 5 | 185 | `2-5 진행해줘` |
| **2-6** | `components/layout` | 2 | 100 | `2-6 진행해줘` |
| **2-7** | `components/notice` | 4 | 511 | `2-7 진행해줘` |
| **2-8** | `components/note` | 3 | 406 | `2-8 진행해줘` |
| **2-9** | `components/board` (index + Drawer 3개) | 4 | 767 | `2-9 진행해줘` |
| **2-10** | `components/board/updateEnsembleDrawers` | 4 | 479 | `2-10 진행해줘` |
| **2-11** | `components/teams` (index + Drawer 3개) | 4 | 679 | `2-11 진행해줘` |
| **2-12** | `components/teams/addTeamDrawers` | 6 | 509 | `2-12 진행해줘` |
| **2-13** | `components/teams/updateTeamDrawers` | 5 | 453 | `2-13 진행해줘` |
| **2-14** | `components/teams/addEnsembleDrawers` | 4 | 419 | `2-14 진행해줘` |
| **2-15** | `App.jsx` + 마무리 (`allowJs` 끄기 등) | 1 | 52 | `2-15 진행해줘` |

- 작은 단계는 묶어서 지시해도 된다. 예: `2-5, 2-6 진행해줘`, `2-1~2-3 진행해줘`. 이때도 **커밋은 단계별로** 나눈다.
- `2-4 context`가 끝나면 컴포넌트 단계는 서로 독립적이라 순서를 바꿔도 된다. 단 `2-5 common`은 모든 컴포넌트가 쓰므로 먼저 한다.
- 한 단계가 끝나면 다음 지시 전에 결과(변경 요약, 발견한 이상한 점)를 보고한다.

---

## 2-0. 시작 전에 정할 것 ✅ 완료 (2026-11-19, 4개 항목 모두 추천안 채택)

`2-0 진행해줘`라고 지시하면, 아래 항목의 추천안으로 진행한다. 다르게 하고 싶은 항목만 함께 지시한다.
(예: `2-0 진행해줘. Zod는 parse까지 적용해줘`)

| # | 결정 사항 | 선택지 | 추천 | 이유 |
|---|---|---|---|---|
| 1 | Zod 적용 범위 | (a) 스키마 정의 + `z.infer`로 타입만 / (b) API 응답을 `parse`까지 | **(a)** | (b)는 스키마와 다른 응답이 오면 에러가 나는 **동작 변경**이다. `parse`는 3단계 TanStack Query 도입 때 함께 붙인다. |
| 2 | styled-components 커스텀 props | (a) 이름 그대로 두고 타입만 / (b) `$isToday` 같은 transient props로 변경 | **(a)** | (b)는 DOM으로 새는 경고를 없애지만, styled-components 자체를 View 개편 때 걷어낼 예정이라 이중 작업이다. |
| 3 | tsconfig 추가 엄격 옵션 (`noUncheckedIndexedAccess` 등) | 켜기 / 끄기 | **끄기** | `idx2hour[idx]`, `blocks[day][hour]` 같은 인덱스 접근이 많아, 켜면 뷰 코드에 `!`·가드가 대량으로 생긴다. 2단계 완료 후 다시 검토한다. |
| 4 | Drawer ID | (a) `string` / (b) 30개 ID의 union 타입 `DrawerId` | **(b)** | 오타를 컴파일 단계에서 잡는다. 순수 타입이라 동작 변화가 없다. |

2-0에서 만드는 것:

- `pnpm add zod`
- `src/types/` 도메인 타입 (아래 초안). 이후 단계에서 실제 코드에 맞춰 다듬는다.

```ts
// 서버 응답 원본 (api.js의 mongoose 스키마 기준)
TeamResponse     { _id, name, type, desc: string[], publishDate?, pin? }
EnsembleResponse { _id, teamId, teamName, day, startTime, endTime, repeat, nextDate, due, type? }
NoteResponse     { _id, text, pin? }
NoticeResponse   { _id, content, publishDate? }

// 앱 내부 (context/fetch에서 정제한 형태)
Team          { id, type, name, desc }        // desc: [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트]
EnsembleBlock { id, day, startTime, endTime, teamId, name, repeat, nextDate: Dayjs, due,
                displayName, teamColor }
EnsembleBoard = EnsembleBlock[][][]           // [요일 0~6][시간칸 0~29][겹치는 합주들]
Note          { id, text }
Notice        { id, text }
TimeSlot      = number                        // idx2hour의 인덱스 (0~29, 30분 단위)
DrawerId      = 'teamInfo' | 'addTeam1' | ... // 30개
```

---

## 단계별 메모 (작업 시 주의할 점)

### 2-1. constants, styles
- `constants`: `days`, `hours`, `idx2hour`는 `as const`. `eventIds`는 `includes(string)` 비교 때문에 `readonly string[]`로 둔다. (2-1에서 확정)
- `styles/media.js`: tagged template과 `(props) => ...` 함수를 모두 받는 헬퍼라 타입이 가장 까다롭다. styled-components의 `css`/`Interpolation` 타입으로 표현하고, 호출하는 쪽 코드는 바꾸지 않는다.
- `GlobalStyle`: woff2 import는 `vite/client` 타입이 처리한다.

### 2-2. api
- `get<T>()` 같은 제네릭으로 응답 타입을 받는다. 반환 타입은 `src/types/`의 `XxxResponse`를 쓴다.
- `ensemble.js`의 `ensemble?id=`처럼 앞에 `/`가 빠진 경로가 있다. baseURL과 합쳐져 지금도 동작하므로 **그대로 둔다** (3단계 정리 대상으로 기록).
- `xxxExists`는 응답 본문이 아니라 404 여부로 판단한다. 타입은 `Promise<boolean>`으로 둔다.

### 2-3. hooks
- `useMessage`: `[message, contextHolder]` 튜플 반환 타입을 명시한다. 렌더링마다 새 객체를 반환하는 문제는 3단계 대상이므로 손대지 않는다.

### 2-4. context ⚠️ 가장 중요한 단계
- 각 Context에 `interface XxxContextValue`를 정의하고, `createContext<XxxContextValue | null>(null)`로 만든다.
- `useXxxContext()` 훅은 Provider 밖에서 호출되면 에러를 던지게 한다. 지금은 모든 사용처가 Provider 안이므로 동작 변화가 없다.
- `fetch`의 `teamColor: colorMap[teamId] ?? -1`은 `string | -1` 타입이 된다. 이상한 값이지만 **그대로 타입에 반영**하고 3단계에서 정리한다.
- `fetch`의 `nextDate` 계산(삼항 4단 중첩)은 타입만 붙이고 로직은 건드리지 않는다.
- 이 단계 후 App 스모크 테스트가 통과하면 컴포넌트 단계로 넘어간다.

### 2-5. components/common
- `Drawer`의 props(`drawerId: DrawerId`, `focusInputRef` 등)가 모든 Drawer 컴포넌트의 기반이 된다.
- `OkButton` 전환 후 `OkButton.test.tsx`의 `disabled={false}` 우회 코드를 제거한다.
- antd 컴포넌트를 감싼 styled 컴포넌트는 antd의 props 타입(`ButtonProps`, `InputProps` 등)을 확장한다.

### 2-6 ~ 2-14. 기능별 컴포넌트
- 각 폴더의 `index`가 하위 Drawer에 콜백(`handleAddTeam`, `checkTeamExists` 등)을 내려준다. 콜백 타입은 `index` 쪽에 정의하고 Drawer props에서 재사용한다.
- 파일마다 반복되는 `Title`, `Header` 같은 styled 컴포넌트는 **중복이어도 그대로 둔다** (View 개편 대상).
- `TeamInfoDrawer`의 key 없는 Fragment 등 린트 지적 사항은 고치지 않는다 (3단계, 승인 후).

### 2-15. App + 마무리
- `App.jsx` → `App.tsx`
- `tsconfig.json`: `allowJs`, `checkJs` 제거
- `src/` 아래 `.js`/`.jsx`가 0개인지 확인
- Oxlint에 `typescript/no-explicit-any`를 에러로 추가
- `docs/MIGRATION.md`의 2단계를 ✅로 표시

---

## 매 단계 공통 절차 (지시하면 이렇게 진행한다)

1. 대상 파일을 `git mv`로 `.ts`/`.tsx`로 바꾼다 (JSX가 있으면 `.tsx`).
2. 타입을 붙인다. props는 `interface XxxProps`, 공용 타입은 `src/types/`.
3. 검증:
   - `pnpm typecheck` 통과 (`any`, `@ts-ignore`로 덮지 않음. 불가피한 `any`는 `// TODO(type): 이유`)
   - `pnpm test:run` 통과
   - `pnpm build` 통과
   - `pnpm lint`: 에러·경고 수가 늘지 않음 (기준: 에러 5 · 경고 62)
   - `pnpm format:check` 통과
4. `docs/MIGRATION.md`에 작업 로그를 추가한다.
5. 커밋: `refactor(<scope>): TS 전환` (예: `refactor(context): TS 전환`)

### 진행을 멈추고 먼저 보고하는 경우

- 타입을 붙이다가 **실제 버그**를 발견했을 때 (예: `undefined` 접근 가능성)
- 타입 에러를 해결하려면 **로직이나 JSX 구조를 바꿔야** 할 때
- `any` 외에 방법이 없을 때
- 단계 범위 밖의 파일을 고쳐야 할 때 (단, 다른 파일이 새 타입을 import하도록 바꾸는 정도는 허용)

이 경우 해당 부분은 손대지 않고, 무엇이 문제인지와 선택지를 보고한 뒤 지시를 기다린다.

---

## 참고: 범위 밖에서 발견한 문제

- **백엔드가 팀·메모 PIN을 클라이언트에 그대로 보낸다** (`GET /teams`, `GET /notes`). → 백엔드 개발자에게 전달됨 (2026-11-19). 프론트엔드에서는 추가 조치하지 않는다.
  타입에서는 `pin`을 응답 타입에만 optional로 두고, 앱 내부 타입(`Team`, `Note`)에서는 제외한다.
