import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '@/test/server';

// jsdom에는 matchMedia가 없다. antd의 반응형 컴포넌트(Grid, Drawer 등)가 사용하므로 최소 구현을 제공한다.
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    }),
});

// 핸들러가 없는 요청은 실제 서버로 나가지 않도록 에러 처리
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
    cleanup(); // globals: false 이므로 RTL 자동 cleanup이 동작하지 않아 직접 호출
    server.resetHandlers();
    server.events.removeAllListeners(); // test/requests.ts의 recordRequests 리스너 정리
});

afterAll(() => server.close());
