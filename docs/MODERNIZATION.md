# 프론트엔드 최신화 검토

> 마이그레이션 1~3단계(CRA → Vite, JS → TS, 내부 로직 개선) **외에** 추가로 최신화할 항목을 정리한 문서.
> 표기: ✅ 적용 완료 · 📌 적용 예정 · 🔍 검토 · ❌ 제외
> 진행 상황 기록은 `docs/MIGRATION.md`, pnpm 명령어는 `docs/archive/PNPM.md`에서 따로 관리한다.
>
> 기준 시점: 2026-11 / Node 24, npm 10, TypeScript 7.0.2, Vite 8

---

## 🔴 우선순위 높음: 2·3단계 전에 하면 좋은 것

### 1. 린터·포매터 다시 넣기 → **Oxlint + Prettier** (또는 Biome) ✅ 적용 완료

CRA에는 ESLint가 내장돼 있었는데, Vite로 옮기면서 **린트가 완전히 빠졌다.** 지금 코드에서 바로 잡히는 문제들:

- `src/components/notice/index.jsx`의 `handleClickDelete`는 deps가 `[]`라서 예전 시점의 `checkNoticeExists`, `message`를 계속 참조한다.
- `checkEnsembleExists`에 `setTeamStates`, `handleSkipEnsemble`에 `setNextDate`가 deps에서 빠져 있다.
- `src/App.jsx`처럼 탭과 스페이스가 섞인 파일이 있다.

**재검토 결과 (도구 선택 변경)**

- 처음에는 ESLint 9 + `typescript-eslint`를 추천했으나, 확인해 보니 `typescript-eslint@8.73`의 peer 범위가 `typescript >=4.8.4 <6.1.0`이다.
  이 프로젝트는 **TypeScript 7(Go 네이티브)** 을 쓰므로 그대로는 설치되지 않고, TS 6을 따로 깔아야 한다.
- **Oxlint**는 TS 컴파일러 API에 의존하지 않아 TS 7과 충돌이 없고, ESLint보다 수십 배 빠르다.
  `react-hooks/exhaustive-deps`, `react/*`, `typescript/*` 규칙을 지원하며, 타입 기반 규칙(type-aware)은 tsgo 기반 `tsgolint`로 동작한다.
- 포매터는 Prettier가 가장 무난하다. 도구를 하나로 줄이고 싶다면 **Biome**(린트 + 포맷 통합)도 좋은 대안이다.
- React Compiler 전용 린트 규칙(eslint-plugin-react-hooks 최신판)이 필요해지는 시점(10번)에는 ESLint 병행 여부를 다시 검토한다.

### 2. 경로 alias를 `@/`로 바꾸기 ✅ 적용 완료

지금은 `tsconfig.json`의 `paths: { "*": ["./src/*"] }`로 `'constants'`, `'context'`, `'hooks'`, `'App'`을 그대로 import한다.

- `constants`는 **Node 내장 모듈 이름과 겹치고**, `context`, `hooks`도 npm에 같은 이름의 패키지가 있다.
- `*` 와일드카드 매핑은 도구마다 해석 순서가 달라 깨지기 쉽다(Vitest, Oxlint 등 새 도구를 붙일 때마다 설정 필요).
- `@/`는 사실상 업계 표준이며, 9번에서 추천하는 **shadcn/ui의 기본 alias가 `@/`** 다.

**재검토 결과**

- 방향은 맞지만, 현재 `CLAUDE.md`에 "import 경로는 기존 방식(bare import)을 유지한다"는 규칙이 있다.
- 순수 기계적 치환이라 **TS 전환 전에 별도 커밋(`refactor: ...`)으로 한 번에** 하는 게 가장 싸다. TS 전환 도중이나 이후에 하면 diff가 섞인다.
- 진행하려면 `CLAUDE.md` 규칙을 `@/` 방식으로 먼저 바꾼다.

### 3. 직접 쓰는 의존성 명시 + **pnpm 전환** ✅ 적용 완료

- `dayjs`는 7개 파일에서 import하는데 **package.json에 없다.** antd를 통해 간접 설치된 패키지(phantom dependency)에 기대고 있어, UI 라이브러리를 바꾸면 바로 깨진다.

**재검토 결과 (필수와 선택을 분리)**

- **필수:** `dayjs`를 dependencies에 명시하고, 사용하지 않는 패키지(MUI, Emotion 등)를 정리한다. 이건 npm으로도 해결된다.
- **선택(권장):** pnpm 전환. 엄격한 `node_modules` 구조로 phantom dependency를 **구조적으로** 막아주고, 설치가 빠르고 디스크를 적게 쓴다.
  다만 1인/소규모 프로젝트에서 npm이 막는 일은 없으므로 "해야 한다"까지는 아니다.
