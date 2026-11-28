# 디렉터리 구조

> 새 파일을 어디에 둘지 찾는 문서. pnpm workspace 모노레포 (백엔드 개편 B-1, 2026-11-27).
> 서버(`apps/server`)는 개편 중이라 "예정"으로 표시한 곳은 해당 단계에서 생긴다 (`docs/BACKEND_PLAN.md`).

## 한눈에 보기

```
/
├── apps/
│   ├── web/                 웹 (React + Vite). 사용자가 보는 화면
│   └── server/              서버 (Express + MongoDB). API
├── packages/
│   └── shared/              웹·서버가 함께 쓰는 Zod 스키마·타입·상수
├── deploy/                  (예정 B-11) 서버에 올라가는 배포 설정: compose.yaml, Caddyfile
├── .github/workflows/       GitHub Actions: ci.yml(푸시·PR마다 검사, B-4), (예정 B-11) deploy.yml(배포)
├── docs/                    문서 (계획·기록·문제 목록). 끝난 계획은 docs/archive/
├── package.json             루트 스크립트: 모든 패키지의 검사·테스트·빌드를 한 번에
├── pnpm-workspace.yaml      workspace에 들어가는 패키지 목록
├── .oxlintrc.json           린트 설정 (전체 공통)
├── .prettierrc.json         포맷 설정 (전체 공통)
└── .env                     서버 비밀값 (커밋하지 않음)
```

## apps/web — 웹

```
apps/web/
├── index.html               HTML 껍데기 (제목, noindex, 다크 모드 깜빡임 방지)
├── vite.config.mts          Vite·Vitest 설정
├── tsconfig.json            TypeScript 설정 (`@/` = `src/`)
├── components.json          shadcn 설정 (부품 추가할 때 씀)
├── env/.env                 공개 환경변수 (`VITE_API_URL` 등, 커밋함)
├── public/                  그대로 복사되는 정적 파일 (아이콘, manifest, robots.txt)
└── src/
    ├── app/                 진입점(main.tsx)과 화면 배치(app.tsx)
    ├── features/            기능별 화면 + 그 기능만 쓰는 상태
    │   ├── schedule/        합주판: 캘린더, 빈 시간, 합주 정보·잡기·수정 Drawer
    │   ├── teams/           팀 목록, 팀 정보·추가·수정 Drawer, 소모임 정보, 팀 고정
    │   ├── notes/           날적이 카드, 남기기·삭제 Drawer
    │   ├── notices/         공지 카드, 공지 Drawer
    │   ├── settings/        설정 Drawer, 다크 모드
    │   └── admin/           관리자 화면 (/admin: 마스터 PIN 로그인, 요약·활동 기록·방문자·마스터 PIN 바꾸기. 따로 불러옴)
    ├── components/          여러 기능이 같이 쓰는 화면 부품
    │   ├── ui/              기본 부품 (shadcn: button, drawer, popover, sonner …)
    │   ├── sheet/           Drawer 공용 부품 (틀·입력 부품·PIN 단계·키보드 처리)
    │   └── layout/          헤더, 푸터, 아이폰 도구 막대 색
    ├── api/                 서버 요청 함수 (리소스별: team·ensemble·note·notice, pin: PIN 확인 결과, visit: 방문, admin: 관리자)
    ├── queries/             TanStack Query 훅 (조회·변경, 다시 불러오기)
    ├── lib/                 화면과 관계없는 계산 (날짜·합주판 배치·변환 등)
    ├── stores/              여러 기능이 쓰는 전역 상태 (Zustand: 열린 Drawer, 보고 있는 팀·합주)
    ├── hooks/               여러 기능이 쓰는 훅 (오늘 날짜, 키보드 높이, 스크롤에 헤더 숨김)
    ├── types/               도메인·요청 타입 (응답 스키마는 packages/shared에 있고 index.ts가 다시 내보낸다, B-8)
    ├── constants/           고정 값 (요일·시간칸, 팀 색 20종)
    ├── styles/              index.css (Tailwind·색 토큰·다크 모드), 빗금 패턴
    ├── assets/fonts/        나눔스퀘어 네오
    └── test/                테스트 공용 (MSW 서버, render, fixtures, setup)
```

