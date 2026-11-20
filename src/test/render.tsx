import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import App from '@/App';
import { ContextProvider } from '@/context';
import theme from '@/styles/theme';

interface ProvidersProps {
    children: ReactNode;
}

/** 테스트용 QueryClient. 테스트끼리 캐시가 섞이지 않도록 렌더링마다 새로 만들고, 실패 응답 테스트가 바로 끝나도록 재시도를 끈다 */
export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
}

// styled-components theme이 필요한 컴포넌트를 렌더링할 때 사용 (QueryClient도 함께 제공)
export function renderWithTheme(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
    const queryClient = createTestQueryClient();

    function Providers({ children }: ProvidersProps) {
        return (
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme}>{children}</ThemeProvider>
            </QueryClientProvider>
        );
    }

    return { queryClient, ...render(ui, { wrapper: Providers, ...options }) };
}

/** 실제 진입점과 같은 Provider 구성으로 App 전체를 렌더링한다 (API는 각 테스트에서 MSW로 모킹) */
export function renderApp() {
    return renderWithTheme(
        <ContextProvider>
            <App />
        </ContextProvider>,
    );
}
