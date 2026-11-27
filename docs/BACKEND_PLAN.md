# 백엔드 개편 계획 (api.js → TypeScript 서버 + 자동 배포)

> 작성: 2026-11-27, 브랜치 `api3.0` (`ui3.0`에서 갈라짐). 백엔드 작업을 지시받을 때마다 이 문서를 기준으로 한다.
> 고칠 문제의 상세 설명은 `docs/archive/BACKEND_SUGGESTIONS.md`(S·D·A·O·T 항목)와 `docs/ISSUES.md`(B1~B4)에 있다.
> 프론트 개편 기록은 `docs/archive/VIEW_REDESIGN_PLAN.md`, 진행 기록은 `docs/MIGRATION.md`.

## 목표

1. **`main`에 푸시하면 자동으로 서버에 배포된다** (GitHub Actions, 지금은 사람이 서버에서 직접 옮겨 실행하는 것으로 보임)
2. 한 파일(`api.js`, 652줄)을 역할별 파일로 나누고 **TypeScript**로 옮긴다. Node·Express·Mongoose는 최신으로
3. 알려진 문제(B1~B4, S·D·A·O 항목) **대부분을 고친다**. 보안 문제부터

크게 벌이지 않는다: Express + Mongoose는 그대로 쓰고(프레임워크 교체 없음), 화면 쪽은 꼭 필요한 곳만 맞춘다.

## 지금 상태 (코드로 확인한 것)

