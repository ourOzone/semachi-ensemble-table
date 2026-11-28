// 서버 테스트 공통 준비 (테스트 파일마다 한 번씩 실행된다)
// - DB: 전체에서 하나 켠 메모리 MongoDB(test/global-setup.ts)에, 파일마다 새 이름의 DB로 연결하고 테스트마다 비운다.
//   실제 DB에는 연결하지 않는다
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, inject, vi } from 'vitest';

beforeAll(async () => {
    await mongoose.connect(inject('mongoUri'), { dbName: `test-${randomUUID()}` });
});

afterEach(async () => {
    vi.useRealTimers();
    const { db } = mongoose.connection;
    if (db) await db.dropDatabase();
});

afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
});
