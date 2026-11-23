import { QueryClient } from '@tanstack/react-query';

// 3단계 사전 결정 3번 (docs/archive/LOGIC_IMPROVEMENT_PLAN.md)
// - 탭으로 돌아오면 다시 불러온다 (refetchOnWindowFocus, TanStack 기본값 유지) → 다른 사람의 변경 반영
// - 조회는 실패 시 1회만 재시도, 변경(mutation)은 재시도하지 않는다 (기본값)
// - 조회 실패 알림은 3-6(알림 중앙화)에서 QueryCache onError로 연결한다
export function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: 1,
            },
        },
    });
}