## apps/server — 서버

TypeScript를 Node가 바로 실행한다 (빌드 없음, B-3). "예정"은 해당 단계에서 생긴다.
```
apps/server/
├── package.json · tsconfig.json
├── vitest.config.mts        테스트 설정 (서버 시간대 UTC: 운영 서버처럼. 날짜 계산은 코드가 한국 시간으로)
├── Dockerfile               (예정 B-11) 운영 이미지
├── .dev-db/                 개발 서버의 메모리 DB 데이터·로그 (커밋 안 함, pnpm dev:server·dev:server:sample이 만듦)
├── scripts/                 서버 앱이 아닌, 사람이 터미널에서 직접 실행하는 프로그램 (아래 "서버 자세히")
│   ├── dev-prod-db.ts       [개발] 내 PC 서버를 운영 DB에 연결 (pnpm dev:server, 루트 .env)
│   ├── dev-sample.ts        [개발] 내 PC 서버를 메모리 MongoDB + 예시 데이터로 (pnpm dev:server:sample)
│   ├── port-check.ts        [개발] 위 둘이 켜기 전에 포트 확인 (이미 켜 둔 서버가 있으면 알림)
│   ├── hash-pins.ts         [데이터 변경, 한 번] 기존 평문 PIN을 해시로 (기본 세어 보기, --apply. B-14 때)
│   └── remove-ensemble-type.ts [데이터 변경, 한 번] 합주의 옛 type 필드를 지움 (기본 세어 보기, --apply. B-14 때, B-8)
├── src/
│   ├── main.ts              시작: 설정 검사 → DB 연결 → HTTP(S) 실행 → 종료 신호 처리
│   ├── app.ts               Express 앱 조립: createApp({ masterPin, logFile }) (테스트는 이것만 가져다 씀)
│   ├── config.ts            환경변수 읽기·검사 (MONGO_DB·MASTER_PIN 필수, PORT·LOG_FILE·TLS_*)
│   ├── models/              MongoDB 스키마 (team·ensemble·note·notice·setting(마스터 PIN)·activity(활동 기록))
│   ├── routes/              API (teams·ensembles·notes·notices·visits·health·admin)
│   ├── middleware/          모든 요청이 라우트 전에 거치는 처리 (cors: 다른 주소의 웹 허락, visitor: 방문자 쿠키)
│   ├── jobs/                (예정 B-9) 정해진 시간에 도는 일 (날짜 지난 팀·합주 정리)
│   ├── lib/                 라우트가 불러 쓰는 함수 (activity·device: 활동 기록, admin-session: 관리자 로그인, pin·pin-auth·pin-guard·pin-check: PIN, validate: 요청 검사, time: 한국 날짜, pin-migration·ensemble-type-migration: 데이터 변경)
│   └── types/               Express에 붙이는 타입 (req.visitorId)
└── test/                    API 테스트 (메모리 MongoDB, 실제 DB·포트 없음)
    ├── setup.ts · helpers.ts  DB 켜기·비우기, 임시 로그 파일, 요청·데이터 도우미
    └── *.test.ts            팀·합주·날적이·공지·공통 처리(middleware)·설정·health·PIN(pin, pin-limit)·삭제 안전·생성 시각·활동 기록·관리자·한국 날짜(time)·웹과의 약속(contract)·type 지우기
```
- 가져오기는 실제 파일 확장자로 (`./app.ts`), 타입만 가져올 때는 `import type`. enum·namespace처럼 타입만 지워서는 실행되지 않는 문법은 쓰지 않는다 (Node가 타입만 지우고 실행하므로)
- 새 API: `routes/<리소스>.ts`에 `xxxRouter(의존성)` 함수를 만들고 `app.ts`에서 `app.use`
- 테스트는 `apps/server/test/<리소스>.test.ts` (API를 요청으로 검사하므로 코드 옆이 아니라 한곳에). 순수 함수 단위 테스트가 생기면 웹처럼 그 파일 옆에