- 전환 시 함께 할 것: `package.json`에 `packageManager` 필드, `.nvmrc`(Node 24) 추가, `package-lock.json` 삭제, `CLAUDE.md`의 명령어를 `pnpm`으로 갱신.

### 4. 3단계(로직 수정) 전에 **Vitest**로 테스트 깔기 ✅ 적용 완료

- `"test": "vitest"` 스크립트가 있고 `CLAUDE.md`에도 `npx vitest run`이 적혀 있지만 **vitest가 설치돼 있지 않다.** 남아 있는 `@testing-library/*@13`은 Jest 시절 버전이고, 테스트 파일도 없다.
- `src/context/fetch.jsx`의 `nextDate` 계산(삼항 4단 중첩)과 시간 블록 정제 로직은 3단계에서 반드시 건드린다.
  "동작이 바뀌지 않는 범위에서만 개선"이라는 규칙을 지키려면 **고치기 전에 현재 동작을 고정하는 테스트(characterization test)** 가 사실상 필수다.
- 구성: Vitest(Vite 설정 공유) + React Testing Library v16 + MSW(API 모킹). 날짜 로직은 `vi.setSystemTime`으로 현재 시각을 고정해 테스트한다.
- 순서: 로직을 순수 함수로 먼저 분리할 필요 없이, 우선 `fetchData`의 정제 부분을 그대로 테스트할 수 있는 수준이면 충분하다.

---

## 🟡 적용 예정: 아키텍처 (3단계와 함께)

### 5. 서버 상태: TanStack Query ✅ 적용 완료 (3-5·3-7·3-8)

현재 `fetchData()` 패턴의 문제:

- 4개 API를 **순서대로 await**한다(waterfall). 병렬로 보내지 않는다.
- 작은 변경 하나에도 **전체 데이터를 다시 불러온다.**
- loading과 error 상태가 없고, 요청 취소나 중복 제거도 안 된다.
- 매번 `xxxExists()`로 확인 요청을 한 번 더 보낸 다음 실제 요청을 보낸다.

적용 방향: 리소스별 query로 분리하고, mutation 후 해당 데이터만 invalidate한다. 삭제된 리소스(404)는 사전 확인 요청 대신 mutation 에러로 처리한다.
구체적인 query·mutation 설계는 `docs/archive/LOGIC_IMPROVEMENT_PLAN.md`의 "목표 아키텍처".

### 6. 클라이언트 상태: Zustand ✅ 적용 완료 (Drawer 3-9, 폼 입력은 Drawer 로컬 상태 V-2~V-5, 보고 있는 팀·합주 V-6)

- 각 Provider가 `value={{...}}`를 매번 새 객체로 넘겨서, **팀 이름 입력 한 글자마다 TeamContext를 구독하는 컴포넌트 전체가 다시 렌더링된다.**
- `orgXxx` 상태 복제 패턴(수정 취소 시 복원용)은 store 안에서 "draft와 원본"으로 표현한다.
- selector로 필요한 값만 구독해 리렌더링 문제를 구조적으로 해결한다.
- 서버 데이터(teams, ensembles, notes, notices)는 5번(TanStack Query)으로 가고, Zustand에는 UI·폼 상태만 남긴다.

**범위 재검토 (2026-11-20):** View 개편 때 Drawer가 "단계별 여러 Drawer"에서 "Drawer 하나에서 모두 입력"으로 바뀐다.
team·ensemble Context는 단계 사이에 입력값을 넘기려고 존재하므로, 개편 후에는 폼 로컬 상태(react-hook-form + Zod)로 흡수된다.
그래서 3단계에서는 **Drawer 상태만 Zustand로** 옮기고, team·ensemble은 View 개편 때 정리하는 안을 추천한다 (3단계 계획 사전 결정 1번).

### 7. API 경계 검증: Zod ✅ 적용 완료 (스키마·타입 2-0, 응답 항목 단위 검증 3-4, 합주 범위 검증 3-10)

2단계에서 API 응답 타입을 `interface`로만 적으면 런타임에는 아무것도 보장되지 않는다.
Zod 스키마로 응답을 parse하면서 `_id → id` 같은 변환도 같이 처리해, 타입과 데이터 정제를 한 곳에 모은다.
타입은 `z.infer`로 스키마에서 뽑아 `src/types/`의 도메인 타입과 일치시킨다.

