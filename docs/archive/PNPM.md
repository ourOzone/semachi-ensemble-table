# pnpm 자주 쓰는 명령어

| 하고 싶은 일 | npm | pnpm |
|---|---|---|
| 의존성 전체 설치 | `npm install` | `pnpm install` (또는 `pnpm i`) |
| CI에서 lockfile 그대로 설치 | `npm ci` | `pnpm install --frozen-lockfile` |
| 패키지 추가 | `npm install dayjs` | `pnpm add dayjs` |
| 개발 의존성 추가 | `npm install -D vitest` | `pnpm add -D vitest` |
| 패키지 제거 | `npm uninstall react-modal` | `pnpm remove react-modal` |
| 스크립트 실행 | `npm run dev` | `pnpm dev` (`run` 생략 가능) |
| 로컬 바이너리 실행 | `npx vitest run` | `pnpm exec vitest run` |
| 설치 없이 일회성 실행 | `npx create-xxx` | `pnpm dlx create-xxx` |
| 버전 업데이트 확인 | `npm outdated` | `pnpm outdated` |
| 버전 업데이트 | `npm update` | `pnpm update` (`pnpm up -i --latest`: 대화형으로 최신 메이저까지) |
| 왜 설치됐는지 추적 | `npm ls dayjs` / `npm explain dayjs` | `pnpm why dayjs` |
| 캐시/스토어 정리 | `npm cache clean --force` | `pnpm store prune` |
