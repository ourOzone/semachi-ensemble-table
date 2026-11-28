# syntax=docker/dockerfile:1
# API 서버 이미지 (백엔드 개편 B-11). 저장소 루트에서 만든다:
#   docker build -f apps/server/Dockerfile -t semachi-api .
# 실행: node가 TypeScript를 바로 실행한다 (개발과 같다, B-3). 빌드·묶기 없음
#
# 두 단계로 나눈다 (multi-stage):
#   1) deps : 패키지 설치. 이미지를 만드는 컴퓨터의 CPU로 돈다(--platform=$BUILDPLATFORM).
#             서버 의존성에는 CPU별로 컴파일하는 패키지가 없어, 설치 결과를 ARM·x86 어디에나 쓸 수 있다
#   2) 최종  : Node + 설치 결과 + 소스만. pnpm·설치 캐시는 들어가지 않는다
#
# Node 버전은 저장소의 .nvmrc와 같게 둔다 (CI·내 PC·서버가 같은 Node)
ARG NODE_VERSION=26

FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-slim AS deps
WORKDIR /repo

# pnpm: package.json의 packageManager 버전 그대로 (Node 25부터 corepack이 들어 있지 않아 npm으로 설치)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install --global --no-fund --no-audit \
    "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1].split('+')[0]")"

# 패키지 목록(package.json)을 소스보다 먼저 복사한다: 소스만 바뀌면 아래 설치 단계는 캐시를 그대로 쓴다.
# 웹 package.json도 복사한다 (잠금 파일에 웹이 있어서, 워크스페이스 모양이 맞아야 --frozen-lockfile이 통과한다. 설치는 안 함)
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

# 서버와 서버가 쓰는 패키지(@semachi/shared)의 운영 의존성만 (vitest·typescript 등 개발 도구는 빼고)
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter "@semachi/server..." --store-dir /pnpm/store

COPY packages/shared/src packages/shared/src
COPY apps/server/src apps/server/src
COPY apps/server/scripts apps/server/scripts

FROM node:${NODE_VERSION}-slim
LABEL org.opencontainers.image.description="세마치 합주판 API 서버"
ENV NODE_ENV=production \
    TZ=Asia/Seoul
WORKDIR /app
# node_modules/@semachi/shared는 ../../packages/shared로 가는 링크다. 링크를 따라가면 node_modules 밖이라
# Node가 공유 패키지의 .ts를 바로 실행할 수 있다 (node_modules 안의 .ts는 실행하지 않는다, B-3)
COPY --from=deps /repo /app

# root가 아닌 사용자로 실행 (node 이미지에 들어 있는 node 사용자). 파일은 읽기만 한다
USER node
WORKDIR /app/apps/server
EXPOSE 8081
# 종료 신호(docker stop)를 Node가 직접 받아 하던 요청을 마치고 끝낸다 (src/main.ts)
CMD ["node", "src/main.ts"]
