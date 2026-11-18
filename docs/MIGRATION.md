# 마이그레이션 진행 기록

> 단계 정의와 규칙은 `CLAUDE.md`, 추가 최신화 항목의 근거는 `docs/MODERNIZATION.md` 참고.

## 현황

| 단계 | 상태 |
|---|---|
| 1. CRA → Vite | ✅ 완료 (잔여물 일부 남음, 아래 "남은 일" 참고) |
| 2. JS → TS 100% 전환 | ⏳ 시작 전 (`.ts/.tsx` 4개: `index.tsx`, `vite-env.d.ts`, `styles/theme.ts`, `styles/styled.d.ts`) |
| 3. 내부 로직 개선 | ⏳ 시작 전 |

## 작업 로그

### 2026-11-18 — 개발 도구 정비 (MODERNIZATION.md 1~3번)

**1. 린터·포매터**
- Oxlint 1.94 + Prettier 3.10 도입. `typescript-eslint`는 TypeScript 7을 지원하지 않아(`<6.1.0`) 제외.
- 설정: `.oxlintrc.json`, `.prettierrc.json`, `.prettierignore`(api.js·문서·public 제외)
- 스크립트: `lint`, `lint:fix`, `format`, `format:check`
- 전체 코드에 Prettier 1회 적용(4칸 들여쓰기, 홑따옴표, LF). 공백·따옴표·줄바꿈만 바뀌고 로직 변경 없음.
- `.gitattributes`로 LF 고정, `.vscode/extensions.json`에 Oxc·Prettier 확장 추천.

**2. `@/` alias**
- `tsconfig.json` `paths`: `"*"` → `"@/*"`. bare import(`'context'`, `'constants'` 등)와 `../assets/`를 `@/...`로 일괄 치환.
- `CLAUDE.md`에 `@/` 규칙 추가.

**3. pnpm 전환**
- pnpm 12.21.0 (`packageManager` 필드로 고정), `.nvmrc` = 24.
- `pnpm import`로 기존 `package-lock.json`의 버전을 그대로 옮긴 뒤 `package-lock.json` 삭제.
- phantom dependency였던 `dayjs`를 `^1.11.23`(antd가 쓰던 버전과 동일)으로 명시.
- 사용처 0건인 패키지 제거: `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `react-modal`, `react-router-dom`, `web-vitals`, `@testing-library/*`(v13).
- `CLAUDE.md` 명령어를 pnpm 기준으로 갱신.

**검증:** `pnpm typecheck` ✅ / `pnpm build` ✅ / `pnpm format:check` ✅ / `pnpm lint` → 기존 코드의 에러 5건·경고 65건 (아래)

## 남은 일

### 린트 지적 사항 (기존 코드, 아직 수정하지 않음)

동작이 바뀔 수 있어 2·3단계에서 승인 후 처리한다.

| 규칙 | 건수 | 비고 |
|---|---|---|
| `react(jsx-key)` ❌ | 2 | `AddTeamDrawer6`, `AddEnsembleDrawer4`의 `extra={[<OkButton />]}` |
| `react(set-state-in-effect)` ❌ | 3 | `Drawer`(resize 초기값), `AddTeamDrawer2`, `UpdateTeamDrawer3`(랜덤 데모 이름) |
| `react-hooks/exhaustive-deps` | 31 | stale closure 가능성. 일부는 실제 버그(`notice/index.jsx`의 `handleClickDelete` deps `[]` 등) |
| `no-unused-vars` | 29 | 사용하지 않는 import·변수 |
| `no-console` | 3 | 디버그용 `console.log` |
| `react(exhaustive-effect-dependencies)` | 2 | `App`의 `fetchData` effect 등 |

### 1단계 잔여물
- `index.html`: CRA 안내 주석, description 문구, `lang="en"`
- `public/manifest.json`: CRA 기본 앱 이름
- `VITE_API_URL` 선언만 있고 실제로는 `constants`에 하드코딩된 URL 사용
- 프론트엔드 env를 백엔드 `.env`에서 분리
- `package.json`에 `"type": "module"` 없음 → Vite 빌드 시 config loader 경고
- 폰트 TTF → woff2, `@font-face` `src` 중복

### 다음 순서
- MODERNIZATION.md 4번: Vitest + RTL v16 + MSW 설치 (현재 `test` 스크립트는 있으나 vitest 미설치)
