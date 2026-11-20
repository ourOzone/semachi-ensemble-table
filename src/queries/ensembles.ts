import { queryOptions, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import dayjs from 'dayjs';
import { getEnsembles } from '@/api/ensemble';
import { toBoard, toTeams } from '@/lib/board';
import type { EnsembleBoard } from '@/types';
import { teamsQueryOptions } from './teams';

export const ensemblesQueryKey = ['ensembles'] as const;

/** 서버 응답 원본(EnsembleResponse[])을 캐시한다 */
export const ensemblesQueryOptions = queryOptions({
    queryKey: ensemblesQueryKey,
    queryFn: getEnsembles,
});

const NO_BOARD: EnsembleBoard = [];

/**
 * 합주표 (7 x 30). 팀 색상이 팀 목록 순서에 따라 정해지므로 팀·합주를 모두 불러온 뒤에 만든다.
 * 불러오기 전에는 빈 배열 (이전 FetchContext의 초기값과 같음).
 * 다음 합주 날짜는 데이터가 바뀔 때(불러올 때) 현재 시각으로 다시 계산한다 (이전 fetchData와 같은 시점)
 */
export function useBoard(): EnsembleBoard {
    const { data: teams } = useQuery({ ...teamsQueryOptions, select: toTeams });
    const { data: ensembles } = useQuery(ensemblesQueryOptions);

    return useMemo(
        () => (teams && ensembles ? toBoard(teams, ensembles, dayjs()) : NO_BOARD),
        [teams, ensembles],
    );
}
