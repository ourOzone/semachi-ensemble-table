// antd v5의 React 19 호환 패치. antd보다 먼저 로드돼야 한다. antd를 shadcn/ui로 교체하면 제거한다.
import '@ant-design/v5-patch-for-react-19';
import '@/styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StyleProvider } from '@ant-design/cssinjs';
import { IconProvider } from '@ant-design/icons';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import App from '@/App';
import { Toaster } from '@/components/ui/sonner';
import { ContextProvider } from '@/context';
import { createQueryClient } from '@/lib/queryClient';
import theme from '@/styles/theme';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root 요소를 찾을 수 없습니다');

const queryClient = createQueryClient();

createRoot(rootElement).render(
    <StrictMode>
        {/*
            antd 스타일을 `antd` CSS 레이어에 넣는다 (레이어 순서는 index.html·src/styles/index.css). antd 제거 시(V-6) 함께 제거.
            container: antd는 스타일을 컨테이너의 맨 앞에 넣는다. 기본값(head)이면 레이어 순서 선언보다 앞에 들어가
            antd 레이어가 가장 낮은 우선순위가 되므로(Tailwind preflight에 버튼 테두리 등이 지워짐) body에 넣는다.
            IconProvider: 아이콘 스타일(.anticon)은 @ant-design/icons가 따로 넣는다. 레이어 설정이 없으면 head 맨 앞에 넣고,
            나중에 중첩 ConfigProvider(달력의 한국어 설정)가 같은 자리의 내용을 `@layer antd`로 바꿔 antd 레이어가 맨 앞이 된다.
            처음부터 레이어를 주면 head 맨 뒤(레이어 순서 선언 뒤)에 들어간다.
        */}
        <StyleProvider layer container={document.body}>
            <IconProvider value={{ layer: 'antd' }}>
                <QueryClientProvider client={queryClient}>
                    <ContextProvider>
                        <ThemeProvider theme={theme}>
                            <App />
                            <Toaster />
                        </ThemeProvider>
                    </ContextProvider>
                </QueryClientProvider>
            </IconProvider>
        </StyleProvider>
    </StrictMode>,
);
