// 서버 테스트 공통 준비 (테스트 파일마다 한 번씩 실행된다)
// - 로그 파일: 테스트 파일마다 임시 파일 (helpers.ts가 이 경로로 앱을 만든다)
// - DB: 테스트 파일마다 메모리 MongoDB를 켜고, 테스트마다 비운다. 실제 DB에는 연결하지 않는다
import { randomUUID } from 'node:crypto';
import { rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

const logFile = join(tmpdir(), `semachi-test-log-${randomUUID()}.txt`);
process.env.LOG_FILE = logFile;
// 운영처럼 로그 파일이 이미 있는 상태로 시작한다 (서버는 파일이 없으면 만들지 않는다)
writeFileSync(logFile, '');

let mongod: MongoMemoryServer | undefined;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
    vi.useRealTimers();
    const { db } = mongoose.connection;
    if (db) await db.dropDatabase();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod?.stop();
    rmSync(logFile, { force: true });
});
