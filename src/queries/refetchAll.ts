import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ensemblesQueryKey } from './ensembles';
import { noticesQueryKey, notesQueryKey } from './notes';
import { teamsQueryKey } from './teams';

const ALL_QUERY_KEYS = [teamsQueryKey, ensemblesQueryKey, notesQueryKey, noticesQueryKey];

/**
 * 화면 전체 데이터를 다시 불러온다 (이전 FetchContext의 fetchData와 같은 역할).
 * 임시: 3-7·3-8에서 변경마다 필요한 데이터만 무효화하는 mutation 훅으로 바뀌면 삭제한다.
 */
export function useRefetchAll(): () => Promise<void> {
    const queryClient = useQueryClient();
    return useCallback(async () => {
        await Promise.all(
            ALL_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
    }, [queryClient]);
}
