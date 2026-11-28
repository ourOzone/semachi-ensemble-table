# 배포 절차서 (서버 조사 → 베타 → 운영 전환 → 평소 운영)

> 사용자가 서버(OCI)·GitHub·MongoDB Atlas 화면에서 **직접 따라 하는 문서** (백엔드 개편 B-11에서 작성, 2026-11-28).
> 계획과 이유는 `docs/BACKEND_PLAN.md` B-12~B-15, 개념 설명은 `docs/LEARNING_NOTES.md` B-11.
> **B-12 조사 결과에 따라 고칠 곳이 있다** (⚠ 표시). 실제로 할 때는 Claude가 그 단계의 명령을 하나씩 다시 안내한다.

## 읽는 법

- 명령은 **한 번에 하나씩**. 명령마다 하는 일·예상 출력·성공 확인·되돌리기를 적었다
- `<서버 IP>`처럼 꺾쇠로 감싼 것은 자기 값으로 바꾼다 (꺾쇠는 지운다)
- 🖥 = 내 PC 터미널(PowerShell·Git Bash), 🌐 = 서버에 SSH로 들어간 터미널, 🔧 = 웹 화면(OCI 콘솔·GitHub·Atlas)
- **비밀값(MONGO_DB·PIN·비밀키·암호)은 채팅·스크린샷·GitHub 이슈에 붙여 넣지 않는다.** 확인이 필요하면 "있음/없음"만
- 데이터를 바꾸는 명령(⛔ 표시)은 백업 후, Claude와 확인한 뒤에만

## 다 끝나면 서버 모양

```
인터넷 ──▶ OCI 서버 :80·:443
             └ caddy (HTTPS 인증서 자동)
                 semachi.net       → /api/* api      · 그 밖 web
                 test.158-180-85-102.sslip.io (베타, 무료 주소) → /api/* api-beta · 그 밖 web-beta (기본 인증)
           api·api-beta ──▶ MongoDB Atlas (같은 DB)

/srv/semachi/
  compose.yaml  caddy/Caddyfile  deploy.sh  backup.sh   ← 배포 때마다 GitHub Actions가 덮어씀 (저장소의 deploy/)
  .env                                                  ← 지금 켠 이미지 이름 (deploy.sh가 씀, 비밀값 없음)
  production.env  beta.env  caddy.env                   ← 비밀값 (사용자가 한 번 만듦, 서버에만)
  backups/                                              ← DB 백업 (backup.sh)
```

---

## B-12 서버 조사 (읽기만 한다. 아무것도 바꾸지 않는다)

목적: 지금 서버가 어떻게 돌고 있는지 알아서, 새 배포가 기존 서비스와 부딪히지 않게 계획을 맞춘다.
결과는 "있음/없음·버전·이름"만 Claude에게 알려 준다.

### 1. OCI 콘솔에서 볼 것 🔧

| 볼 곳 (메뉴) | 무엇 | 왜 |
|---|---|---|
| Compute → Instances → 그 서버 | Shape(예: `VM.Standard.E2.1.Micro` = x86 1GB, `VM.Standard.A1.Flex` = ARM), OCPU·메모리, Public IP, 이미지(OS) | 이미지 CPU 종류, 메모리 여유 (컨테이너 5개) |
| Networking → Load Balancers | 로드 밸런서가 있는지, 있으면 어느 포트를 어디로 넘기는지 (Listeners·Backend sets) | ⚠ 있으면 Caddy 앞에 하나 더 있는 것 → 인증서·진짜 IP 처리가 바뀐다 |
| 서버의 VCN → Subnet → Security Lists (또는 Network Security Groups) | Ingress Rules에 열린 포트 (22·80·443·8081 등) | Caddy에 80·443이 필요하다 |

### 2. 서버 안에서 볼 것 🌐

접속: 🖥 `ssh <사용자>@<서버 IP>` (평소 들어가던 방법 그대로)

