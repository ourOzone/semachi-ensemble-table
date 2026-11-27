// 관리자 화면의 조회·변경 훅 (백엔드 개편 B-7)
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    adminLogin,
    adminLogout,
    changeMasterPin,
    getActivities,
    getAdminSession,
    getOverview,
    getVisitor,
    type ActivityFilter,
} from '@/api/admin';

const ADMIN = ['admin'] as const;
const PAGE = 50;

export function useAdminSession() {
    return useQuery({ queryKey: [...ADMIN, 'session'], queryFn: getAdminSession });
}

/** 로그인에 성공하면 관리자 조회를 모두 새로 */
export function useAdminLogin() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminLogin,
        onSuccess: (result) => {
            if (result.ok) void queryClient.invalidateQueries({ queryKey: ADMIN });
        },
    });
}

export function useAdminLogout() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminLogout,
        onSettled: () => queryClient.resetQueries({ queryKey: ADMIN }),
    });
}

/** 활동 기록 (최근 것부터 50건씩, "더 보기"는 마지막 기록의 시각 이전) */
export function useActivities(filter: Omit<ActivityFilter, 'before' | 'limit'>) {
    return useInfiniteQuery({
        queryKey: [...ADMIN, 'activities', filter],
        queryFn: ({ pageParam }) => getActivities({ ...filter, before: pageParam, limit: PAGE }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1]?.at : undefined),
    });
}

export function useVisitor(visitorId: string) {
    return useQuery({
        queryKey: [...ADMIN, 'visitor', visitorId],
        queryFn: () => getVisitor(visitorId),
    });
}

export function useOverview() {
    return useQuery({ queryKey: [...ADMIN, 'overview'], queryFn: getOverview });
}

export function useChangeMasterPin() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ currentPin, newPin }: { currentPin: string; newPin: string }) =>
            changeMasterPin(currentPin, newPin),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [...ADMIN, 'overview'] }),
    });
}
