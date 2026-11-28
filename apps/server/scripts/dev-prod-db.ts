// 내 PC에서 서버를 운영 DB에 연결해 띄우기: pnpm dev:server (저장소 루트). 예시 데이터로는 pnpm dev:server:sample
// - 저장소 루트 .env(MONGO_DB·MASTER_PIN)를 읽는다. 값은 화면에 출력하지 않는다
// - 여기서 바꾸면 실제 데이터가 바뀐다 (운영·베타와 같은 DB, BACKEND_PLAN 사전 결정 10의 "같은 DB를 쓸 때 지킬 것"이 그대로 적용)
// - 활동 기록은 운영 DB의 activities에 "개발"(APP_ENV=development)로 남는다
// - 운영 DB가 이 PC의 접속을 받지 않으면(서버 안에서만 열려 있는 등) "DB에 연결하지 못했습니다"로 끝난다
import { spawn } from 'node:child_process';
import dns from 'node:dns';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { exitIfPortsBusy } from './port-check.ts';

const SERVER_DIR = fileURLToPath(new URL('..', import.meta.url));
const ROOT_ENV = fileURLToPath(new URL('../../../.env', import.meta.url));
const DATA_DIR = fileURLToPath(new URL('../.dev-db', import.meta.url));
const PORT = 8081;

await exitIfPortsBusy({ 서버: PORT });

if (!existsSync(ROOT_ENV)) {
    console.error('저장소 루트에 .env가 없습니다 (MONGO_DB·MASTER_PIN)');
    process.exit(1);
}
const env: NodeJS.ProcessEnv = { ...process.env };
process.loadEnvFile(ROOT_ENV);
for (const key of ['MONGO_DB', 'MASTER_PIN']) env[key] = process.env[key];

// Atlas 주소(mongodb+srv://)는 DNS로 실제 DB 주소를 찾는다. 이 PC의 Node가 응답하지 않는 DNS(127.0.0.1 등)를 쓰면
// 찾지 못해 "querySrv ECONNREFUSED"로 끝나므로, 그때만 공용 DNS로 찾게 한다 (주소는 출력하지 않는다)
const PUBLIC_DNS = '8.8.8.8,1.1.1.1';
const srvHost = /^mongodb\+srv:\/\/(?:[^@/]*@)?([^/?]+)/.exec(env.MONGO_DB ?? '')?.[1];
if (srvHost && !env.DNS_SERVERS) {
    try {
        await dns.promises.resolveSrv(`_mongodb._tcp.${srvHost}`);
    } catch {
        console.log(
            `이 PC의 DNS(${dns.getServers().join(', ')})로 DB 주소를 찾지 못해 공용 DNS(${PUBLIC_DNS})로 찾습니다`,
        );
        env.DNS_SERVERS = PUBLIC_DNS;
    }
}

mkdirSync(DATA_DIR, { recursive: true });

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
        // 활동 기록에 "개발"로 남긴다. 운영 로그는 경고 이상만 (요청마다 JSON 한 줄이 터미널을 덮지 않게)
        APP_ENV: 'development',
        LOG_LEVEL: 'warn',
        // 정리 작업은 운영 서버에서만 (B-9). 내 PC 서버는 셸에 켜 둔 값이 있어도 끈다 (운영 DB의 데이터를 지우지 않게)
        CLEANUP_ENABLED: 'false',
        TLS_KEY_FILE: '',
        TLS_CERT_FILE: '',
        CORS_ORIGINS: 'http://localhost:3000',
    },
});
server.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => server.kill());
process.on('SIGTERM', () => server.kill());