| 명령 | 하는 일 | 알려 줄 것 |
|---|---|---|
| `uname -m` | CPU 종류 | `x86_64` 또는 `aarch64`(ARM) |
| `cat /etc/os-release \| head -3` | OS | 이름·버전 (Ubuntu 22.04, Oracle Linux 8 등) |
| `free -h` | 메모리 | total·available |
| `df -h /` | 디스크 | Size·Avail |
| `sudo ss -tlnp` | 어떤 프로그램이 어느 포트를 쓰는지 | 80·443·8081 줄의 프로그램 이름 (nginx·node 등) |
| `ps aux \| grep -E 'node\|nginx\|apache\|caddy' \| grep -v grep` | 웹·API를 켜고 있는 프로그램 | 명령 줄의 앞부분(경로). 비밀값이 보이면 그 부분은 빼고 |
| `pm2 list` | pm2로 켰는지 (없으면 "command not found") | 이름·상태 |
| `systemctl list-units --type=service --state=running \| grep -iE 'node\|nginx\|api\|semachi'` | 서비스로 켰는지 | 서비스 이름 |
| `crontab -l; sudo crontab -l` | 예약 작업 (재시작·인증서 갱신) | 무엇을 하는 줄인지 |
| `ls /etc/letsencrypt/live/ 2>/dev/null; systemctl list-timers \| grep -i certbot` | 인증서·자동 갱신 | 폴더 이름, 타이머 유무 |
| `node -v` | 서버의 Node | 버전 |
| `timedatectl \| grep 'Time zone'` | 서버 시간대 | 값 |
| `docker --version` | Docker 유무 | 없으면 "command not found" (지금은 없다고 함) |
| `sudo iptables -L INPUT -n --line-numbers \| head -20` 또는 `sudo ufw status` | 서버 방화벽 | 80·443 허용 줄이 있는지 |

`api.js`가 있는 폴더를 찾았으면 (예: `ps` 결과의 경로):
| 명령 | 하는 일 | 알려 줄 것 |
|---|---|---|
| `ls -la <api.js 폴더>` | 파일 목록 | `.env`·`log.txt`·`node_modules` 유무 (내용은 열지 않는다) |
| `grep -o '"version": *"[^"]*"' <api.js 폴더>/node_modules/express/package.json <api.js 폴더>/node_modules/mongoose/package.json` | 실제 버전 | 두 버전 |
| `du -h <api.js 폴더>/log.txt` | 옛 로그 크기 | 크기 (B-14에서 보관) |

### 3. 주소(DNS) 🖥

| 명령 | 하는 일 | 알려 줄 것 |
|---|---|---|
| `nslookup semachi.net` | semachi.net이 가리키는 IP | 서버 Public IP와 같은지 (다르면 웹이 다른 곳에 있다: Netlify·로드 밸런서 등) |
| `nslookup test.semachi.net` | 베타 주소가 이미 있는지 | 있음/없음 |

도메인을 산 곳(가비아·Cloudflare·OCI DNS 등)에 들어갈 수 있는지도 확인한다 (B-13에서 `beta` 레코드를 만든다).

### 4. MongoDB Atlas 🔧

| 볼 곳 | 무엇 | 왜 |
|---|---|---|
| Database → Clusters | 클러스터 등급 (M0 무료·M10 등) | M0는 Atlas 자동 백업이 없다 → `backup.sh`가 유일한 백업 |
| Security → Network Access | 접속 허용 IP 목록에 서버 IP(또는 `0.0.0.0/0`)가 있는지 | 새 컨테이너도 같은 서버에서 접속한다. 없으면 연결 실패 |
| Database → Browse Collections | 컬렉션 이름 목록 (`teams`·`ensembles`·`notes`·`notices`, 새 서버가 만든 `activities`·`settings`) | 데이터 변경 스크립트의 가정 확인 |

### ⚠ 조사 결과에 따라 갈리는 것