## packages/shared — 공유

```
웹과 서버가 똑같이 알아야 하는 것 (B-8). 웹(Vite)·서버(Node가 바로 실행) 둘 다 이 `.ts` 파일을 그대로 가져다 쓴다 (빌드 없음)
```
packages/shared/
├── package.json · tsconfig.json   (zod, 테스트는 vitest)
└── src/
    ├── index.ts             내보내는 것 전부 (가져오기: import { … } from '@semachi/shared')
    ├── limits.ts            입력 길이 제한 (팀명·팀원·셋리스트·날적이). 웹 입력칸과 서버 검사가 같은 값
    ├── request.ts           요청 본문·주소 값(id)의 Zod 스키마. 서버가 라우트에서 검사한다 (틀리면 400)
    ├── response.ts          목록 응답의 Zod 스키마. 웹이 응답을 검사하고, 서버 테스트(contract)가 맞는지 본다
    └── response.test.ts     응답 스키마 테스트
```
- 브라우저·Node 전용 기능(DOM, `fs` 등)은 쓰지 않는다. 가져오기는 `.ts` 확장자로 (서버 규칙과 같음)
- 이름이 웹 `types/`와 겹치지 않게: 공유 스키마는 `…BodySchema`·`…ResponseSchema`, 웹 요청 타입(Dayjs 값)은 `…Request`

## 어디에 둘까

| 만들려는 것 | 둘 곳 |
|---|---|
| 한 기능에서만 쓰는 화면·상태·타입 | `apps/web/src/features/<기능>/` |
| 두 기능 이상이 쓰는 화면 부품 | `apps/web/src/components/` (Drawer 관련이면 `sheet/`, 기본 부품이면 `ui/`) |
| 두 기능 이상이 쓰는 상태 | `apps/web/src/stores/` |
| 서버에 요청 보내기 | `apps/web/src/api/`(요청 함수) + `apps/web/src/queries/`(훅) |
| 화면 없이 계산만 하는 함수 | `apps/web/src/lib/` (현재 시각 등은 인자로 받아 테스트하기 쉽게) |
| 새 API | `apps/server/src/routes/` (+ 스키마는 `models/`, 테스트는 `apps/server/test/`) |
| 웹·서버가 둘 다 알아야 하는 모양(요청·응답)·상수 | `packages/shared/` |
| 서버 비밀값 | 루트 `.env` (커밋하지 않음). 웹 공개 값은 `apps/web/env/.env` |
| 배포 설정 | `deploy/`, `.github/workflows/` |
| 계획·기록 문서 | `docs/` (끝나면 `docs/archive/`) |

- 처음엔 기능 폴더에 두고, 다른 기능도 쓰게 되면 그때 `components/`·`stores/`·`packages/shared`로 옮긴다
- 기능 폴더 안은 파일이 많지 않아 하위 폴더 없이 둔다. 10개를 넘게 되면 나눈다

## 규칙

- **파일 이름은 케밥 표기:** `team-info-drawer.tsx`, `use-today.ts`. 컴포넌트·함수 이름은 그대로 `TeamInfoDrawer`, `useToday`
  - 윈도우는 대소문자만 다른 이름 변경을 알아채지 못한다. 대소문자만 바꿀 때는 `git mv a.tsx tmp.tsx` → `git mv tmp.tsx a-b.tsx` 두 단계로
- **테스트는 대상 파일 옆에** `*.test.ts(x)`
- **가져오기:** 웹 `src` 안은 `@/` 경로, 같은 폴더는 `./`. 공유 패키지는 `@semachi/shared`. 폴더마다 `index.ts`로 다시 내보내기(배럴)는 만들지 않는다
- **기능끼리 가져오기:** 되도록 피하고, 필요하면 그 파일을 직접 가져온다. 지금 있는 것:
  - 합주판 카드 → 팀 목록 (`schedule/schedule-card` → `teams/teams`)
  - 팀 → 합주 잡기 (`teams/teams`·`team-info-drawer`·`event-info-drawer` → `schedule/add-ensemble-store`·`add-ensemble-drawer`)
  - 설정 → 합주판 보기 방식 (`settings/settings-drawer` → `schedule/board-view-store`)
- **로직 층(`api`·`queries`·`lib`·`types`·`stores`)은 화면(`features`·`components`)을 가져오지 않는다**
- **웹과 서버는 서로를 직접 가져오지 않는다.** 둘 다 필요한 것은 `packages/shared`로
- 패키지 추가: `pnpm --filter @semachi/web add <이름>` (서버는 `@semachi/server`)

## 서버 자세히 (apps/server)

> 프론트엔드는 해 봤지만 백엔드는 처음인 사람을 위한 설명. 웹에서 비슷한 것이 있으면 괄호에 적었다.

### 요청 하나가 지나가는 길

```
브라우저 (웹의 api/ 함수가 axios로 보냄)
  │  HTTP 요청: 메서드(GET·POST·PUT·DELETE) + 주소(/team?id=…) + 헤더(쿠키 등) + 본문(JSON)
  ▼
