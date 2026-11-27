import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts'],
        setupFiles: ['./test/setup.ts'],
        env: {
            // 테스트용 마스터 PIN. 실제 값(루트 .env)은 읽지 않는다
            MASTER_PIN: '9999',
            // 서버는 시간대를 코드에 적지 않고 서버 설정을 따른다(D1). 보통 서버(UTC)와 같게 고정한다
            TZ: 'UTC',
        },
        restoreMocks: true,
        // 메모리 MongoDB를 처음 켤 때 실행 파일을 받으므로(약 100MB) 넉넉히
        hookTimeout: 120_000,
        testTimeout: 15_000,
    },
});