- **80·443을 지금 다른 프로그램(nginx 등)이 쓰고 있으면**: Caddy를 켤 수 없다. 베타 기간에 고를 수 있는 것 → **결정: ①** (B-12 결과 nginx였다. 사용자 결정 2026-11-28, B-13 "4. Caddy가 nginx 자리를 맡는다"):
  ① Caddy가 80·443을 맡고, 옛 웹은 Caddy 뒤로 옮김 (옛 웹 서버 포트를 바꾸는 작은 운영 변경)
  ② 베타를 다른 포트(`semachi.net:8443`)로, 기존 인증서 파일을 Caddy에 연결
- **semachi.net이 다른 곳(웹 호스팅)을 가리키면**: 이 서버의 80·443은 비어 있을 가능성이 크다 → 베타는 바로 이 문서대로. 운영 전환 때 DNS를 이 서버로 바꾼다
- **로드 밸런서가 앞에 있으면**: Caddy 대신 로드 밸런서가 인증서를 맡는지, 진짜 사용자 IP를 어떻게 넘기는지에 따라 `deploy/caddy/Caddyfile`(trusted_proxies)과 compose의 `TRUST_PROXY`를 고친다
- **ARM 서버**: 그대로 된다 (이미지를 ARM·x86 둘 다 만든다)
- **메모리 1GB**: 컨테이너 5개(caddy·api·web·api-beta·web-beta)는 들어가지만 빠듯하다. 전환 후 베타를 평소에 꺼 둘 수 있다

---

## B-12 이어서: Docker 설치 · 서버 폴더 · 백업

> 기존 서비스(`api.js`)는 그대로 돈다. Docker를 설치해도 기존 프로그램은 멈추지 않는다.
> ⚠ 아래는 Ubuntu 기준이다. Oracle Linux면 Claude가 그에 맞는 명령으로 바꿔 안내한다.

### Docker 설치 🌐

1. `curl -fsSL https://get.docker.com -o get-docker.sh`
   - 하는 일: Docker 공식 설치 스크립트를 내려받는다 (아직 실행하지 않음)
   - 예상: 출력 없음 / 확인: `ls -l get-docker.sh`에 파일이 보임
2. `sudo sh get-docker.sh`
   - 하는 일: Docker Engine과 `docker compose`를 설치하고 켠다 (1~3분)
   - 예상: 마지막에 `Client: Docker Engine ...`, `Server: Docker Engine ...` 버전 출력
   - 되돌리기: `sudo apt-get purge docker-ce docker-ce-cli containerd.io docker-compose-plugin`
3. `sudo usermod -aG docker $USER`
   - 하는 일: 지금 사용자가 `sudo` 없이 docker를 쓰게 한다 (docker 그룹 = 서버 관리자와 비슷한 권한)
   - 그다음 `exit`로 나갔다가 다시 `ssh`로 들어온다 (그룹은 새로 들어올 때 적용)
4. `docker run --rm hello-world`
   - 예상: `Hello from Docker!` / 확인: 이 줄이 보이면 성공
5. `docker compose version`
   - 예상: `Docker Compose version v2.x` 이상
6. `systemctl is-enabled docker`
   - 하는 일: 서버가 켜질 때 Docker도 자동으로 켜지게 등록됐는지 (재부팅 대비)
   - 예상: `enabled` / 아니면 `sudo systemctl enable docker`
   - 이것과 compose의 `restart: unless-stopped`가 함께 지금 pm2가 하는 일(재부팅 때 다시 켜기)을 맡는다: 서버 부팅 → Docker 켜짐 → 멈춘 적 없는 컨테이너를 다시 켬

### 서버 폴더 준비 🌐 🖥

1. 🌐 `sudo mkdir -p /srv/semachi && sudo chown $USER: /srv/semachi`
   - 하는 일: 배포 폴더를 만들고 지금 사용자 것으로 / 확인: `ls -ld /srv/semachi`에 사용자 이름
2. 🖥 (저장소 폴더에서) `scp deploy/production.env.example deploy/beta.env.example deploy/caddy.env.example deploy/compose.yaml deploy/backup.sh <사용자>@<서버 IP>:/srv/semachi/`
   - 하는 일: 틀 파일과 백업에 필요한 파일을 서버로 복사 (compose.yaml·backup.sh는 나중에 배포가 덮어쓴다)
