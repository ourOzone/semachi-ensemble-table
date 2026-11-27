import '@/styles/index.css';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { recordVisit } from '@/api/visit';
import App from './app';
import { Toaster } from '@/components/ui/sonner';
import { createQueryClient } from '@/lib/query-client';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root 요소를 찾을 수 없습니다');

const queryClient = createQueryClient();

// 관리자 화면(/admin, 백엔드 개편 B-7): 주소가 /admin이면 관리자 화면만. 관리자 코드는 이때만 불러온다 (보통 방문자의 번들에 넣지 않게)
const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin';
const AdminApp = lazy(() => import('@/features/admin/admin-app'));
// 보통 화면을 열 때 한 번 방문을 남긴다 (StrictMode의 두 번 실행을 피해 렌더링 밖에서)
if (!isAdmin) void recordVisit(window.location.pathname);

createRoot(rootElement).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            {isAdmin ? (
                <Suspense>
                    <AdminApp />
                </Suspense>
            ) : (
                <App />
            )}
            <Toaster />
        </QueryClientProvider>
    </StrictMode>,
);
