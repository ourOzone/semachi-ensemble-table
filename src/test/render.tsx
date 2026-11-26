import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';
import { Toaster } from '@/components/ui/sonner';
import { ContextProvider } from '@/context';
import { createQueryClient } from '@/lib/queryClient';

interface ProvidersProps {
    children: ReactNode;
}

/**
 * 테스트용 QueryClient. 앱과 같은 설정(조회 실패 알림 등)에서 재시도만 끈다 (실패 응답 테스트가 바로 끝나도록).
 * 테스트끼리 캐시가 섞이지 않도록 렌더링마다 새로 만든다.
 */
export function createTestQueryClient() {
    return createQueryClient({ retry: false });
}

// 앱과 같은 Provider(QueryClient, 알림 <Toaster />)로 렌더링한다 (V-6: renderWithTheme에서 이름 변경, styled-components theme 제거)
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
    const queryClient = createTestQueryClient();

    function Providers({ children }: ProvidersProps) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
                <Toaster />
            </QueryClientProvider>
        );
    }

    return { queryClient, ...render(ui, { wrapper: Providers, ...options }) };
}

/** 실제 진입점과 같은 Provider 구성으로 App 전체를 렌더링한다 (API는 각 테스트에서 MSW로 모킹) */
export function renderApp() {
    return renderWithProviders(
        <ContextProvider>
            <App />
        </ContextProvider>,
    );
}