3. 🌐 `cd /srv/semachi && cp production.env.example production.env && cp beta.env.example beta.env && cp caddy.env.example caddy.env`
4. 🌐 `nano production.env` → `MONGO_DB=`·`MASTER_PIN=` 뒤에 **지금 서버의 `.env`에 있는 값 그대로** 붙여 넣기 → Ctrl+O, Enter, Ctrl+X
   - 값에 `$`가 있으면 작은따옴표로 감싼다 (`MONGO_DB='mongodb+srv://…'`)
   - `beta.env`도 같은 값으로 (`PIN_HASH=false`는 그대로)
5. 🌐 `chmod 600 production.env beta.env caddy.env`
   - 하는 일: 이 파일들을 나만 읽을 수 있게 / 확인: `ls -l *.env`가 `-rw-------`
6. 🌐 `docker compose config --quiet && echo OK`
   - 하는 일: compose.yaml과 env 파일을 읽어 문법만 검사 (아무것도 켜지 않음)
   - 예상: `OK`

### ⛔ DB 백업 (데이터를 바꾸는 일 전에 항상) 🌐

1. `cd /srv/semachi && bash backup.sh`
   - 하는 일: `mongo:8` 이미지로 `mongodump`를 실행해 운영 DB 전체를 `backups/semachi-<날짜시각>.gz`로 (처음엔 이미지를 받느라 1분쯤)
   - 예상: `done dumping semachi.teams (N documents)` 같은 줄들 → `백업 완료: /srv/semachi/backups/…gz (크기)`
   - 확인: 크기가 0이 아님. 실패하면 Atlas Network Access에 서버 IP가 있는지
2. 🖥 `scp <사용자>@<서버 IP>:/srv/semachi/backups/<파일 이름> .`
   - 하는 일: 백업을 서버 밖(내 PC)에도 한 부 (서버가 망가져도 남게). **공개된 곳(GitHub 등)에 올리지 않는다** (PIN 등 모든 데이터)

### 데이터 변경 스크립트 세어 보기 (DB를 바꾸지 않음)

새 API 이미지가 서버에 있어야 한다 → 베타를 처음 배포한 뒤(B-13)에 한다. 명령은 "평소 운영 → 데이터 스크립트".

---

## B-13 베타 배포

### 1. 배포용 SSH 키 (GitHub Actions가 서버에 들어올 열쇠) 🖥 🌐

1. 🖥 `ssh-keygen -t ed25519 -f semachi-deploy -N "" -C github-actions-deploy`
   - 하는 일: 배포 전용 열쇠 한 쌍. `semachi-deploy`(비밀키, GitHub에만)와 `semachi-deploy.pub`(공개키, 서버에)
   - 평소 쓰는 내 키와 따로 두는 이유: 문제가 생기면 이 열쇠만 지우면 된다
2. 🖥 `cat semachi-deploy.pub` → 한 줄을 복사
3. 🌐 `echo '<복사한 한 줄>' >> ~/.ssh/authorized_keys`
   - 되돌리기: `nano ~/.ssh/authorized_keys`에서 `github-actions-deploy`로 끝나는 줄을 지움
4. 🖥 `ssh -i semachi-deploy <사용자>@<서버 IP> docker ps`
   - 확인: 비밀번호 없이 `CONTAINER ID ...` 머리줄이 나오면 성공
5. 🖥 `ssh-keyscan -t ed25519 <서버 IP>`
   - 하는 일: 서버의 "지문"을 읽는다 (Actions가 가짜 서버에 접속하지 않게) → 출력 줄을 복사해 둔다

### 2. GitHub 설정 🔧 (저장소 관리자 권한 필요)

1. Settings → Environments → New environment → `beta`, 또 하나 `production`
   - `production`에는 원하면 "Required reviewers"에 자기 계정 (배포 전에 승인 버튼. 비공개 저장소는 유료 플랜에서만 될 수 있다)
   - Deployment branches: `beta`는 `dev`만, `production`은 `main`만 (Selected branches)
