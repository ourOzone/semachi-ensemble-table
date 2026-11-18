import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
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
