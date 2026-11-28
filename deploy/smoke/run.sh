#!/usr/bin/env bash
# 만든 이미지를 실제 배포와 같은 묶음(deploy/compose.yaml)으로 띄워 확인한다 (백엔드 개편 B-11, CI "이미지 확인")
# 서버가 없어도 Dockerfile·Caddyfile·compose.yaml이 함께 동작하는지 본다:
#   주소 나누기(/api → api, 그 밖 → web), 화면 주소(/admin), 캐시 헤더, 검색 엔진 차단 헤더, 베타 기본 인증, 베타 표시
# 미리 만들어 둘 이미지: semachi-api:smoke, semachi-web:smoke, semachi-web:smoke-beta (ci.yml)
# 내 PC에서도 Docker가 있으면 같은 명령으로 돌릴 수 있다 (포트 80·443을 쓴다)
set -euo pipefail
cd "$(dirname "$0")/.."

# 시험용 설정 파일 (실제 서버 값이 아니다. 끝나면 지운다)
cat >production.env <<'EOF'
MONGO_DB=mongodb://mongo:27017/semachi-smoke
MASTER_PIN=9999
PIN_HASH=true
EOF
cp production.env beta.env
auth_hash=$(docker run --rm caddy:2 caddy hash-password --plaintext smoke-pass)
cat >caddy.env <<EOF
PROD_SITE=http://semachi.localhost
PROD_WWW_SITE=http://www.semachi.localhost
PROD_REDIRECT_HOST=semachi.localhost
BETA_SITE=http://beta.semachi.localhost
BETA_AUTH_USER=tester
BETA_AUTH_HASH='${auth_hash}'
EOF

export API_IMAGE=semachi-api:smoke API_BETA_IMAGE=semachi-api:smoke
export WEB_IMAGE=semachi-web:smoke WEB_BETA_IMAGE=semachi-web:smoke-beta
compose=(docker compose -f compose.yaml -f smoke/compose.yaml)

finish() {
    status=$?
    if [[ $status -ne 0 ]]; then
        echo "== 실패: 컨테이너 상태와 로그" >&2
        "${compose[@]}" ps -a >&2 || true
        "${compose[@]}" logs --tail 100 >&2 || true
    fi
    "${compose[@]}" down -v >/dev/null 2>&1 || true
    rm -f production.env beta.env caddy.env
    exit $status
}
trap finish EXIT

echo "== 켜기 (healthy가 될 때까지)"
"${compose[@]}" up -d --wait --wait-timeout 180 mongo api web api-beta web-beta caddy

prod=http://semachi.localhost
beta=http://beta.semachi.localhost
resolve=(--resolve semachi.localhost:80:127.0.0.1 --resolve www.semachi.localhost:80:127.0.0.1 --resolve beta.semachi.localhost:80:127.0.0.1)
tmp=$(mktemp -d)

# req <이름> <기대 상태 코드> <curl 인자...>: 응답 본문은 $tmp/<이름>.body, 헤더는 $tmp/<이름>.headers
req() {
    local name=$1 expected=$2
    shift 2
    local status
    status=$(curl -sS "${resolve[@]}" -o "$tmp/$name.body" -D "$tmp/$name.headers" -w '%{http_code}' "$@")
    if [[ $status != "$expected" ]]; then
        echo "✗ $name: 상태 $status (기대 $expected)" >&2
        head -c 500 "$tmp/$name.body" >&2 || true
        exit 1
    fi
    echo "✓ $name ($status)"
}
has_header() { grep -qi "^$2" "$tmp/$1.headers" || { echo "✗ $1: 헤더 '$2' 없음" >&2 && exit 1; }; }
has_body() { grep -q -- "$2" "$tmp/$1.body" || { echo "✗ $1: 본문에 '$2' 없음" >&2 && exit 1; }; }
no_body() { ! grep -q -- "$2" "$tmp/$1.body" || { echo "✗ $1: 본문에 '$2' 있음" >&2 && exit 1; }; }

echo "== 운영 주소"
req home 200 "$prod/"
has_body home 'id="root"'
has_header home 'x-robots-tag: noindex, nofollow'
has_header home 'cache-control: no-cache'
req admin-page 200 "$prod/admin"
has_body admin-page 'id="root"'

script=$(grep -o '/assets/[^"]*\.js' "$tmp/home.body" | head -n 1)
req asset 200 "$prod$script"
has_header asset 'cache-control: public, max-age=31536000, immutable'
no_body asset '베타' # 운영 빌드에는 베타 표시가 없다
req missing-asset 404 "$prod/assets/missing-file.js"

req health 200 "$prod/api/health"
has_body health '"status":"ok"'
has_header health 'x-robots-tag: noindex, nofollow'
req teams 200 "$prod/api/teams"
has_body teams '\[\]'
req no-route 404 "$prod/api/no-such-route"
has_body no-route '"NOT_FOUND"'
req visit 204 -X POST "$prod/api/visits"
has_header visit 'set-cookie:'

echo "== www 주소 → semachi.net"
req www 301 "http://www.semachi.localhost/admin?x=1"
has_header www 'location: https://semachi.localhost/admin?x=1'

echo "== 베타 주소"
req beta-no-auth 401 "$beta/"
req beta-home 200 -u tester:smoke-pass "$beta/"
beta_script=$(grep -o '/assets/[^"]*\.js' "$tmp/beta-home.body" | head -n 1)
req beta-asset 200 -u tester:smoke-pass "$beta$beta_script"
has_body beta-asset '베타'
req beta-health 200 -u tester:smoke-pass "$beta/api/health"
has_body beta-health '"status":"ok"'
req beta-api-no-auth 401 "$beta/api/teams"

echo "== 모두 통과"
