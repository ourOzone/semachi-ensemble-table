import { useCallback } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

// query key 모음. 팀 변경이 합주 목록도 다시 불러와야 하는 등 서로 참조하므로, 순환 import를 피하려고 한곳에 둔다.

export const teamsQueryKey = ['teams'] as const;
export const ensemblesQueryKey = ['ensembles'] as const;
export const notesQueryKey = ['notes'] as const;
export const noticesQueryKey = ['notices'] as const;

/** 다시 불러올 목록 묶음. useRefresh에는 이처럼 모듈 상수를 넘겨야 돌려받는 함수가 렌더링마다 바뀌지 않는다 */
export const TEAMS: readonly QueryKey[] = [teamsQueryKey];
export const ENSEMBLES: readonly QueryKey[] = [ensemblesQueryKey];
/** 팀이 바뀌면 합주도 영향을 받는다: 팀 이름 변경은 서버가 합주의 teamName도 바꾸고, 팀 삭제는 합주도 함께 지운다 */
export const TEAMS_AND_ENSEMBLES: readonly QueryKey[] = [teamsQueryKey, ensemblesQueryKey];

/**
 * 주어진 목록들을 다시 불러오는 함수를 돌려준다. 다시 불러오기는 기다리지 않는다
 * (이전 fetchData()도 기다리지 않고 Drawer를 닫았다)
 */
export function useRefresh(queryKeys: readonly QueryKey[]): () => void {
    const queryClient = useQueryClient();
    return useCallback(() => {
        queryKeys.forEach((queryKey) => {
            void queryClient.invalidateQueries({ queryKey });
        });
    }, [queryClient, queryKeys]);
}
