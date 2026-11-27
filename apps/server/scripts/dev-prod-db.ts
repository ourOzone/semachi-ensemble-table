// 내 PC에서 서버를 운영 DB에 연결해 띄우기: pnpm dev:server:prod (저장소 루트)
// - 저장소 루트 .env(MONGO_DB·MASTER_PIN)를 읽는다. 값은 화면에 출력하지 않는다
// - 여기서 바꾸면 실제 데이터가 바뀐다 (운영·베타와 같은 DB, BACKEND_PLAN 사전 결정 10의 "같은 DB를 쓸 때 지킬 것"이 그대로 적용)
// - 활동 로그는 운영 log.txt가 아니라 apps/server/.dev-db/log-prod-db.txt에 쓴다
// - 운영 DB가 이 PC의 접속을 받지 않으면(서버 안에서만 열려 있는 등) "DB에 연결하지 못했습니다"로 끝난다
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = fileURLToPath(new URL('..', import.meta.url));
const ROOT_ENV = fileURLToPath(new URL('../../../.env', import.meta.url));
const DATA_DIR = fileURLToPath(new URL('../.dev-db', import.meta.url));
const LOG_FILE = `${DATA_DIR}/log-prod-db.txt`;
const PORT = 8081;

if (!existsSync(ROOT_ENV)) {
    console.error('저장소 루트에 .env가 없습니다 (MONGO_DB·MASTER_PIN)');
    process.exit(1);
}
const env: NodeJS.ProcessEnv = { ...process.env };
process.loadEnvFile(ROOT_ENV);
for (const key of ['MONGO_DB', 'MASTER_PIN']) env[key] = process.env[key];

mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(LOG_FILE)) writeFileSync(LOG_FILE, '');

console.log(`
⚠️  운영 DB에 연결합니다. 여기서 추가·수정·삭제하면 실제 데이터가 바뀝니다.
개발 서버: http://localhost:${PORT} · PIN은 실제 PIN · 웹 연결: 다른 터미널에서 pnpm dev:local
끄기: Ctrl+C
`);

const server = spawn(process.execPath, ['--watch', 'src/main.ts'], {
    cwd: SERVER_DIR,
    stdio: 'inherit',
    env: {
        ...env,
        PORT: String(PORT),
        LOG_FILE,
        TLS_KEY_FILE: '',
        TLS_CERT_FILE: '',
        CORS_ORIGINS: 'http://localhost:3000',
    },
});
server.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => server.kill());
process.on('SIGTERM', () => server.kill());
