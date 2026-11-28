// 서버 테스트 전체에서 메모리 MongoDB를 한 번만 켠다 (vitest globalSetup, 2026-11-28)
// 이전에는 테스트 파일마다(17개) 하나씩 켰다: 느린 CI에서 켜기가 시간을 넘기거나
// mongodb-memory-server가 로그를 읽다 오류를 내 파일째 실패하곤 했다 (MIGRATION "B-11 뒤")
// 파일마다 이름이 다른 DB를 쓰므로(test/setup.ts) 파일끼리 데이터가 섞이지 않는다
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
    export interface ProvidedContext {
        mongoUri: string;
    }
}

export default async function setup(project: TestProject) {
    // 처음 실행 때는 MongoDB 실행 파일(약 100MB)을 받으므로 넉넉히
    const mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
    project.provide('mongoUri', mongod.getUri());
    return async () => {
        await mongod.stop();
    };
}
