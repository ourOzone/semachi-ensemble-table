// 서버 테스트 공통 준비 (테스트 파일마다 한 번씩 실행된다)
// - DB: 테스트 파일마다 메모리 MongoDB를 켜고, 테스트마다 비운다. 실제 DB에는 연결하지 않는다
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

let mongod: MongoMemoryServer | undefined;

beforeAll(async () => {
    // 켜는 데 기다리는 시간: 기본 10초 → 60초 (CI 컴퓨터는 웹·서버 테스트가 함께 돌면 10초를 넘길 때가 있다)
    mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
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
});
