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
