# syntax=docker/dockerfile:1
# 웹 이미지 (백엔드 개편 B-11): 빌드한 웹 파일 + 그 파일을 주는 작은 Caddy. 저장소 루트에서 만든다:
#   docker build -f apps/web/Dockerfile --build-arg VITE_APP_ENV=beta -t semachi-web:beta .
# 운영·베타는 VITE_APP_ENV만 다르게 두 번 만든다 (베타면 헤더에 "베타" 표시)
# API 주소는 둘 다 같은 주소의 /api (env/.env). 앞의 Caddy(deploy/caddy/Caddyfile)가 /api를 API 서버로 넘긴다
ARG NODE_VERSION=26

# 1) 빌드: 만드는 컴퓨터의 CPU로 (결과는 HTML·JS·CSS라 CPU와 관계없다)
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-slim AS build
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install --global --no-fund --no-audit \
    "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1].split('+')[0]")"

# 패키지 목록을 먼저 (apps/server/Dockerfile과 같은 이유)
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@semachi/web..." --store-dir /pnpm/store

COPY packages/shared packages/shared
COPY apps/web apps/web

# 타입 검사는 CI가 먼저 한다. 여기서는 Vite 빌드만
ARG VITE_APP_ENV=production
RUN VITE_APP_ENV=${VITE_APP_ENV} pnpm --filter @semachi/web exec vite build

# 2) 최종: Caddy + 빌드 결과
FROM caddy:2-alpine
LABEL org.opencontainers.image.description="세마치 합주판 웹"
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/web/build /srv
EXPOSE 80