2. 각 Environment의 Environment secrets에 넷 (두 환경 모두 같은 값):
   - `DEPLOY_HOST` = 서버 IP, `DEPLOY_USER` = 접속 사용자
   - `DEPLOY_SSH_KEY` = 🖥 `cat semachi-deploy`의 전체 내용 (`-----BEGIN`부터 `END … KEY-----`까지)
   - `DEPLOY_KNOWN_HOSTS` = 위 5에서 복사한 줄
3. 다 넣었으면 🖥 `semachi-deploy` 비밀키 파일은 지운다 (GitHub에만 있으면 된다. 다시 필요하면 새로 만든다)
4. Settings → Secrets and variables → Actions → **Variables** → `DEPLOY_BETA` = `true`
   - 이것이 있어야 `dev` 푸시가 서버까지 배포한다. `DEPLOY_PRODUCTION`은 B-14에서

### 3. 베타 주소·방화벽 🔧 🌐

1. 베타 주소: **`https://test.158-180-85-102.sslip.io`** (사용자 결정 2026-11-28). `semachi.net`의 DNS는 AWS Route 53인데 들어갈 수 없어서, 이름 안의 숫자를 IP로 알려 주는 무료 주소(sslip.io)를 쓴다. DNS 작업이 없다
   - 🌐 `caddy.env`에 `BETA_SITE=test.158-180-85-102.sslip.io` (틀에 들어 있다)
   - 🔧 GitHub Variables에 `BETA_URL` = `https://test.158-180-85-102.sslip.io` (Actions 배포 기록의 링크)
   - 확인 🖥 `nslookup test.158-180-85-102.sslip.io 8.8.8.8` → `158.180.85.102`
   - 나중에 Route 53에 들어갈 수 있게 되면 A 레코드 `test` → 서버 IP를 만들고 `BETA_SITE` 줄을 지운다 (`test.semachi.net`)
2. 바깥 방화벽(OCI Security List): 80·443은 지금 nginx가 서비스 중이라 이미 열려 있다 (B-12). OCI 콘솔에 들어갈 수 없어도 된다
3. 서버 방화벽: 할 일 없음. B-12의 `iptables -S INPUT`이 기본 ACCEPT(막는 규칙 없음)라 Caddy 컨테이너 → 서버의 8080(옛 웹)이 열려 있다
4. 🌐 `nano /srv/semachi/caddy.env` → 베타 테스터 아이디(`BETA_AUTH_USER`)와 암호 해시, `PROD_WEB_UPSTREAM=host.docker.internal:8080` 줄이 있는지
   - 해시 만들기 🌐 `docker run --rm -it caddy:2 caddy hash-password` → 암호를 두 번 입력 → 나온 `$2a$14$…`를 `BETA_AUTH_HASH='…'`에 (작은따옴표 필수)

### 3-1. 옛 API 인증서 다시 읽기 (B-12에서 찾음, ✅ 2026-11-28 완료. 2027-02-25 전에 전환을 못 마치면 한 번 더)

옛 API(pm2 `cookie_back`, 8081)는 켤 때 한 번 읽은 인증서를 계속 쓴다. 11-18에 켜져 12-27에 만료되는 옛 인증서를 쓰고 있다 (파일은 이미 2027-02-25까지로 갱신됨).

1. 🌐 `sudo pm2 restart cookie_back` → 표에 `cookie_back`이 `online`, ↺가 1 늘어남 (몇 초 끊김)
2. 🌐 `echo | openssl s_client -connect localhost:8081 -servername semachi.net 2>/dev/null | openssl x509 -noout -enddate` → `notAfter=Feb 25 … 2027 GMT`
3. 🖥 브라우저로 `https://semachi.net` → 팀·합주가 보임

문제가 생기면: 🌐 `sudo pm2 logs cookie_back --lines 50 --nostream`을 Claude에게 (값이 보이면 지우고). 2027-02-25 전에 운영 전환(B-14)을 마쳐야 한다 (A안으로 nginx를 끄면 인증서 파일 자동 갱신이 멈춘다)

