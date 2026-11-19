import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 프론트엔드 env는 env/ 에서만 읽는다. 루트 .env는 백엔드(api.js) 전용이다.
const ENV_DIR = 'env';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, ENV_DIR, 'VITE_');

    return {
        plugins: [react()],
        envDir: ENV_DIR,
        resolve: {
            tsconfigPaths: true,
        },
        server: { port: 3000 },
        build: { outDir: 'build' },
        test: {
            environment: 'jsdom',
            environmentOptions: {
                // jsdom의 XHR(axios가 사용)은 mock 응답에도 CORS를 검사한다.
                // 테스트 페이지 origin을 API origin과 같게 맞춰 same-origin 요청으로 만든다.
                jsdom: { url: new URL(env.VITE_API_URL).origin },
            },
            setupFiles: ['./src/test/setup.ts'],
            include: ['src/**/*.test.{ts,tsx}'],
            restoreMocks: true,
        },
    };
});
