import '@/styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './app';
import { Toaster } from '@/components/ui/sonner';
import { createQueryClient } from '@/lib/query-client';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root 요소를 찾을 수 없습니다');

const queryClient = createQueryClient();

createRoot(rootElement).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
            <Toaster />
        </QueryClientProvider>
    </StrictMode>,
);
