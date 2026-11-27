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
