import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'styled-components';
import App from '@/App';
import { ContextProvider } from '@/context';
import GlobalStyle from '@/styles/GlobalStyle';
import theme from '@/styles/theme';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root 요소를 찾을 수 없습니다');

createRoot(rootElement).render(
    <StrictMode>
        <ContextProvider>
            <ThemeProvider theme={theme}>
                <GlobalStyle />
                <App />
            </ThemeProvider>
        </ContextProvider>
    </StrictMode>,
);
