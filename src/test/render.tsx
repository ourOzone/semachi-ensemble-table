import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import App from '@/App';
import { ContextProvider } from '@/context';
import theme from '@/styles/theme';

interface ProvidersProps {
    children: ReactNode;
}

function Providers({ children }: ProvidersProps) {
    return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

// styled-components theme이 필요한 컴포넌트를 렌더링할 때 사용
export function renderWithTheme(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
    return render(ui, { wrapper: Providers, ...options });
}

/** 실제 진입점과 같은 Provider 구성으로 App 전체를 렌더링한다 (API는 각 테스트에서 MSW로 모킹) */
export function renderApp() {
    return renderWithTheme(
        <ContextProvider>
            <App />
        </ContextProvider>,
    );
}