- ✅ 2-0: `src/types/response.ts`에 서버 응답 스키마 4개와 `z.infer` 타입 정의, 2-2에서 API 응답 타입으로 연결
- 📌 3단계: 응답을 실제로 `parse`하는 것은 스키마와 다른 응답에 에러가 나는 동작 변경이라 TanStack Query 도입 때 함께 적용 (2-0 사전 결정 1번)

---

## 🟢 적용 예정: View 개편

> **View 개편의 진행 방식·사전 결정·단계·체크리스트와 8·9번 상세는 `docs/archive/VIEW_REDESIGN_PLAN.md`로 옮겼다** (2026-11-23).

### View 개편 체크리스트 (3단계에서 넘긴 일) → `docs/archive/VIEW_REDESIGN_PLAN.md`

### 8. 스타일링: Tailwind CSS v4 ✅ 적용 완료 (V-1 도입, V-6에 styled-components 제거, 2026-11-26) → `docs/archive/VIEW_REDESIGN_PLAN.md`

### 9. UI 라이브러리: shadcn/ui ✅ 적용 완료 (V-1 도입, V-6에 antd 제거, 2026-11-26) → `docs/archive/VIEW_REDESIGN_PLAN.md`

### 10. React 19 ✅ 적용 완료 (2026-11-19) / React Compiler ✅ V-1에서 적용 (2026-11-23, Babel판 1.0)

**결론: React 19로 올려야 한다. 시점은 2단계(TS 전환) 시작 전을 권장한다.**

올려야 하는 이유:

1. **shadcn/ui가 React 19를 전제로 한다.** 현재 shadcn/ui 컴포넌트는 `forwardRef` 없이 `ref`를 일반 prop으로 받는 React 19 문법으로 작성돼 있다.
   React 18에서는 `ref`가 prop으로 전달되지 않아 ref가 조용히 동작하지 않는다. 이 앱은 `focusInputRef`로 입력 포커스를 많이 다루므로 직접 영향을 받는다.
2. **TS 전환 전에 올려야 재작업이 없다.** `@types/react` 19는 타입 수준의 변경이 있다(`useRef()`에 초기값 필수, 전역 `JSX` 네임스페이스 제거 → `React.JSX`, `ReactElement` props 기본값 `unknown` 등).
   18 타입으로 전환을 마친 뒤 올리면 타입을 한 번 더 고쳐야 한다.
3. **React 18은 더 이상 기능 개발이 없다.** 현재 최신은 19.3이고, 생태계(TanStack Query, Zustand, shadcn/ui, React Compiler)가 19를 기준으로 움직인다.

비용은 낮다:

- React 19에서 제거된 API(`defaultProps`, `propTypes`, `forwardRef` 필요성, `findDOMNode`, `ReactDOM.render`, string ref) 사용처가 **0건**이다.
- antd v5는 공식 지원 범위가 React 16~18이라 `@ant-design/v5-patch-for-react-19`를 진입점에 한 줄 import해야 한다. antd를 shadcn/ui로 교체하면 제거한다.
- styled-components 6은 React 19를 지원한다.

React Compiler는 별도로 검토한다:

- 코드 전체에 `useCallback`이 깔려 있지만, `useMessage`가 렌더링마다 새 `message` 객체를 반환해서 **실제로는 메모이제이션이 거의 효과가 없다.**
- Compiler(1.0)를 쓰면 수동 `useCallback`/`useMemo`를 대부분 지울 수 있다. 다만 3단계에서 Context → Zustand, fetch → TanStack Query로 바뀌면 수동 메모이제이션 자체가 많이 줄어들므로, 그 이후에 도입 여부를 판단한다.

**3단계 후 판단 메모 (2026-11-23): View 개편 때 함께 도입 여부를 정한다**

- 알림(`useMessage`)을 삭제해, 렌더링마다 새 객체가 deps로 들어가 메모이제이션을 무력화하던 문제는 사라졌다
- 남은 수동 `useCallback`은 컨테이너 4개와 Drawer(약 30개)에 있다. Drawer는 View 개편 때 대부분 다시 쓰이므로, 지금 Compiler를 넣어도 이득이 작다
- 새 폼·컴포넌트를 처음부터 Compiler 전제로 쓰면(수동 메모이제이션 없이) 가장 저렴하다 → View 개편 시작 시점에 켜는 것을 권장
- 확인할 것: Compiler 규칙 위반으로 이어질 수 있는 기존 코드(effect 안 setState 3건, ISSUES V3), Vite 플러그인 구성(`@vitejs/plugin-react`의 Babel 설정), Oxlint로 대신할 수 없는 Compiler 전용 린트 규칙의 필요 여부(1번)

