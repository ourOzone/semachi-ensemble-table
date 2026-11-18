import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { url as apiUrl } from './src/constants';

export default defineConfig({
    plugins: [react()],
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
            jsdom: { url: new URL(apiUrl).origin },
        },
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
        restoreMocks: true,
    },
});