(B-11부터) Caddy: HTTPS를 풀고, semachi.net/api/… 의 /api를 떼어 서버로 넘긴다
  ▼
Node 프로세스 — src/main.ts가 연 HTTP 서버 (한 번 켜면 계속 떠서 요청을 기다린다)
  ▼
Express 앱 — src/app.ts가 조립. 등록한 순서대로 하나씩 통과한다
  ① helmet          보안 헤더를 붙인다
  ② health 라우터    GET /health면 여기서 바로 답하고 끝
  ③ express.json    본문(JSON 글자)을 객체로 바꿔 req.body에 둔다
  ④ cors            다른 주소의 웹이면 허락 헤더 (허락 목록에 있을 때만)
  ⑤ visitor         방문자 쿠키를 읽거나 새로 만들어 req.visitorId에 둔다
  ⓪ pino-http       (맨 앞) 요청마다 운영 로그 한 줄 (메서드·주소·상태·시간)
  ⑥ 라우터들         visits·teams·ensembles·notes·notices·admin 중 메서드·주소가 맞는 핸들러 하나가 처리하고 응답
  ⑦ (아무것도 안 맞으면) Express 기본 404
  ▼
핸들러 안 (예: PUT /team): id 검사(lib/validate, 틀리면 400) → DB에서 팀 읽기(models, 없으면 404) → 본문 검사(packages/shared 스키마, 틀리면 400) → PIN 확인(lib/pin-check, 틀리면 403) → 바꾸고 저장 → res.json(...)
```

### 용어

- **미들웨어 (middleware)**: `(req, res, next) => { … }` 꼴의 함수. Express는 요청마다 등록된 미들웨어를 차례로 부른다. 각 미들웨어는 요청을 읽거나 덧붙이고(`req.visitorId = …`), 응답 헤더를 붙이고, 다음으로 넘기거나(`next()`) 직접 응답해 끝낸다. 요청 처리 파이프라인의 한 단계 (웹에서 비슷한 것: axios 인터셉터. Java라면 서블릿 필터)
- **라우터 (router)·핸들러 (handler)**: 라우터는 "메서드 + 주소 → 처리 함수" 표의 묶음(`express.Router()`), 핸들러는 그 처리 함수 하나(`router.put('/team', async (req, res) => …)`). 핸들러가 `res.json(…)`·`res.status(404)`로 답을 보낸다 (웹의 라우터와 이름은 같지만, 화면이 아니라 응답을 고른다)
- **모델 (model)**: MongoDB 컬렉션(테이블에 해당)을 코드에서 다루는 객체. Mongoose 스키마(필드 이름·타입)로 만든다. `Team.findById(id)` 처럼 쓴다. SQL의 ORM과 같은 역할이라 ODM(Object Document Mapper)이라고 부른다
- **요청 본문·쿼리·파라미터**: `req.body`(POST·PUT·DELETE의 JSON), `req.query`(주소의 `?id=…`), `req.params`(주소 안의 `/team/:id`)
- **의존성 넘기기 (dependency injection)**: 라우터가 설정·도구를 직접 가져오지 않고 인자로 받는다 (`teamsRouter({ log, pins, guard })`). 테스트가 다른 마스터 PIN·임시 로그 파일·빠른 시도 제한을 넣을 수 있다 (웹에서 props로 넘기는 것과 같은 생각)
- **프로세스·환경변수**: 서버는 OS의 프로그램 하나(Node 프로세스)로 계속 떠 있다. 설정(비밀번호·주소)은 코드가 아니라 실행할 때 주는 환경변수(`.env`)로 받는다. 코드를 바꾸지 않고 운영·베타·내 PC를 다르게 켤 수 있다

### 폴더·파일별 역할

**src/ — 서버 앱 (배포되어 계속 도는 코드)**

| 파일 | 역할 |
|---|---|
| `main.ts` | 프로그램의 시작점. 부수 효과(바깥 세상과 닿는 일)만 한다: 환경변수 검사 → DB 연결(실패하면 종료) → 포트 열기 → 종료 신호(Ctrl+C·Docker 정지)에 하던 요청 마치고 끄기. `node src/main.ts`로 켠다 |
| `app.ts` | Express 앱 조립만 한다(미들웨어·라우터를 순서대로 등록). DB 연결·포트는 없다 → 테스트가 이것만 가져다 메모리 안에서 요청을 보낸다 |
| `config.ts` | 환경변수(`MONGO_DB`·`MASTER_PIN`·`PORT`·`CORS_ORIGINS`·`TRUST_PROXY`·`PIN_HASH`…)를 읽어 검사하고 한 객체로. 없거나 틀리면 시작하지 않게(빨리 실패) |
| `types/express.d.ts` | Express의 `Request` 타입에 이 서버가 붙이는 값(`req.visitorId`)을 더한다 (TypeScript 선언 합치기) |

**src/models/ — DB에 저장하는 모양**

| 파일 | 컬렉션 | 메모 |
|---|---|---|
| `team.ts` | teams | 팀 이름·종류·멤버/셋리(`desc` 7칸)·PIN. PIN은 `select: false`(조회 결과에 기본으로 넣지 않음) |
| `ensemble.ts` | ensembles | 합주: 팀 id·요일·시간칸·반복·다음 날짜·반복 종료(`due`). `teamId` 인덱스(팀으로 빨리 찾기). `teamName`·`day`는 서버가 채운다(팀 이름·nextDate의 한국 요일, 옛 웹이 읽음). 옛 `type`은 모델에서 지웠다 (저장된 값은 B-14에 스크립트로, B-8) |
| `note.ts` | notes | 날적이 글·PIN |
| `notice.ts` | notices | 공지 글·올린 시각 |
| `setting.ts` | settings | 서버 설정을 "이름 → 값" 문서로. 지금은 `masterPin`(마스터 PIN 해시) 하나 |
| `activity.ts` | activities | 활동 기록 한 건: 언제·서버·방문자 id·IP·기기·동작·대상·바뀌기 전후·어떤 PIN(own/master, 값 없음)·결과. 1년 뒤 자동 삭제(TTL 인덱스) |

모든 모델에 `createdAt`·`updatedAt`을 서버가 자동으로 채운다 (B-5부터 만들거나 고친 문서).

**src/routes/ — API (주소별 처리)**. 파일마다 `xxxRouter(의존성)` 함수가 라우터를 만들어 돌려주고, `app.ts`가 `app.use`로 붙인다

| 파일 | 주소 |
|---|---|
| `teams.ts` | `GET /teams` 목록, `POST /team` 만들기, `PUT·DELETE /team?id=` 수정·삭제(PIN), `POST /check-team-pin`, `GET /team/:id` 있는지 |
| `ensembles.ts` | `GET /ensembles`(지난 것 빼고), `POST·PUT·DELETE /ensemble` 잡기·수정·삭제(그 팀 PIN), `GET /ensemble/:id` |
| `notes.ts` | 날적이 목록·남기기·삭제(PIN)·PIN 확인·있는지 |
| `notices.ts` | 공지 목록·올리기·삭제(마스터 PIN)·PIN 확인·있는지 |
| `admin.ts` | 관리자: 로그인·로그아웃·로그인 상태, 활동 기록 찾기, 방문자 한 명, 요약, 마스터 PIN 바꾸기 (로그인한 요청만 — 라우터 안의 `requireAdmin` 미들웨어) |
| `health.ts` | `GET /health` 서버·DB가 살아 있는지 (배포 확인용) |
| `visits.ts` | `POST /visits` 웹을 열 때 한 번 "방문" 기록 |

**src/middleware/ — 모든 요청이 라우트 전에 거치는 처리**. 어떤 API든 똑같이 해야 하는 일만 둔다

| 파일 | 역할 |
|---|---|
| `cors.ts` | 브라우저는 A 주소의 웹이 B 주소의 응답을 읽지 못하게 막는다(동일 출처 정책). 허락 목록(`CORS_ORIGINS`)의 주소면 "읽어도 된다" 헤더를 붙인다. 다른 주소에서 JSON을 보내기 전에 브라우저가 먼저 보내는 확인 요청(OPTIONS, preflight)에도 답한다. 운영은 웹과 API가 같은 주소라 필요 없다 |
| `visitor.ts` | 방문자 쿠키(`semachi_vid`, 1년)를 읽고, 없거나 이상하면 새로 만들어 응답에 심는다. 값을 `req.visitorId`에 두어 라우트가 활동 기록에 쓴다 |

라이브러리가 주는 미들웨어(`helmet` 보안 헤더, `express.json` 본문 해석)는 파일 없이 `app.ts`에서 바로 등록한다.

**src/lib/ — 라우트가 불러 쓰는 함수** (Express를 모르는 순수 로직이 대부분이라 단위 테스트하기 쉽다)

| 파일 | 역할 |
|---|---|
| `pin.ts` | PIN 해시 만들기·비교 (Node 내장 `scrypt`, 소금). 저장값이 평문이면 평문으로 비교 (운영 전환 전까지). 비교에 걸리는 시간으로 값을 짐작하지 못하게 `timingSafeEqual` |
| `pin-auth.ts` | PIN 확인 규칙: 마스터 PIN이 어디서 오는지(DB 우선, 없으면 `.env`), "마스터이거나 저장된 PIN과 맞는지", 새 PIN을 해시로 저장할지(`PIN_HASH`), 마스터 PIN 바꾸기 |
| `pin-guard.ts` | PIN 틀린 횟수 세기·막기: 대상별(팀·날적이·마스터) 10번(맞추면 0), IP 전체 30번(맞춰도 그대로), 15분. 서버 메모리의 표. 미들웨어가 아니라 핸들러 안에서 부르는 이유: 합주는 DB에서 합주를 읽어야 어느 팀의 PIN인지 알 수 있다 |
| `pin-migration.ts` | 기존 평문 PIN을 해시로 바꾸는 로직 (scripts/hash-pins.ts가 부르고, 테스트가 메모리 DB로 확인) |
| `ensemble-type-migration.ts` | 합주의 옛 `type` 필드를 지우는 로직 (scripts/remove-ensemble-type.ts가 부른다, B-8) |
| `validate.ts` | 요청 검사 (B-8): `validate(res, 스키마, req.body)` → 검사·정리한 값, 틀리면 400을 보내고 null. 핸들러 안에서 부른다 (검사한 값의 타입이 이어지게). 400 본문에는 틀린 칸·이유만 (받은 값은 없음) |
| `time.ts` | 한국 날짜 계산 (B-8 D1): `startOfKstDay`(한국 날짜의 0시), `kstDayIndex`(한국 요일, 월 0 ~ 일 6). 서버 시간대 설정과 관계없이 같은 답 |
| `pin-check.ts` | 변경 API의 PIN 확인 한곳: 막혔는지 → 비교 → 틀린 횟수 → 실패면 활동 기록과 429·403 |
| `activity.ts` | 활동 기록 남기기: 라우트가 넘긴 "무엇을·대상·결과"에 요청의 방문자 id·IP·기기를 더해 저장. 실패해도 요청은 진행. PIN을 빼는 `withoutPin` |
| `device.ts` | User-Agent 문자열을 "모바일 · iOS 18.1 · Safari 18"처럼 (bowser) |
| `admin-session.ts` | 관리자 로그인 쿠키: "만료 시각.서명"(HMAC). 서명 비밀은 서버를 켤 때마다 새로 |

옛 `log.ts`·`time.ts`(활동 로그 파일 `log.txt`)는 B-7에서 지웠다 (지금의 `time.ts`는 B-8에 새로 만든 한국 날짜 계산). 운영 로그(서버가 잘 도는지)는 `pino`가 표준 출력으로, 활동 기록(사용자가 무엇을 했는지)은 DB로 나눴다

**src/jobs/ — (예정 B-9) 요청 없이 정해진 시간에 도는 일**. 예: 매일 새벽 날짜 지난 팀·합주 정리. 운영 서버에서만 돈다 (같은 DB를 쓰는 베타가 같은 일을 두 번 하지 않게)

**scripts/ — 서버 앱이 아닌, 사람이 터미널에서 직접 실행하는 프로그램**. 배포된 서버가 스스로 부르지 않는다

| 종류 | 파일 | 설명 |
|---|---|---|
| 개발 도구 | `dev-prod-db.ts`, `dev-sample.ts` | 내 PC에서 서버를 띄우는 바깥 프로그램. 이 프로그램(부모 프로세스)이 DB 연결 정보를 준비하고(운영 DB의 `.env` 또는 메모리 MongoDB), `node --watch src/main.ts`를 자식 프로세스로 켠다. 코드를 고치면 자식(서버)만 다시 켜지고 메모리 DB는 그대로 |
| 개발 도구 | `port-check.ts` | 위 둘이 켜기 전에 포트가 비었는지 본다 |
| 데이터 변경 (한 번) | `hash-pins.ts`, `remove-ensemble-type.ts` | DB의 기존 데이터를 고치는 일회성 작업(마이그레이션). 실행 전 백업, 기본은 "세어 보기"(dry run)만, `--apply`로 실제로. 두 번 실행해도 결과가 같게(멱등). 운영 전환(B-14) 때 한 번 |

**test/ — 서버 테스트** (Vitest + supertest + mongodb-memory-server)

| 파일 | 역할 |
|---|---|
| `setup.ts` | 테스트 파일마다 한 번: 메모리 MongoDB를 켜고 연결, 테스트마다 DB를 비우고, 임시 로그 파일 |
| `helpers.ts` | `api()`(앱에 요청 보내기), `freshApi()`(시도 횟수 같은 앱 상태를 새로 시작), `insert`·`findOne`(모델을 거치지 않고 컬렉션에 직접: 옛 데이터처럼 스키마와 다른 모양도 넣으려고), 저장된 모양의 예시 데이터(`teamDoc`·`ensembleDoc`), 웹이 보내는 모양의 요청 본문(`teamBody`·`ensembleBody`, B-8 검사를 통과하는 값) |
| `*.test.ts` | 대부분 HTTP로 요청을 보내 응답·DB를 확인하는 블랙박스 테스트(B-2에서 옛 동작을 고정한 것부터). `pin.test.ts`·`config.test.ts`·`pin-limit.test.ts`의 일부는 함수 단위 |

**설정 파일**: `package.json`(의존성·스크립트), `tsconfig.json`(Node가 타입만 지우고 실행하므로 `.ts` 확장자로 가져오기·`import type`·enum 금지), `vitest.config.mts`(테스트 시간대 UTC)