- `api.js` 한 파일: DB 연결, 스키마 4개, 미들웨어(CORS·방문자 쿠키·로그), API 26개, HTTPS 실행(포트 8081, Let's Encrypt 인증서 파일을 직접 읽음)
- 저장소의 `package.json`에 express·mongoose·dotenv가 없다 → 서버에서 저장소를 받은 뒤 `api.js`만 따로 옮겨 실행하는 것으로 보인다 (사용자 추측, 확인 필요)
- 비밀값(`MONGO_DB`, `MASTER_PIN`)은 서버의 `.env` (루트 `.env`는 저장소에 올리지 않는다)
- 프론트는 `https://semachi.net:8081`로 요청한다 (`env/.env`의 `VITE_API_URL`)
- 테스트 없음, CI/CD 없음 (`.github/` 없음)
- 모르는 것: 서버의 Node·Express·Mongoose 버전, 실행 방식(그냥 `node`인지 pm2·systemd인지), 서버 시간대, DB 위치(같은 서버인지 MongoDB Atlas인지), **프론트가 어디서 서비스되는지**, 서버 CPU 종류(OCI 무료 서버는 ARM인 경우가 많다) → B-0에서 확인

## 사전 결정 (추천안, 사용자 확인 필요)

| # | 무엇 | 추천 | 이유 |
|---|---|---|---|
| 1 | 저장소 구조 | 같은 저장소에 `server/` 폴더(pnpm workspace)를 추가. 프론트는 지금 자리 그대로 | 프론트·백엔드를 한 번에 배포하고, API가 바뀔 때 한 커밋에서 같이 고친다. 프론트 폴더를 옮기지 않아 기존 기록·설정이 그대로 |
| 2 | 런타임 | Node 최신 LTS(B-0 시점에 확인, 프론트 `.nvmrc`와 같게), Express 5, Mongoose 최신, Zod 4 | 사용자 결정(최신으로). Express 5는 async 오류를 자동으로 넘겨 `try/catch` 반복이 사라진다 |
| 3 | TypeScript 실행 | 빌드 없이 Node가 `.ts`를 바로 실행(type stripping), 타입 검사는 `tsc --noEmit` | 빌드 단계·출력 폴더가 없어 단순하다. 조건: `enum`·`namespace` 같은 문법을 안 쓴다(`erasableSyntaxOnly`), import에 `.ts` 확장자 |
| 4 | 배포 방식 | **Docker 이미지 + docker compose + Caddy** (아래 "배포 구조") | 서버에는 Docker만 있으면 되고, 같은 이미지를 어디서나 똑같이 실행한다. 이전 버전으로 되돌리기도 이미지 이름 하나로 끝난다 |
| 5 | 주소 | 프론트 `https://semachi.net`, API `https://semachi.net/api/...` (같은 주소, 포트 없음) | 같은 주소라 CORS 자체가 필요 없어진다(S3). `:8081`·인증서 직접 읽기(O3)가 사라진다. 옮기는 동안 `:8081`도 잠깐 살려 둔다 |
| 6 | 테스트 | Vitest + supertest + 메모리 MongoDB(`mongodb-memory-server`) | 프론트와 같은 도구. 실제 DB를 건드리지 않는다 |
| 7 | 비밀값 | 서버의 `.env` 파일에만 둔다 (GitHub에는 서버 접속용 SSH 키만) | 비밀값이 GitHub로 나가지 않는다. 바꿀 일이 거의 없다 |
| 8 | 데이터 변경 | 바꾸기 전에 항상 DB 백업(`mongodump`), 변경은 한 번만 실행하는 스크립트로 | PIN 해시(S4)·날짜 형식(D1)은 기존 데이터를 바꾼다 |

## 배포 구조 (처음 보는 분을 위한 설명)

```
개발자 PC ──push──▶ GitHub (main)
                       │  GitHub Actions: 검사(타입·린트·테스트) → 이미지 만들기 → GHCR에 올리기
                       ▼
                OCI 서버 (SSH로 접속해 "새 이미지 받아서 다시 켜기")
                 ├─ caddy  : 443 포트. HTTPS 인증서 자동 발급·갱신, 프론트 파일 제공, /api 요청을 api로 전달
                 ├─ api    : Node 서버 (외부에 직접 열지 않음)
                 └─ (DB)   : 지금 쓰는 MongoDB 그대로 (위치는 B-0에서 확인)
```

- **Docker 이미지**: 프로그램과 실행에 필요한 것(Node, 패키지, 코드)을 통째로 묶은 파일. 어느 서버에서든 똑같이 실행된다
- **컨테이너**: 이미지를 실행한 것. 서버에 Node를 따로 설치할 필요가 없다
- **docker compose**: 컨테이너 여러 개(caddy·api)를 `compose.yaml` 파일 하나로 함께 켜고 끄는 도구
- **GHCR**(GitHub Container Registry): 이미지를 올려 두는 GitHub의 저장소. Actions가 올리고 서버가 받아 간다
- **Caddy**: 웹 서버. HTTPS 인증서를 알아서 받고 갱신한다(O3 해결). 설정 파일(`Caddyfile`)이 몇 줄이다
- **GitHub Actions**: 저장소의 `.github/workflows/*.yml`에 적은 일을 GitHub의 컴퓨터가 대신 해 준다 (푸시·PR 때 자동으로)
  - PR·푸시마다: 프론트·백엔드 타입 검사·린트·테스트·빌드 (CI)
  - `main` 푸시 때만: 이미지 만들어 올리기 → 서버에 SSH로 접속해 `docker compose pull && docker compose up -d` (CD)
- 되돌리기: 이미지마다 커밋 해시 태그를 붙여 둔다. 문제가 생기면 이전 태그로 다시 켠다 (방법은 문서화)

## 단계

| 단계 | 내용 | 동작 변화 | 고치는 항목 |
|---|---|---|---|
| B-0 | **조사·사전 결정** (OCI 계정 받은 뒤): 서버 상태 확인, DB 백업, 사전 결정 확정 | 없음 | – |
| B-0.5 | (선택) **긴급 보안 수정**: 지금 `api.js`에 S1·B2·S3만 고쳐 지금 방식대로 서버에 반영 | 있음 | S1, B2, S3 |
| B-1 | **현재 동작 고정**: `api.js`를 `server/`로 옮기고 실행 부분만 떼어 테스트 가능하게, API 26개의 지금 동작을 테스트로 고정 | 없음 | – |
| B-2 | **파일 나누기 + TypeScript + 최신 버전**: routes·models·middleware·lib, Express 5, Mongoose 최신, Node LTS | 없음 | T1, O6 일부 |
| B-3 | **CI**: GitHub Actions로 PR·푸시마다 프론트·백엔드 검사 | 없음 | – |
| B-4 | **CD + 첫 자동 배포**: Dockerfile, compose, Caddy, 헬스 체크, `main` 푸시 → 배포. 프론트도 함께 | 주소만 | O3, O4, S3(같은 주소) |
| B-5 | **보안·운영 수정** | 있음 | S1, B2, S2, S3 마무리, O1, O2, O5, O6 |
| B-6 | **PIN**: 변경 API가 서버에서 PIN 확인, 응답에서 PIN 제거, PIN 해시 저장 (+ 프론트 PIN 흐름 정리) | 있음 | B1, B3, S4 |
| B-7 | **입력 검증·데이터 정리**: 프론트와 같은 Zod 스키마로 검증, 시간대, 레거시 필드 | 있음 | S5, B4, D1, D3 |
| B-8 | **API 형태 정리**: 응답 형식 통일, 경로 정리 (프론트 `src/api/` 함께) | 있음 | A1, A2 |
| B-9 | **마무리**: 문서, 정리, 운영 안내 | 없음 | – |

순서의 이유:
- 테스트(B-1)를 먼저 만들어야 나누기·TS·버전 올리기(B-2)가 동작을 바꾸지 않았는지 알 수 있다 (프론트 3단계와 같은 방식)
- 보안 수정을 바로 하고 싶지만, 지금은 서버에 반영할 방법이 사람 손뿐이다. 그래서 자동 배포(B-4)를 먼저 만들고, 급한 3개만 B-0.5로 따로 낸다
- PIN(B-6)·API 형태(B-8)는 프론트도 같이 바뀐다. 한 저장소·한 번의 배포로 함께 낸다
- 처리하지 않는 것: **D2**(반복 합주의 다음 날짜를 서버가 계산, 건너뛸 날짜 목록) — 데이터 모델이 바뀌고 프론트 합주판 계산을 다시 짜야 해서 이번 범위에서 뺀다 (ISSUES V9와 함께 나중에)
- 이미 해결된 것: **D4**·**D5**(사용자가 날적이 자동 삭제·100개 제한을 지움, 2026-11-26. 공지 문구도 V-5에서 바뀜)

### B-0 조사·사전 결정 (OCI 계정 받은 뒤)

서버에서 확인할 것 (값은 기록하지 않고 "있음/없음·버전"만):
- 서버: CPU 종류(`uname -m`: `aarch64`면 ARM → 이미지를 ARM용으로 만든다), OS, 남은 디스크
- 지금 실행 방식: `ps aux | grep node`, `pm2 ls`, `systemctl list-units | grep -i node`, `crontab -l` → 무엇이 `api.js`를 켜고 있는지
- 버전: `node -v`, 실행 폴더의 `node_modules`에 있는 express·mongoose 버전
- 시간대: `timedatectl` (D1)
- 인증서: `/etc/letsencrypt/` 갱신 설정(certbot 타이머)
- DB: `.env`의 `MONGO_DB`가 가리키는 곳(같은 서버의 MongoDB인지 Atlas인지). 값은 출력하지 않는다
- 프론트: `semachi.net`(443)을 누가 서비스하는지 (nginx·Apache·다른 호스팅)
- 열린 포트: 서버 방화벽과 OCI 콘솔의 Security List(443·8081·80)
- 로그 파일 `log.txt` 위치·크기 (옮길 때 보관)
- Docker 설치 여부

그 다음:
- **DB 백업** (`mongodump`) → 백업 파일을 서버 밖에도 한 부
- 사전 결정 1~8 확정, 이 문서의 "OCI 작업 안내"를 실제 값으로 채움

### B-0.5 (선택) 긴급 보안 수정

`main`의 `api.js`에 3개만 고쳐, 지금 하던 방식(서버에서 받아 옮겨 실행)으로 반영:
- S1: `GET /` 로그 공개 → 삭제
- B2: `DELETE /teams` → 삭제 (프론트가 쓰지 않음)
- S3: CORS → 허용 주소 목록(`https://semachi.net`, 개발용 `http://localhost:5173`)

자동 배포까지 기다릴 수 없을 만큼 급하다고 판단하면 한다. 사용자 결정.

### B-1 현재 동작 고정

- `api.js` → `server/src/app.js`(앱 조립, 테스트가 가져다 씀) + `server/src/main.js`(DB 연결·HTTPS 실행). 코드는 그대로 옮기기만
- `server/package.json`: 서버의 지금 버전과 같은 express·mongoose (B-0에서 확인한 버전)
- 테스트 (`server/src/**/*.test.js`): API 26개의 정상·없는 대상(404)·잘못된 ID 등 **지금 동작 그대로** (이상한 동작도 "현재 동작"으로 표시해 고정)
- 루트에 `pnpm-workspace.yaml`, 루트 스크립트로 프론트·백엔드 검사를 한 번에

### B-2 파일 나누기 + TypeScript + 최신 버전

```
server/
  package.json · tsconfig.json · Dockerfile(B-4)
  src/
    main.ts          DB 연결 → 서버 실행 (실패하면 종료, O4)
    app.ts           express 앱 조립
    config.ts        환경변수 읽기·검사 (없으면 시작하지 않음)
    models/          team · ensemble · note · notice
    routes/          teams · ensembles · notes · notices · health
    middleware/      cors · visitor(쿠키) · errors
    lib/             log · time
shared/              프론트·백엔드가 같이 쓰는 Zod 스키마 (B-7에서 채움)
```
- 커밋을 나눈다: ① JS 그대로 파일 나누기 ② TypeScript ③ Express 5·Mongoose·Node 최신 (버전 올리면서 바뀐 API만 고침)
- 단계마다 B-1 테스트가 그대로 통과해야 한다
- 같이 정리 (동작 동일): 중복 `bodyParser`, `PORT` 상수(O6)

### B-3 CI (GitHub Actions)

- `.github/workflows/ci.yml`: PR과 모든 브랜치 푸시 때
  - pnpm 설치(캐시) → 프론트 `typecheck`·`lint`·`format:check`·`test:run`·`build` → 백엔드 `typecheck`·`test`
- `main` 브랜치 보호: CI가 통과해야 병합 (GitHub 설정, 사용자가 화면에서 켜는 방법 안내)
- 처음 쓰는 분을 위한 안내: 결과 보는 곳(PR의 Checks 탭), 실패했을 때 로그 보는 법

### B-4 CD + 첫 자동 배포

- `server/Dockerfile`: Node LTS 이미지 + 운영 의존성만 + `src/`
- 프론트 이미지: Actions에서 `pnpm build`한 `build/` 폴더 + Caddy (또는 Caddy가 서버의 폴더를 제공, B-0 결과로 정함)
- `deploy/compose.yaml`(caddy·api), `deploy/Caddyfile`:
  - `semachi.net` → 프론트 파일, `semachi.net/api/*` → api 컨테이너 (경로 앞 `/api`를 떼고 전달)
  - 옮기는 동안 `semachi.net:8081` → api (예전 프론트가 남아 있는 브라우저를 위해, 한동안 뒤 삭제)
- `GET /health`(O4): DB 연결까지 확인. compose와 배포 스크립트가 이것으로 성공 여부를 본다
- `.github/workflows/deploy.yml`: `main` 푸시 → CI 통과 → 이미지 만들기(서버가 ARM이면 ARM용) → GHCR 올리기 → SSH로 서버에서 새 이미지 받아 다시 켜기 → `/health` 확인, 실패하면 이전 이미지로
- 프론트 `VITE_API_URL` → `https://semachi.net/api`
- **처음 옮기는 날 (cutover)**: 아래 "OCI 작업 안내"의 순서대로. 기존 `api.js` 실행을 끄기 전에 새 컨테이너를 다른 포트로 띄워 확인 → Caddy로 전환 → 기존 실행 중지. 되돌리는 방법을 먼저 적어 둔다
- 이때 `ui3.0`(새 화면)·`api3.0`이 `main`에 처음 들어간다 → 첫 자동 배포가 곧 새 화면 공개

### B-5 보안·운영 수정 (항목마다 승인)

- S1: `GET /` 로그 보기 삭제 (필요하면 서버에서 직접 보는 방법 안내)
- B2: `DELETE /teams` 삭제
- S3: 같은 주소가 됐으므로 CORS는 개발용 주소만 허용 (운영은 필요 없음)
- S2: PIN 확인 API에 시도 횟수 제한 (`express-rate-limit`, IP·방문자 쿠키 기준). 마스터 PIN을 길게 바꾸는 것은 사용자 작업으로 안내
- O1: 로그를 `pino`(JSON 한 줄)로, 파일 통째로 다시 쓰기 → 이어 쓰기. 기존 `log.txt`는 보관
- O2: 방문 기록을 `GET /teams`에서 떼어 `POST /visits`로 (프론트는 처음 열 때 한 번 호출)
- O5: 삭제 API를 조회 한 번으로, 팀 삭제는 팀 먼저
- O6: `helmet`(보안 헤더), `ensembles.teamId` 인덱스, 생성 시각을 서버가(`timestamps`)
- 방문자 쿠키: 같은 주소가 됐으니 `SameSite=None` → `Lax`

### B-6 PIN (프론트와 함께)

- B1: 변경 API(팀 수정·삭제, 합주 추가·수정·삭제, 날적이 삭제, 공지 올리기·삭제)가 요청 본문의 PIN을 서버에서 확인, 틀리면 403. 마스터 PIN도 그대로 통과
- 프론트: 지금은 "PIN 확인 API → 맞으면 변경 API" 두 번 호출. PIN을 변경 요청에 함께 보내도록 (`src/api/`·mutation 훅). PIN 칸의 "입력하자마자 맞는지 표시"는 확인 API를 그대로 써서 유지
- B3: 목록 응답에서 PIN 제거 (`select: false`)
- S4: PIN을 해시로 저장 (`argon2` 또는 `bcrypt`), 비교는 해시 비교·마스터 PIN은 `timingSafeEqual`. **기존 평문 PIN을 해시로 바꾸는 1회 스크립트** (백업 후, 되돌릴 수 없음 → 실행 전 확인)

### B-7 입력 검증·데이터 정리

- S5: `shared/`에 요청·응답 Zod 스키마(프론트 `src/types/`의 응답 스키마를 옮김), 서버 라우트 앞에서 검증 → 잘못된 요청은 400. 잘못된 ID 형식도 500 대신 400
- B4: 합주 추가 때 팀이 있는지 서버가 확인 (프론트의 사전 확인 요청을 없앨 수 있다)
- D1: 시간대를 `Asia/Seoul`로 코드·컨테이너(`TZ`)에 명시, "오늘" 계산 통일. 날짜 저장 형식을 바꿀지는 B-0 결과(서버 시간대)를 보고 결정
- D3: 레거시 필드 정리 — `type`(반복 여부에서 나옴), `day`(날짜에서 나옴), `teamName`(팀 id로 채움). **`due`는 이제 반복 종료 날짜라 남긴다** (V-2 23차). 필드 제거는 프론트가 더 이상 읽지 않는 것을 확인한 뒤

### B-8 API 형태 정리 (프론트 `src/api/` 함께)

- A1: 오류 응답 `{ error: { code, message } }`로 통일, 생성 201·삭제 204
- A2: `/teams/:id`처럼 복수형·경로 id로 (`PUT /team?id=` → `PUT /teams/:id`), 존재 확인 전용 API는 대상 조회로
- 프론트는 `src/api/` 파일만 바꾸면 된다 (3단계에서 모아 둠). 같은 배포로 함께

### B-9 마무리

- `BACKEND_SUGGESTIONS.md`·ISSUES의 B 항목 상태, MIGRATION, `CLAUDE.md`(서버 작업 규칙), 운영 안내(배포 확인·되돌리기·로그 보기·백업)
- 옛 `:8081` 주소 정리 시점 안내

## OCI 작업 안내 (계정을 받은 뒤 채운다)

> 지금은 접근할 수 없어 순서만 적어 둔다. 실제 명령은 B-0 조사 결과를 보고 단계마다 하나씩 안내한다.

1. **접속 확인**: OCI 콘솔에서 인스턴스(서버) 찾기 → 공인 IP, 접속 사용자(`ubuntu`/`opc`), SSH 키 확인 → 내 PC에서 `ssh`로 접속
2. **조사**: 위 B-0 목록 (명령은 그때 하나씩 드린다)
3. **백업**: `mongodump` → 서버 밖에도 보관
4. **Docker 설치**: 서버 OS에 맞는 공식 방법 (`docker`, `docker compose`)
5. **배포용 계정·키**: GitHub Actions가 접속할 전용 SSH 키 만들기 → 공개키는 서버에, 비밀키는 GitHub 저장소 Secrets(`DEPLOY_SSH_KEY`)에. 서버 주소·사용자도 Secrets로
6. **서버 폴더**: 예) `/srv/semachi/` 아래 `compose.yaml`·`Caddyfile`·`.env`(기존 `.env`의 `MONGO_DB`·`MASTER_PIN`을 옮김)
7. **방화벽**: OCI Security List와 서버 방화벽에서 80·443 열기 (Caddy 인증서 발급에 80 필요), 8081은 옮기는 동안만
8. **첫 배포(cutover)**: 새 컨테이너를 켜서 `/health` 확인 → 기존 `api.js` 실행·기존 웹 서버 중지 → Caddy 켜기 → 화면에서 확인. 문제 시 되돌리는 명령을 미리 준비
9. **확인 후**: GitHub에서 `main` 보호 규칙 켜기, 자동 배포를 한 번 일부러 돌려 보기

