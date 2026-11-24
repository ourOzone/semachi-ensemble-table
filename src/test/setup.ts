import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { useDrawerStore } from '@/stores/drawer';
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

// jsdom에는 포인터 캡처 API가 없다. vaul(새 Drawer)이 드래그 처리에서 호출하므로 빈 구현을 제공한다.
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;
// jsdom에는 elementFromPoint가 없다. input-otp(PIN 칸)가 비밀번호 관리자 아이콘 자리를 살피려고 호출한다
document.elementFromPoint ??= () => null;

// vaul은 열고 닫는 애니메이션 CSS를 스스로 넣는다. jsdom은 애니메이션을 실행하지 않아 animationend가 오지 않으므로,
// 닫힌 Drawer가 DOM에서 빠지지 않는다 (Radix Presence가 애니메이션 종료를 기다림) → 테스트에서는 애니메이션을 끈다
document.head.insertAdjacentHTML(
    'beforeend',
    '<style>[data-vaul-drawer], [data-vaul-overlay] { animation: none !important; }</style>',
);

// 핸들러가 없는 요청은 실제 서버로 나가지 않도록 에러 처리
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
    cleanup(); // globals: false 이므로 RTL 자동 cleanup이 동작하지 않아 직접 호출
    server.resetHandlers();
    server.events.removeAllListeners(); // test/requests.ts의 recordRequests 리스너 정리
    // Zustand store는 모듈 전역이라 테스트끼리 상태가 이어진다 (이전 Context는 렌더링마다 새로 만들어졌다) → 초기 상태로
    useDrawerStore.setState(useDrawerStore.getInitialState(), true);
    // Sonner 알림도 모듈 전역 상태다. 새 <Toaster />는 구독할 때 아직 닫히지 않은 알림을 받아 그리므로 모두 닫는다
    toast.dismiss();
});

afterAll(() => server.close());
