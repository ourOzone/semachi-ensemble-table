# 배운 것 노트 (백엔드 개편)

> 백엔드·배포·운영을 처음 하며 단계마다 배운 것을 남긴다. 나중에 혼자 운영할 때 찾아보는 용도 (`docs/BACKEND_PLAN.md` "안내 방식").

## B-1 모노레포 (2026-11-27)

**모노레포**: 여러 프로그램(웹·서버)을 저장소 하나에 두는 방식. 반대는 프로그램마다 저장소를 따로 두는 것.
- 좋은 점: 웹과 서버가 같은 타입·스키마를 함께 쓴다(`packages/shared`). API를 바꿀 때 웹·서버를 한 커밋에서 같이 고치고 한 번에 배포한다
- 이 저장소: `apps/`(실행되는 프로그램) + `packages/`(다른 곳에서 가져다 쓰는 코드)

**pnpm workspace**: 한 저장소 안의 여러 `package.json`을 pnpm이 함께 관리하는 기능.
- `pnpm-workspace.yaml`에 패키지 폴더를 적는다 (`apps/*`, `packages/*`)
- 패키지마다 자기 `package.json`(의존성·스크립트)을 갖지만, 설치는 루트에서 한 번(`pnpm install`), 잠금 파일(`pnpm-lock.yaml`)도 루트에 하나
- 패키지 이름은 `@semachi/web`처럼 짓는다. 다른 패키지에서 `"@semachi/shared": "workspace:*"`로 가져다 쓴다 (B-8부터)

자주 쓰는 명령:

| 하고 싶은 것 | 명령 |
|---|---|
| 모든 패키지 검사·테스트·빌드 | 루트에서 `pnpm typecheck` / `pnpm test:run` / `pnpm build` (루트 `package.json`이 `pnpm -r`로 각 패키지에 넘김) |
| 패키지 하나만 | `pnpm --filter @semachi/web test:run` |
| 패키지 하나에 의존성 추가 | `pnpm --filter @semachi/server add express` |
| 웹 개발 서버 | `pnpm dev` |

- `-r`(recursive): 모든 패키지에서 실행. `--if-present`: 그 스크립트가 없는 패키지는 건너뜀 (서버엔 아직 테스트가 없다)
- 린트·포맷은 저장소 전체에 한 번 (루트 `.oxlintrc.json`·`.prettierrc.json`)

**검색 엔진 차단**: 검색 결과에서 빼려면 "읽게 두고 색인하지 말라고" 해야 한다.
- `<meta name="robots" content="noindex, nofollow">`(페이지), `X-Robots-Tag` 헤더(B-11, 서버 응답 전체)
- `robots.txt`의 `Disallow: /`는 "읽지 마"라서, 검색 엔진이 noindex 표시를 못 보고 주소만 결과에 남을 수 있다. 그래서 `robots.txt`는 열어 둔다

**실수하기 쉬운 곳**
- 폴더를 옮기면 설정 속 상대 경로가 깨질 수 있다. 이번엔 Vite·TS 설정이 웹 파일과 같이 옮겨져 그대로였고, `.gitignore`의 `!env/.env` 같은 경로는 고쳐야 했다
- 파일을 옮길 때는 `git mv`: 그냥 옮기면 git이 "지우고 새로 만듦"으로 볼 수 있어 기록을 따라가기 어렵다

## B-2 지금 서버 동작을 테스트로 고정 (2026-11-27)

**characterization test (현재 동작 고정 테스트)**: "맞는 동작"이 아니라 "지금 하는 동작"을 적은 테스트. 코드를 나누고(B-3) 버전을 올릴 때 동작이 바뀌지 않았는지 알려 준다. 이상한 동작도 일부러 그대로 적고 이름에 "현재 동작:"을 붙인다. 고칠 때(B-5~)는 그 테스트의 기대값을 함께 바꾼다
- 안 쓰면: 파일을 나누다 한 줄을 빠뜨려도 운영에 올리기 전까지 모른다. 이번에도 테스트를 처음 돌리자마자 B-1에서 넣은 `body-parser` 버전 때문에 JSON 요청이 모두 실패하는 것이 드러났다

**app과 main을 나누는 이유**: 테스트가 서버를 "켜지" 않고 앱만 가져다 요청을 보내려면, 앱 조립(`app.js`)과 실행(`main.js`: DB 연결·포트 열기·인증서)을 떼어 놓아야 한다. 웹에서 컴포넌트를 `main.tsx` 없이 렌더링해 테스트하는 것과 같다

**도구**
- **supertest**: Express 앱에 실제 포트를 열지 않고 HTTP 요청을 보낸다. `request(app).post('/team').send({...})` → 응답의 `status`·`body`·`headers`
- **mongodb-memory-server**: 테스트 동안만 진짜 MongoDB를 메모리에 띄운다. 실제 DB를 건드리지 않고, 테스트 파일마다 깨끗한 DB. 웹 테스트의 MSW(가짜 서버)와 달리 DB는 진짜라 조건(`$lt`·`$gte`) 같은 실제 동작까지 확인된다
- 시간: `vi.useFakeTimers({ toFake: ['Date'] })`로 "지금"만 고정한다. 타이머까지 가짜로 하면 DB 드라이버가 멈춘다

