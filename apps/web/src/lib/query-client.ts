import { QueryCache, QueryClient } from '@tanstack/react-query';
import { notifyQueryError } from './notify';

interface QueryClientOptions {
    /** 조회 실패 시 재시도 횟수. 테스트는 실패 응답이 바로 끝나도록 false를 넘긴다 */
    retry?: number | false;
}

// 3단계 사전 결정 3번 (docs/archive/LOGIC_IMPROVEMENT_PLAN.md)
// - 탭으로 돌아오면 다시 불러온다 (refetchOnWindowFocus, TanStack 기본값 유지) → 다른 사람의 변경 반영
// - 조회는 실패 시 1회만 재시도, 변경(mutation)은 재시도하지 않는다 (기본값)
// - 조회 실패(재시도까지 실패)는 알림으로 알린다 (View 개편 V-1, docs/archive/VIEW_REDESIGN_PLAN.md)
export function createQueryClient({ retry = 1 }: QueryClientOptions = {}) {
    return new QueryClient({
        queryCache: new QueryCache({
            onError: () => notifyQueryError(),
        }),
        defaultOptions: {
            queries: { retry },
            mutations: { retry: false },
        },
    });
}