### 4. Caddy가 nginx 자리를 맡는다 (사용자 결정 A, 2026-11-28) — ⚠ 운영이 몇 초 끊긴다

베타 기간에도 80·443은 Caddy가 받고, `semachi.net`은 지금처럼 옛 웹(pm2 `index-prod`, 8080)으로 넘긴다. 옛 API(8081)는 그대로.
사람이 적은 시간에. 순서대로, 하나씩:

1. 🌐 `cd /srv/semachi && docker compose config --quiet && echo OK` → `OK` (설정 문법 확인)
2. 🌐 `sudo systemctl stop nginx` → 이 순간부터 `semachi.net`이 끊긴다
3. 🌐 `docker compose up -d caddy` → `Container semachi-caddy-1 Started`
4. 🌐 `docker compose logs caddy | grep -iE 'certificate obtained|error'` → `certificate obtained successfully`가 `semachi.net`·`www.semachi.net`·`test.158-180-85-102.sslip.io` 각각 (1분 안쪽). `error`가 계속 나오면 바로 되돌리기
5. 🖥 브라우저로 `https://semachi.net` → 지금 화면 그대로, 주소창 자물쇠 (인증서가 Let's Encrypt 새것)
6. 확인되면 🌐 `sudo systemctl disable nginx` (재부팅 때 nginx가 80·443을 먼저 잡지 않게)

되돌리기 (1분): 🌐 `docker compose stop caddy` → `sudo systemctl start nginx` (6을 했으면 `sudo systemctl enable --now nginx`)

### 5. 첫 베타 배포

1. 🖥 `api3.0`(과 `ui3.0`)을 `dev`에 합친다 (PR 또는 `git push origin api3.0:dev`. Claude는 푸시하지 않는다)
2. 🔧 GitHub → Actions → "배포" 실행: 검사 → 이미지 올리기 → 서버에 배포 (처음엔 15분쯤)
   - 실패하면 빨간 X의 단계를 열어 로그를 본다. "서버에 배포"가 실패하면 서버의 이전 상태로 되돌아가 있다
3. 확인 🖥 브라우저로 `https://test.158-180-85-102.sslip.io` → 아이디·암호 → 헤더에 "베타"
   - 🌐 `cd /srv/semachi && docker compose ps` → `api-beta`·`web-beta`가 `healthy`, `caddy`가 `Up`
4. 🔧 GitHub → Packages: `semachi-api`·`semachi-web`가 보인다 (비공개여도 된다. 서버는 배포 때 토큰으로 받는다)
5. 진짜 IP 확인: 베타 관리자 화면(`/admin`) → 활동 기록의 IP가 내 휴대폰·PC의 공인 IP인지 (`172.`·`10.`으로 시작하면 ⚠ 프록시 설정을 고친다)

### 6. 베타 기간에 할 것

- 테스터에게: "**실제 데이터**라 지우면 진짜 지워진다", 아이디·암호
- 데이터 변경 스크립트 **세어 보기** (평소 운영 → 데이터 스크립트, `api-beta`로). `--apply`는 B-14에서만
- 팀 자동 삭제 확인: 오늘 날짜로 시험 팀 → 다음 날 `cleanup.ts` 세어 보기에 그 팀이 잡히는지 → 그 팀은 직접 삭제
- 문제를 고치면 다시 `dev`에 푸시 → 자동으로 베타에 배포

---

## B-14 운영 전환 (서비스를 1~2시간 내린다)

> 시간을 정해 미리 공지한다. 순서를 바꾸지 않는다. 2부터 9까지 `semachi.net`은 "점검 중" 안내가 나온다 (Caddy, 옛 웹이 꺼져 있을 때).

| # | 할 일 | 명령 / 위치 | 되돌리기 |
|---|---|---|---|
| 1 | 직전 백업 + 내 PC로 복사 | 🌐 `bash backup.sh` → 🖥 `scp …` | – |
| 2 | 옛 서버 멈춤 = 서비스 중단 시작. 옛 API(`smch3/cookie_back.js`, 8081)와 8080(`smch3/index-prod.js`)은 **root의 pm2**가 켜고 있다 (B-12) | 🌐 `sudo pm2 stop cookie_back index-prod` (B-12의 `pm2 list`. `back`은 이미 stopped). 아직 `pm2 delete`·`pm2 save`는 하지 않는다 (되돌리기 쉽게) | `sudo pm2 start cookie_back index-prod` |
| 2-1 | DB 비밀번호 바꾸기 (2026-11-28 채팅에 노출됨). 옛 서버는 멈췄으니 새 서버 설정만 바꾸면 된다 | 🔧 Atlas → Security → Database Access → 그 사용자 → Edit Password → 🌐 `production.env`·`beta.env`의 `MONGO_DB` 안 비밀번호를 새것으로 | 옛 비밀번호로 되돌림 |
| 3 | 베타 api 멈춤 (스크립트 도는 동안 DB를 바꾸지 않게) | 🌐 `docker compose stop api-beta` | `docker compose up -d api-beta` |
| 4 | ⛔ 합주 `type` 지우기: 세어 보기 → 확인 → `--apply` → 다시 세어 보기 (`type 있음` 0) | 🌐 `docker compose run --rm --no-deps api-beta node scripts/remove-ensemble-type.ts` (끝에 `--apply`) | 1의 백업 복원 |
| 5 | ⛔ PIN 해시: 세어 보기 → 확인 → `--apply` (이 뒤로 옛 서버는 PIN이 모두 틀린다) | 🌐 `docker compose run --rm --no-deps api-beta node scripts/hash-pins.ts` (끝에 `--apply`) | 1의 백업 복원 |
| 6 | ⛔ 정리 작업 세어 보기 (지울 팀 이름·지난 합주 수). 확인받으면 운영 api가 켜질 때 지운다 | 🌐 `docker compose run --rm --no-deps api-beta node scripts/cleanup.ts` | 1의 백업 복원 |
| 7 | 웹 화면을 새 웹으로: nginx는 B-13에서 이미 꺼 두었다(Caddy가 80·443). Caddy가 옛 웹(8080)으로 넘기던 줄을 지운다 | 🌐 `nano caddy.env`에서 `PROD_WEB_UPSTREAM=…` 줄 삭제 → 다음 8의 배포가 Caddy를 새로 만든다 (그 사이 `semachi.net`은 "점검 중" 안내) | 그 줄을 다시 넣고 `docker compose up -d caddy` |
| 8 | 운영 배포 (Caddy가 80·443을 잡는다) | 🔧 Variables `DEPLOY_PRODUCTION` = `true` → 🖥 `dev`를 `main`에 합침 → Actions "배포" (production) | `docker compose stop api web` |
| 8-1 | 옛 pm2 목록에서 지우고 저장 (재부팅 때 옛 서버가 다시 켜지지 않게). 9 확인이 끝나고 하루쯤 지나 문제가 없을 때 | 🌐 `sudo pm2 delete cookie_back index-prod back` → `sudo pm2 save` | `sudo pm2 start /home/ubuntu/smch3/<파일> --name <이름>` → `sudo pm2 save` |
| 8-2 | 재부팅 확인 (선택, 사람이 적은 시간에. 1~2분 끊김) | 🌐 `sudo reboot` → 다시 접속해 `docker compose ps` (모두 Up·healthy), `sudo ss -tlnp`에 80·443 = docker-proxy | – |
| 9 | 확인 | `https://semachi.net` 새 화면, 팀·합주 보임, PIN으로 합주 잡기·지우기, `/admin` 로그인, 활동 기록 "팀 자동 삭제"(6에서 잡힌 것) | – |
| 10 | 베타 PIN 해시 켜기 | 🌐 `beta.env`의 `PIN_HASH=true` → `docker compose up -d api-beta` | `false`로 |
| 11 | 마스터 PIN 바꾸기 (선택) | `/admin` → 설정 | 관리자 화면에서 다시 |

크게 잘못되면 (전부 되돌리기):
1. 🌐 `docker compose stop api web` (새 운영 끔)
2. ⛔ 백업 복원 (평소 운영 → 백업에서 복원). 4·5를 했다면 반드시 (옛 서버는 해시 PIN을 못 읽는다)
3. 옛 서버를 2·7의 반대로 다시 켬: `caddy.env`에 `PROD_WEB_UPSTREAM=host.docker.internal:8080` 다시 넣고 `docker compose up -d caddy` → `sudo pm2 start cookie_back index-prod` (8-1을 했다면 그 칸의 되돌리기). Caddy 자체가 문제면 `docker compose stop caddy` → `sudo systemctl enable --now nginx`
4. Variables `DEPLOY_PRODUCTION`을 `false`로

전환 뒤 한동안: 옛 `api.js` 폴더·`log.txt`는 지우지 않고 보관 (B-15에서 정리), `:8081`은 아무도 쓰지 않으므로 Security List에서 닫는다 (B-15).

---

## 평소 운영

모두 🌐 `cd /srv/semachi`에서.

| 하고 싶은 것 | 명령 |
|---|---|
| 지금 상태 | `docker compose ps` (api·web가 `healthy`) |
| 로그 보기 | `docker compose logs --tail 100 -f api` (Ctrl+C로 그만. `caddy`·`api-beta`도) |
| 오류만 | `docker compose logs api \| grep '"level":50'` (pino: 50 = error) |
| 다시 켜기 | `docker compose restart api` |
| 지금 켠 이미지 | `cat .env` |
| 백업 | `bash backup.sh` |
| 설정(env) 바꾼 뒤 | `docker compose up -d api` (바뀐 것만 새로 만든다. Caddy는 `docker compose up -d caddy`) |
| 디스크 정리 | `docker system df`로 보고 `docker image prune -a` (쓰지 않는 이미지) |

### 배포·되돌리기

- 배포: `dev` 푸시 → 베타, `main` 푸시 → 운영 (자동)
- **되돌리기 (가장 쉬움)** 🔧: Actions → "배포" → 잘 되던 때의 실행 → "서버에 배포" 작업 → Re-run → 그때 이미지로 다시 켠다
- 손으로: 🌐 `bash deploy.sh production ghcr.io/<주인>/semachi-api:<커밋 7자리> ghcr.io/<주인>/semachi-web:production-<커밋 7자리>` (그 전에 `docker login ghcr.io`: GitHub 토큰 필요. Re-run이 더 쉽다)
- 배포가 healthy에 실패하면 `deploy.sh`가 알아서 이전 이미지로 되돌린다

### 데이터 스크립트 (⛔ `--apply`는 백업 후 확인받고)

API 이미지 안에 들어 있다. 켜져 있는 쪽 서비스 이름으로 실행한다 (`api` 또는 `api-beta`. 같은 DB):

```
docker compose run --rm --no-deps api node scripts/cleanup.ts               # 날짜 지난 팀·합주 세어 보기
docker compose run --rm --no-deps api node scripts/remove-ensemble-type.ts  # 합주 type 세어 보기
docker compose run --rm --no-deps api node scripts/hash-pins.ts             # 평문 PIN 세어 보기
```
끝에 `--apply`를 붙이면 실제로 바꾼다. 값(PIN 등)은 출력하지 않고 개수·팀 이름만.

### ⛔ 백업에서 복원 (DB를 백업 시점으로 덮어쓴다)

1. 🌐 `docker compose stop api api-beta` (복원 중 쓰지 않게)
2. 🌐 `ls backups/` → 복원할 파일 이름 확인
3. 🌐 `docker compose run --rm db-tools 'mongorestore --uri="$MONGO_DB" --gzip --archive="/backup/$0" --drop' <파일 이름>`
   - `--drop`: 백업에 있는 컬렉션을 지우고 백업 내용으로 다시 채운다 (백업 뒤에 생긴 데이터는 사라진다)
4. 🌐 `docker compose up -d api api-beta`

### 베타를 평소에 꺼 두기 (메모리가 빠듯할 때)

`docker compose stop api-beta web-beta` → 쓸 때 `docker compose up -d api-beta web-beta`. 그동안 베타 주소는 502.
