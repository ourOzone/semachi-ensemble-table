# 프론트엔드 최신화 검토

> 마이그레이션 1~3단계(CRA → Vite, JS → TS, 내부 로직 개선) **외에** 추가로 최신화할 만한 항목을 정리한 문서.
> 진행 상황 기록은 `docs/MIGRATION.md`, pnpm 명령어는 `docs/PNPM.md`에서 따로 관리한다.
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

## 🟡 아키텍처: 3단계와 함께 들어가면 효과가 큰 것

### 5. 서버 상태는 TanStack Query로

현재 `fetchData()` 패턴의 문제:

- 4개 API를 **순서대로 await**한다(waterfall). 병렬로 보내지 않는다.
- 작은 변경 하나에도 **전체 데이터를 다시 불러온다.**
- loading과 error 상태가 없고, 요청 취소나 중복 제거도 안 된다.
- 매번 `xxxExists()`로 확인 요청을 한 번 더 보낸 다음 실제 요청을 보낸다.

리소스별 query, mutation 후 해당 데이터만 invalidate, 404를 mutation 에러로 처리하는 방식으로 정리된다. 3단계 작업 범위와 상당 부분 겹친다.

### 6. 클라이언트 상태는 Zustand로 (Context 4개 대체)

- 각 Provider가 `value={{...}}`를 매번 새 객체로 넘겨서, **팀 이름 입력 한 글자마다 TeamContext를 구독하는 Drawer 수십 개가 전부 다시 렌더링된다.** 드로어 하나를 열고 닫을 때도 마찬가지다.
- `orgXxx` 상태 복제 패턴(수정 취소 시 복원용)도 store 안에서 "draft와 원본"으로 깔끔하게 표현할 수 있다.
- selector로 필요한 값만 구독하므로 리렌더링 문제가 구조적으로 해결된다.

### 7. API 경계에 Zod 두기

2단계에서 API 응답 타입을 `interface`로만 적으면 런타임에는 아무것도 보장되지 않는다.
Zod 스키마로 응답을 parse하면서 `_id → id` 같은 변환도 같이 처리하면, 타입과 데이터 정제가 한 곳에 모인다.

---

## 🟢 View 개편과 함께 결정할 것

### 8. 스타일링: styled-components 대신 Tailwind CSS v4

- styled-components는 공식적으로 **유지보수 모드**다. 런타임 CSS-in-JS라 React 19 / RSC 흐름과 맞지 않는다.
- 지금 코드에는 `.ant-drawer-close svg`처럼 **antd 내부 클래스를 덮어쓰는 코드와 `!important`가 많다.** UI 라이브러리를 바꾸면 결국 다 버리게 된다.
- 추천은 **Tailwind v4**. 런타임 없는 CSS-in-JS를 원하면 Panda CSS나 vanilla-extract, 보수적으로 가려면 CSS Modules.

### 9. UI 라이브러리

**MUI와 Emotion은 설치만 돼 있고 사용처가 0건이다.** 실제로는 antd만 쓴다.

| 선택지 | 장점 | 단점 |
|---|---|---|
| **shadcn/ui** (Radix/Base UI + Tailwind) ⭐ | 사실상 표준, 코드를 직접 소유. 이 앱의 핵심인 **모바일 Drawer(vaul)**, **Toast(Sonner)**, **PIN 입력(input-otp)** 이 모두 준비돼 있음 | 초기 세팅 작업 |
| antd v6 유지 | 마이그레이션 비용 최소 | 번들이 크고 커스텀 디자인과 계속 충돌 |

View를 크게 갈아엎을 예정이라면 **Tailwind + shadcn/ui** 추천. `useMessage` 훅은 Sonner로, `PinInput`은 input-otp로 바로 대체 가능.

### 10. React 19와 React Compiler

- 코드 전체에 `useCallback`이 깔려 있지만, `useMessage`가 렌더링마다 새 `message` 객체를 반환해서 **실제로는 메모이제이션이 거의 효과가 없다.**
- React Compiler(1.0)를 쓰면 수동 `useCallback`/`useMemo`를 대부분 지울 수 있고, deps 버그도 같이 사라진다.
- 주의: antd v5는 React 19에서 패치가 필요하다. UI 라이브러리를 정한 뒤 업그레이드한다.

### 11. (선택) Drawer 스택을 URL과 동기화

지금은 모바일에서 **뒤로가기를 누르면 드로어가 닫히지 않고 사이트를 벗어난다.**
Drawer 30여 개가 사실상 페이지 역할을 하므로, 상태를 search params(nuqs 등)와 동기화하면 UX가 좋아진다. 이 경우 react-router가 다시 필요할 수 있다.

---

## 🧹 참고: 1단계(Vite 전환) 잔여물

- **사용하지 않는 패키지:** `@mui/*`, `@emotion/*`, `react-modal`, `react-router-dom`, `web-vitals`, `@testing-library/*`(구버전)
- **`index.html`:** CRA 안내 주석, `content="Web site created using create-react-app"`, `lang="en"`(→ `ko`)
- **`public/manifest.json`:** `"React App"`, `"Create React App Sample"` 문구
- **API 주소:** `src/vite-env.d.ts`에 `VITE_API_URL`을 선언해 놓고, 실제로는 `src/constants/index.js`에 하드코딩된 URL을 쓴다.
- **루트 `.env`:** 백엔드용 변수(`MONGO_DB`, `MASTER_PIN`)와 같은 파일을 쓴다. `VITE_` 접두사만 노출되니 당장 유출되진 않지만, 프론트엔드 전용 env로 분리(`envDir` 등) 권장.
- **디버그 코드:** `console.log(teamsData)`, `console.log('zzzz')` 등
- **폰트:** TTF 3개 → woff2 변환. `@font-face`에 `src`가 중복 선언돼 있다.

---

## 💡 진행 순서

```
1단계 잔여물 정리 + dayjs 명시
  → (선택) pnpm 전환
  → Oxlint + Prettier, @/ alias 치환 (CLAUDE.md 규칙 변경 후)
  → 2단계 TS 전환 (+ Zod)
  → Vitest로 현재 동작 고정
  → 3단계 로직 개선 (+ TanStack Query, Zustand)
  → View 개편 (Tailwind + shadcn/ui, React 19 + Compiler)
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

### npm ↔ pnpm 대응표

`docs/PNPM.md` 참고.

### 알아두면 좋은 차이점

- **phantom dependency 차단:** package.json에 없는 패키지는 import할 수 없다. 전환 직후 "모듈을 찾을 수 없음" 에러가 나면, 그 패키지를 `pnpm add`로 명시하면 된다(이 프로젝트에선 `dayjs`가 해당).
- **빌드 스크립트 승인:** pnpm 10부터 의존성의 `postinstall` 등 빌드 스크립트가 기본 차단된다. 경고가 뜨면 `pnpm approve-builds`로 필요한 것(예: `esbuild`)만 허용한다.
- **lockfile:** `pnpm-lock.yaml` 하나만 커밋한다. `package-lock.json`은 삭제한다.
