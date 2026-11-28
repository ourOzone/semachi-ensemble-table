#!/usr/bin/env bash
# 운영 DB 백업 (백엔드 개편 B-11, 사전 결정 9). 데이터를 바꾸는 일(스크립트·전환) 전에 꼭 한다
#   ./backup.sh            → backups/semachi-<날짜시각>.gz
# - production.env의 MONGO_DB로 연결한다 (주소·비밀번호를 화면에 출력하지 않는다)
# - 백업 파일에는 PIN 등 모든 데이터가 들어 있다: 서버 밖으로 옮길 때도 공개된 곳에 두지 않는다
# - 복원(되돌리기)은 docs/DEPLOY_RUNBOOK.md "백업에서 복원" (DB를 백업 시점으로 덮어쓴다. 확인 후에만)
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p backups
name="semachi-$(date +%Y%m%d-%H%M%S).gz"

# sh -c '명령' 이름 → 명령 안의 $0이 이름. $MONGO_DB는 컨테이너 안에서 읽는다 (여기서 펼치지 않게 작은따옴표)
docker compose run --rm db-tools 'mongodump --uri="$MONGO_DB" --gzip --archive="/backup/$0"' "$name"

echo "백업 완료: $(pwd)/backups/$name ($(du -h "backups/$name" | cut -f1))"
