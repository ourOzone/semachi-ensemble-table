import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';

// 프론트엔드 env는 env/ 에서만 읽는다. 루트 .env는 백엔드(api.js) 전용이다.
const ENV_DIR = 'env';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, ENV_DIR, 'VITE_');

    return {
        plugins: [
            react(),
            // React Compiler (View 개편 사전 결정 7): 컴포넌트·훅을 자동으로 메모이제이션한다.
            // 플러그인 내장 Rust판(compiler 옵션)은 실험 단계라 안정판인 Babel판을 쓴다.
            babel({ presets: [reactCompilerPreset()] }),
            tailwindcss(),
        ],
        envDir: ENV_DIR,
        resolve: {
            tsconfigPaths: true,
        },
        server: {
            host: '0.0.0.0',
            port: 3000,
        },
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
            // 날짜 계산 테스트가 실행 환경(CI 등)의 시간대에 따라 달라지지 않도록 서비스 시간대로 고정
            env: { TZ: 'Asia/Seoul' },
            restoreMocks: true,
            coverage: {
                provider: 'v8',
                include: ['src/**/*.{ts,tsx}'],
                exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts'],
                reporter: ['text-summary', 'text'],
            },
            // Drawer를 여러 단계 거치는 흐름 테스트는 병렬 실행 시 기본값(5초)을 넘길 수 있다
            testTimeout: 15_000,
        },
    };
});