자주 쓰는 명령:

| 하고 싶은 것 | 명령 |
|---|---|
| 서버 테스트 | `pnpm --filter @semachi/server test:run` (watch: `test`) |
| 파일 하나 | `pnpm --filter @semachi/server exec vitest run test/teams.test.ts` |
| 테스트 하나 | 위 명령 뒤에 `-t "테스트 이름 일부"` |
| 서버 타입 검사 | `pnpm --filter @semachi/server typecheck` |

**배운 것**
- 같은 일을 하는 미들웨어를 두 번 쓰면(`bodyParser.json()` + `express.json()`) 버전 조합에 따라 깨진다. 1.x끼리는 "이미 읽음" 표시를 보고 건너뛰지만 2.x와 1.x는 서로의 표시를 모른다 → 버전 올리기(B-3)에서 하나만 남긴다
- "읽고 → 고치고 → 다시 쓰기"를 비동기로 하면 동시에 온 요청끼리 서로의 결과를 덮어쓴다(경쟁 상태). 지금 로그 파일이 그렇다(O1). 테스트에서도 앞 테스트의 덜 끝난 쓰기 때문에 가끔 실패했다
- 서버 시간대(D1): 서버는 보통 UTC다. `setHours(0,0,0,0)`의 "오늘 0시"는 서버 시간대 기준이라 한국 시각 오전 9시다. 그래서 날짜 계산은 시간대를 코드에 적어야 한다(B-5)
- 변형 검사(뮤테이션): 코드를 일부러 하나씩 망가뜨려 테스트가 잡는지 본다. 잡지 못하면 테스트가 그 부분을 보지 않는다는 뜻. 원본이 통과하는 것(기준선)을 먼저 확인하고, 망가뜨린 코드가 문법 오류면 "놓침"으로 잘못 셀 수 있다 (이번에 1건 그랬다)

**실수하기 쉬운 곳**
- 테스트가 `.env`(실제 비밀값)를 읽지 않게: 테스트용 값은 `vitest.config.mts`의 `env`에. `main.js`만 `.env`를 읽는다
- `insertOne`에 `undefined`를 넣으면 MongoDB에는 `null`로 들어간다. "필드 없음"을 만들려면 키를 빼야 한다 (`helpers.ts`의 `insert`가 뺀다)

## B-3 파일 나누기 + TypeScript + 최신 버전 (2026-11-27)

**서버 코드의 층** (웹의 `features`·`lib`처럼 역할로 나눔)
- `models/`: DB에 저장하는 모양 (Mongoose 스키마)
- `routes/`: 주소별로 요청을 받아 답하는 곳 (`router.get('/teams', ...)`)
- `middleware/`: 모든 요청이 라우트에 닿기 전에 거치는 처리 (CORS 헤더, 방문자 쿠키). `(req, res, next)`에서 `next()`를 불러야 다음으로 넘어간다
- `app.ts`(조립) / `main.ts`(실행) / `config.ts`(환경변수): 테스트는 `app.ts`만 쓰고, 실제 서버는 `main.ts`가 DB에 연결한 뒤 연다
- 의존성 넘기기: 라우터가 마스터 PIN·로그 함수를 직접 읽지 않고 인자로 받는다(`teamsRouter({ log, masterPin })`). 그래서 테스트가 환경변수를 건드리지 않고 원하는 값을 넣을 수 있다

**Node가 TypeScript를 바로 실행 (type stripping)**: Node 24는 `.ts` 파일에서 타입 부분만 지우고 실행한다. 빌드 단계가 없어 `node src/main.ts`로 끝
- 대신 규칙: 가져올 때 실제 확장자(`./app.ts`), 타입만 가져올 때는 `import type`, enum·namespace처럼 "지우기만 해서는 안 되는" 문법 금지 (`tsconfig.json`의 `erasableSyntaxOnly`가 막아 준다)
- 타입 검사는 따로: `pnpm --filter @semachi/server typecheck` (Node는 타입이 틀려도 그냥 실행한다)

**버전 올리기를 테스트로 확인하는 법**: 바뀔 만한 곳을 먼저 테스트로 고정하고(본문 없는 요청), 버전을 올린 뒤 깨진 테스트만 고친다. Express 5는 본문 없는 요청의 `req.body`를 `undefined`로 둬서 400이던 응답이 500이 됐다 → 테스트가 바로 잡았다

**health check**: `GET /health`는 "서버가 살아 있고 DB에 연결돼 있나"만 답하는 주소. 배포 뒤(B-11) 새 서버가 제대로 떴는지 자동으로 확인하는 데 쓴다. 안 쓰면: 서버 프로세스는 떠 있는데 DB가 끊긴 상태를 알 수 없다

**빨리 실패하기 (fail fast)**: 설정이 빠졌거나 DB에 연결하지 못하면 서버를 띄우지 않고 바로 끝낸다. 이전 서버는 떠 있으면서 요청마다 실패했다 → 배포가 "성공"으로 보여 문제를 늦게 안다