---

## 🧹 1단계(Vite 전환) 잔여물 ✅ 처리 완료

- ✅ **사용하지 않는 패키지:** `@mui/*`, `@emotion/*`, `react-modal`, `react-router-dom`, `web-vitals`, `@testing-library/*`(구버전) 제거
- ✅ **`index.html`:** CRA 안내 주석 제거, description 한국어로 교체, `lang="ko"`, 중복 favicon 링크 정리, `theme-color`를 앱 배경색(`#f5f8ff`)으로
- ✅ **`public/manifest.json`:** 앱 이름을 "세마치 합주판"으로, 색상을 앱 배경색으로
- ✅ **API 주소:** 하드코딩 제거 → `env/.env`의 `VITE_API_URL` 사용 (없으면 시작 시 에러)
- ✅ **env 분리:** Vite `envDir`를 `env/`로 지정. 루트 `.env`는 백엔드 전용으로 남고 Vite는 읽지 않는다.
- ✅ **디버그 코드:** `console.log` 3건 제거
- ✅ **폰트:** TTF → woff2 변환(파일당 약 2.1MB → 0.36~0.40MB, 글리프·cmap 동일 검증). 덮어써져 동작하지 않던 `src: local(...)` 중복 제거
- ✅ **Vite config loader 경고:** `"type": "module"` 대신 `vite.config.ts` → `vite.config.mts`로 해결 (루트의 CommonJS 백엔드 `api.js` 보호)
- ✅ **`.gitignore`:** CRA 템플릿(yarn PnP, npm/yarn 로그) 정리, env 규칙 추가

---

## 💡 진행 순서

```
✅ 개발 도구 정비 (Oxlint + Prettier, @/ alias, pnpm, Vitest)
✅ 1단계 잔여물 정리
✅ React 19 업그레이드 (+ antd 패치)
✅ 2단계 TS 전환 (+ Zod 스키마·타입, 응답 parse는 3단계로)
✅ 로직 개선 전 characterization test 작성 (src/context/fetch.test.tsx, 3-2에서 lib 테스트로 이전)
✅ 3단계 로직 개선 (+ TanStack Query, Zustand(Drawer), Zod 검증) — 2026-11-23 완료, 3-6 폐기·알림 삭제
  → View 개편 (Tailwind v4 + shadcn/ui, antd·styled-components 제거, Drawer 단일화) — 계획: docs/archive/VIEW_REDESIGN_PLAN.md
  → React Compiler: ✅ View 개편 V-1에서 적용 (10번)
```

---

## 부록: pnpm 자주 쓰는 명령어

### 설치와 전환

```bash
corepack enable pnpm             # Node 내장 corepack으로 pnpm 활성화 (별도 설치 불필요)
# Windows에서 EPERM이 나면 (C:\Program Files 쓰기 권한 없음) 사용자 폴더에 설치:
corepack enable pnpm --install-directory "$APPDATA/npm"

corepack use pnpm@latest         # package.json에 "packageManager" 필드 기록 + 해당 버전 고정
                                 # ⚠️ 이 명령은 package-lock을 무시하고 범위 내 최신으로 설치하므로 아래 import 필요

pnpm import                      # 기존 package-lock.json을 읽어 pnpm-lock.yaml 생성 (버전 그대로 이전)
rm -rf node_modules package-lock.json   # ⚠️ npm 시절 node_modules를 반드시 지워야 엄격 모드가 적용됨
pnpm install                     # node_modules 재생성
```

> 이 프로젝트는 2026-11-18에 위 절차로 전환 완료 (pnpm 12.21.0). 상세 기록은 `docs/MIGRATION.md`.

### 알아두면 좋은 차이점

- **phantom dependency 차단:** package.json에 없는 패키지는 import할 수 없다. 전환 직후 "모듈을 찾을 수 없음" 에러가 나면, 그 패키지를 `pnpm add`로 명시하면 된다(이 프로젝트에선 `dayjs`가 해당).
- **빌드 스크립트 승인:** pnpm 10부터 의존성의 `postinstall` 등 빌드 스크립트가 기본 차단된다. 경고가 뜨면 `pnpm approve-builds`로 필요한 것(예: `esbuild`)만 허용한다.
- **lockfile:** `pnpm-lock.yaml` 하나만 커밋한다. `package-lock.json`은 삭제한다.
