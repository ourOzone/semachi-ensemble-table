// antd v5의 React 19 호환 패치. antd보다 먼저 로드돼야 한다. antd를 shadcn/ui로 교체하면 제거한다.
import '@ant-design/v5-patch-for-react-19';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import App from '@/App';
import { ContextProvider } from '@/context';
import { createQueryClient } from '@/lib/queryClient';
import GlobalStyle from '@/styles/GlobalStyle';
import theme from '@/styles/theme';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root 요소를 찾을 수 없습니다');

const queryClient = createQueryClient();

createRoot(rootElement).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ContextProvider>
                <ThemeProvider theme={theme}>
                    <GlobalStyle />
                    <App />
                </ThemeProvider>
            </ContextProvider>
        </QueryClientProvider>
    </StrictMode>,
);
