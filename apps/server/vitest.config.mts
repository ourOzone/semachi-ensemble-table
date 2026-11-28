import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts'],
        setupFiles: ['./test/setup.ts'],
        env: {
            // 날짜 계산은 코드가 한국 시간으로 한다(lib/time.ts, B-8 D1). 운영 서버처럼 UTC로 두고 그래도 맞는지 본다
            TZ: 'UTC',
        },
        restoreMocks: true,
        // 메모리 MongoDB를 처음 켤 때 실행 파일을 받으므로(약 100MB) 넉넉히
        hookTimeout: 120_000,
        testTimeout: 15_000,
    },
});
