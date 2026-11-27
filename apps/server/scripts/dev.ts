// 내 PC에서 서버 띄워 보기 (실제 DB 없이): pnpm dev:server (저장소 루트)
// 1. 메모리 MongoDB를 켠다 (포트 27018). 데이터는 apps/server/.dev-db/에 남아 다시 켜도 그대로다
// 2. 처음이면 예시 데이터(팀·합주·날적이·공지)를 넣는다
// 3. 서버(src/main.ts)를 http://localhost:8081 로 켠다. 코드를 고치면 서버만 다시 시작한다(node --watch)
// 데이터를 처음으로 되돌리기: pnpm --filter @semachi/server dev:reset
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

const SERVER_DIR = fileURLToPath(new URL('..', import.meta.url));
const DATA_DIR = fileURLToPath(new URL('../.dev-db', import.meta.url));
const DB_DIR = `${DATA_DIR}/mongo`;
const LOG_FILE = `${DATA_DIR}/log.txt`;
const DB_PORT = 27018;
const PORT = 8081;
/** 개발용 PIN. 실제 PIN(루트 .env)과 관계없다 */
const DEV_MASTER_PIN = '0000';
const DEV_TEAM_PIN = '1234';

mkdirSync(DB_DIR, { recursive: true });
if (!existsSync(LOG_FILE)) writeFileSync(LOG_FILE, '');

const mongod = await MongoMemoryServer.create({
    instance: { port: DB_PORT, dbPath: DB_DIR, storageEngine: 'wiredTiger' },
});
const mongoUri = mongod.getUri('semachi');
await seedIfEmpty(mongoUri);

const server = spawn(process.execPath, ['--watch', 'src/main.ts'], {
    cwd: SERVER_DIR,
    stdio: 'inherit',
    env: {
        ...process.env,
        MONGO_DB: mongoUri,
        MASTER_PIN: DEV_MASTER_PIN,
        PORT: String(PORT),
        LOG_FILE,
        TLS_KEY_FILE: '',
        TLS_CERT_FILE: '',
        // 웹 개발 서버(pnpm dev:local)의 주소. 휴대폰으로 볼 때는 그 주소(http://PC의IP:3000)를 쉼표로 더한다
        CORS_ORIGINS: 'http://localhost:3000',
    },
});

console.log(`
개발 서버: http://localhost:${PORT}  (확인: http://localhost:${PORT}/health)
마스터 PIN ${DEV_MASTER_PIN} · 예시 팀 PIN ${DEV_TEAM_PIN}
웹을 이 서버에 연결: 다른 터미널에서 pnpm dev:local
끄기: Ctrl+C
`);

let stopping = false;
async function stop() {
    if (stopping) return;
    stopping = true;
    if (server.exitCode === null) {
        server.kill();
        await new Promise((resolve) => server.once('exit', resolve));
    }
    await mongod.stop();
    process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', () => void stop());

/** DB가 비어 있으면 예시 데이터를 넣는다. 합주는 이번 주에 보이도록 오늘 기준으로 날짜를 정한다 */
async function seedIfEmpty(uri: string) {
    const conn = await mongoose.createConnection(uri).asPromise();
    const db = conn.db!;
    if ((await db.collection('teams').countDocuments()) > 0) {
        await conn.close();
        return;
    }

    const desc = (vocal: string) => [vocal, '기타', '베이스', '드럼', '', '', '아티스트 - 제목'];
    const teams = [
        { name: '예시밴드', type: '교내 공연', desc: desc('보컬1') },
        { name: '두번째팀', type: '외부 공연', desc: desc('보컬2') },
        { name: '세번째팀', type: '기타 팀', desc: desc('보컬3') },
    ].map((t) => ({ ...t, pin: DEV_TEAM_PIN, publishDate: new Date(), __v: 0 }));
    const { insertedIds } = await db.collection('teams').insertMany(teams);

    // 오늘부터 처음 오는 그 요일(월 0 ~ 일 6)의 시작 시각. 시간칸 0 = 09:00, 30분 단위
    const now = new Date();
    const todayIdx = (now.getDay() + 6) % 7;
    const dateOf = (day: number, slot: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() + ((day - todayIdx + 7) % 7));
        d.setHours(9 + Math.floor(slot / 2), (slot % 2) * 30, 0, 0);
        return d;
    };
    const ensemble = (
        team: number,
        day: number,
        startTime: number,
        endTime: number,
        repeat: boolean,
    ) => ({
        teamId: insertedIds[team]!.toHexString(),
        teamName: teams[team]!.name,
        day,
        startTime,
        endTime,
        repeat,
        nextDate: dateOf(day, startTime),
        type: repeat ? '무기한' : '일회성',
        due: repeat ? new Date('2099-12-31') : dateOf(day, startTime),
        __v: 0,
    });
    await db.collection('ensembles').insertMany([
        ensemble(0, 1, 18, 21, true), // 화 18:00–20:00
        ensemble(1, 3, 20, 23, true), // 목 19:00–21:00
        ensemble(2, 5, 6, 9, false), // 토 12:00–14:00, 한 번만
    ]);
    await db
        .collection('notes')
        .insertMany([{ text: '개발용 날적이예요. 삭제 PIN은 1234', pin: DEV_TEAM_PIN, __v: 0 }]);
    await db
        .collection('notices')
        .insertMany([{ content: '개발 서버의 예시 공지예요.', publishDate: new Date(), __v: 0 }]);
    console.log('예시 데이터를 넣었습니다 (팀 3·합주 3·날적이 1·공지 1)');
    await conn.close();
}