**종료 신호 (SIGTERM·SIGINT)**: Docker가 컨테이너를 멈출 때·Ctrl+C를 누를 때 프로그램에 보내는 신호. 받으면 새 요청을 그만 받고 하던 요청을 마친 뒤 끝낸다 (안 하면 저장 중이던 요청이 중간에 끊길 수 있다)

자주 쓰는 명령:

| 하고 싶은 것 | 명령 (저장소 루트) |
|---|---|
| 내 PC에서 서버 띄우기 (메모리 DB + 예시 데이터) | `pnpm dev:server` → http://localhost:8081 |
| 웹을 그 서버에 연결 | 다른 터미널에서 `pnpm dev:local` → http://localhost:3000 |
| 서버 살아 있나 | 브라우저에서 http://localhost:8081/health |
| 개발 데이터 처음으로 | 서버를 끄고 `pnpm --filter @semachi/server dev:reset` |
| 웹을 운영 서버에 연결 (이전과 같음) | `pnpm dev` |

**실수하기 쉬운 곳**
- `pnpm dev`(운영 API)와 `pnpm dev:local`(내 PC 서버)을 헷갈리지 않기. `dev`로 켠 화면에서 지우면 진짜 데이터가 지워진다
- 개발 서버의 PIN은 개발용(마스터 `0000`, 예시 팀 `1234`)이다. 실제 PIN과 관계없다
- 휴대폰으로 개발 서버를 보려면 `apps/web/env/.env.localserver`의 `localhost`를 PC의 IP로 바꿔야 한다 (휴대폰에서 `localhost`는 휴대폰 자신)

## B-4 CI (GitHub Actions) (2026-11-27)

**CI (지속적 통합)**: 푸시할 때마다 GitHub의 컴퓨터가 저장소를 새로 받아 내 PC에서 하던 검사(린트·포맷·타입·테스트·빌드)를 똑같이 돌린다
- 왜: 내 PC에서 검사를 잊어도, 내 PC에만 있는 파일·설정 때문에 통과했어도 잡힌다. "깨끗한 컴퓨터에서도 통과한다"가 확인된다
- 안 쓰면: 깨진 코드가 `main`에 들어가고, B-11부터는 그대로 운영에 배포된다 (CD는 CI가 통과해야만 배포하게 만든다)

**워크플로 파일 읽는 법** (`.github/workflows/ci.yml`)
- `on`: 언제 도는지 (모든 브랜치 푸시, PR)
- `jobs.check`: 할 일 묶음 하나("검사"). `runs-on: ubuntu-latest` = GitHub가 빌려주는 리눅스 컴퓨터
- `steps`: 위에서부터 차례로. `uses:`는 남이 만든 액션(예: `actions/checkout` = 코드 받기), `run:`은 터미널 명령
- 한 단계가 실패하면 그 뒤 단계는 돌지 않고 빨간 X
- 캐시: 매번 받는 것(pnpm 패키지, MongoDB 실행 파일)을 저장해 두고 다음 실행에 다시 쓴다 → 빨라진다

**결과 보는 곳**
- 저장소 → **Actions** 탭 → 실행 하나 → "검사" → 단계별 로그 (실패한 단계는 빨간 X, 펼치면 오류)
- 커밋 옆의 ✓(통과)·✗(실패)·●(도는 중), PR 화면 아래와 **Checks** 탭

**리눅스에서만 깨지는 것**: 리눅스는 파일 이름 대소문자를 구분한다(`Teams.tsx` ≠ `teams.tsx`). 윈도우는 구분하지 않아 내 PC에서는 통과해도 CI에서 깨질 수 있다. 이름만 대소문자를 바꿀 때는 `git mv` 두 단계 (`docs/DIRECTORY_STRUCTURE.md` 규칙)

**브랜치 보호**: `main`·`dev`에 직접 푸시하지 못하게 하고, PR + CI 통과가 있어야 합치게 한다 (사전 결정 6의 흐름: 작업 브랜치 → PR → `dev` → PR → `main`)

자주 쓰는 명령:

| 하고 싶은 것 | 명령 |
|---|---|
| CI 돌리기 | 푸시하면 자동 (`git push origin api3.0`) |
| CI와 같은 검사를 내 PC에서 | `pnpm install --frozen-lockfile; pnpm lint; pnpm format:check; pnpm typecheck; pnpm test:run; pnpm build` |
| 내 PC 서버를 운영 DB에 | `pnpm dev:server:prod` (+ `pnpm dev:local`) ⚠️ 실제 데이터가 바뀐다 |

**실수하기 쉬운 곳**
- `--frozen-lockfile`: 잠금 파일(`pnpm-lock.yaml`)과 `package.json`이 맞지 않으면 설치를 멈춘다. 패키지를 추가했으면 잠금 파일도 함께 커밋한다
- 브랜치 보호의 "필수 검사"는 CI가 한 번 돌고 나야 목록에 "검사"가 나타난다
- Node 버전은 `.nvmrc` 한 곳에서 정한다 (CI가 읽는다). 내 PC의 Node도 같게 맞춘다