## 멈추고 보고할 조건

- B-1 테스트가 B-2 이후 깨진다 (나누기·버전 올리기가 동작을 바꿨다는 뜻)
- 서버의 실제 데이터가 테스트의 가정과 다르다 (예: 스키마에 없는 필드, 형식이 다른 날짜)
- 기존 데이터를 바꾸는 작업(PIN 해시, 필드 제거, 날짜 형식) 직전 — 항상 확인받는다
- 서버에서 지금 서비스를 멈춰야 하는 작업 직전 — 시간과 되돌리기 방법을 먼저 안내
- 비밀값을 화면·로그·커밋에 내보내야만 진행할 수 있는 경우 (그렇게 하지 않고 보고)

## 작업마다 갱신할 문서

| 문서 | 무엇을 |
|---|---|
| 이 문서 | 단계 ✅, 사전 결정 확정 내용, B-0 조사 결과, 바뀐 계획 |
| `docs/MIGRATION.md` | 작업 로그 (지금 → 바꾼 후, 검증 결과) |
| `docs/ISSUES.md` | B 항목 상태. 새로 발견한 서버 문제는 B5부터 |
| `docs/archive/BACKEND_SUGGESTIONS.md` | 처리한 S·D·A·O·T 항목 표시 |
| `CLAUDE.md` | 서버 작업 규칙(B-1에서 `api.js` 수정 금지 규칙을 바꿈), 명령어 |

## 공통 검증 (작업마다)

- 프론트: `pnpm typecheck` / `pnpm test:run` / `pnpm lint` / `pnpm format:check` / `pnpm build`
- 백엔드(B-1부터): `server`의 타입 검사·테스트
- 실제 서버·DB에는 테스트를 보내지 않는다. 서버 데이터를 확인할 때는 값을 출력하지 않는다 (PIN 등)
