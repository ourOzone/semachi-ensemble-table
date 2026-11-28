#!/usr/bin/env bash
# 새 이미지로 바꿔 켜기 (백엔드 개편 B-11). GitHub Actions(deploy.yml)가 SSH로 서버에서 실행한다. 손으로도 쓸 수 있다:
#   ./deploy.sh <beta|production> <api 이미지> <web 이미지>
#   예) ./deploy.sh beta ghcr.io/ourozone/semachi-api:abc1234 ghcr.io/ourozone/semachi-web:beta-abc1234
#
# 하는 일
#   1) .env(지금 켤 이미지 이름)에서 그쪽(운영·베타) 줄만 새 이미지로 바꾼다. 이전 것은 .env.previous
#   2) 새 이미지를 받아 그쪽 api·web만 다시 켜고, healthy(GET /health)가 될 때까지 기다린다
#   3) 실패하면 이전 이미지로 되돌려 다시 켜고 실패로 끝낸다 (Actions에 빨간 X)
#   4) 성공하면 Caddy를 켜 두고(처음이면) 설정을 다시 읽게 한다
# 다른 쪽(베타를 배포하면 운영)은 건드리지 않는다
set -euo pipefail
cd "$(dirname "$0")"

if [[ $# -ne 3 ]]; then
    echo "사용: $0 <beta|production> <api 이미지> <web 이미지>" >&2
    exit 2
fi
target=$1
api_image=$2
web_image=$3

case "$target" in
    production)
        api_var=API_IMAGE web_var=WEB_IMAGE services=(api web) env_file=production.env
        ;;
    beta)
        api_var=API_BETA_IMAGE web_var=WEB_BETA_IMAGE services=(api-beta web-beta) env_file=beta.env
        ;;
    *)
        echo "대상은 beta 또는 production: $target" >&2
        exit 2
        ;;
esac

for file in "$env_file" caddy.env; do
    if [[ ! -f $file ]]; then
        echo "$file 이 없습니다. docs/DEPLOY_RUNBOOK.md 의 '서버 폴더 준비'를 먼저 하세요" >&2
        exit 1
    fi
done

# 베타 암호 해시가 비어 있으면 Caddyfile을 읽지 못해 Caddy 전체(운영 포함)가 멈춘다 → 아무것도 바꾸기 전에 멈춘다
if ! grep -Eq '^BETA_AUTH_HASH=.?[$]2' caddy.env; then
    echo "caddy.env의 BETA_AUTH_HASH가 비어 있습니다 (docs/DEPLOY_RUNBOOK.md 'B-13 베타 주소')" >&2
    exit 1
fi

# .env의 한 줄(이름=값)을 바꾼다. 없으면 더한다
set_image() {
    local name=$1 value=$2
    grep -v "^${name}=" .env >.env.tmp || true
    echo "${name}=${value}" >>.env.tmp
    mv .env.tmp .env
}

touch .env
cp .env .env.previous
set_image "$api_var" "$api_image"
set_image "$web_var" "$web_image"

echo "== $target: 새 이미지 받기"
docker compose pull "${services[@]}"

echo "== $target: 다시 켜고 healthy가 될 때까지 기다리기 (최대 2분)"
if ! docker compose up -d --wait --wait-timeout 120 "${services[@]}"; then
    echo "== 실패: 로그" >&2
    docker compose logs --tail 80 "${services[@]}" >&2 || true
    echo "== 이전 이미지로 되돌리기" >&2
    cp .env.previous .env
    if grep -q "^${api_var}=" .env; then
        docker compose up -d --wait --wait-timeout 120 "${services[@]}" ||
            echo "되돌린 이미지도 healthy가 아닙니다. docker compose ps / logs 로 확인하세요" >&2
    else
        # 처음 배포였다: 되돌릴 이미지가 없어 끈다
        docker compose stop "${services[@]}" || true
    fi
    exit 1
fi

echo "== Caddy: 켜 두고 설정 다시 읽기"
# 처음이면 켠다. caddy.env가 바뀌었으면 compose가 Caddy를 새로 만든다 (환경변수는 켤 때 읽으므로)
docker compose up -d caddy
# 설정이 틀리면 reload가 거절하고 이전 설정 그대로 돈다 (서비스는 멈추지 않는다).
# 방금 켰으면 관리 API가 뜰 때까지 몇 초 걸려 몇 번 다시 해 본다
reloaded=false
for _ in 1 2 3 4 5; do
    if docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
        reloaded=true
        break
    fi
    sleep 3
done
if [[ $reloaded != true ]]; then
    echo "Caddyfile을 다시 읽지 못했습니다 (이전 설정으로 계속 돈다). docker compose logs caddy 로 확인하세요" >&2
    exit 1
fi

# 쓰지 않는 지난 이미지 정리 (2주 지난 것만. 되돌릴 때 필요하면 GHCR에서 다시 받는다)
docker image prune -af --filter "until=336h" >/dev/null || true

docker compose ps
echo "== $target 배포 완료: $api_image / $web_image"
