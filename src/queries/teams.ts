import { queryOptions, useQuery } from '@tanstack/react-query';
import { getTeams } from '@/api/team';
import { toTeams } from '@/lib/board';
import type { Team } from '@/types';

export const teamsQueryKey = ['teams'] as const;

/** 서버 응답 원본(TeamResponse[])을 캐시한다. 화면용 변환은 select에서 */
export const teamsQueryOptions = queryOptions({ queryKey: teamsQueryKey, queryFn: getTeams });

const NO_TEAMS: Team[] = [];

/** 소모임·회의를 뺀 팀 목록. 불러오기 전에는 빈 배열 (이전 FetchContext의 초기값과 같음) */
export function useTeams(): Team[] {
    const { data } = useQuery({ ...teamsQueryOptions, select: toTeams });
    return data ?? NO_TEAMS;
}
