import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { addTeam, deleteTeam, getTeams, updateTeam } from '@/api/team';
import { toTeams } from '@/lib/board';
import type { Team, TeamUpdateRequest } from '@/types';
import { TEAMS, TEAMS_AND_ENSEMBLES, teamsQueryKey, useRefresh } from './keys';

export { teamsQueryKey };

/** 서버 응답 원본(TeamResponse[])을 캐시한다. 화면용 변환은 select에서 */
export const teamsQueryOptions = queryOptions({ queryKey: teamsQueryKey, queryFn: getTeams });

const NO_TEAMS: Team[] = [];

/** 소모임·회의를 뺀 팀 목록. 불러오기 전에는 빈 배열 (이전 FetchContext의 초기값과 같음) */
export function useTeams(): Team[] {
    const { data } = useQuery({ ...teamsQueryOptions, select: toTeams });
    return data ?? NO_TEAMS;
}

// ---------------- 변경 (mutation) ----------------
// 훅의 책임: 서버 요청 + 영향을 받는 목록만 다시 불러오기 (이전: 4개 목록 전체, ISSUES P1)
// UI 반응(Drawer 닫기·상태 초기화, 404 = 이미 삭제됨 처리)은 호출부가 mutateAsync 결과에 따라 처리한다.

/** 팀·합주 목록을 다시 불러온다 (팀이 바뀌면 합주도 영향을 받는다: keys.ts의 TEAMS_AND_ENSEMBLES) */
export function useRefreshTeamsAndEnsembles() {
    return useRefresh(TEAMS_AND_ENSEMBLES);
}

export function useAddTeam() {
    const refreshTeams = useRefresh(TEAMS);
    return useMutation({ mutationFn: addTeam, onSuccess: refreshTeams });
}

export function useUpdateTeam() {
    const refresh = useRefreshTeamsAndEnsembles();
    return useMutation({
        // pin: 서버가 확인할 팀 PIN (PIN 단계에서 맞은 것, 백엔드 개편 B-6)
        mutationFn: ({ id, pin, ...team }: TeamUpdateRequest & { id: string; pin: string }) =>
            updateTeam(id, team, pin),
        onSuccess: refresh,
    });
}

/** 성공·실패(404 = 이미 삭제됨 포함) 모두 다시 불러온다 (이전 handleDeleteTeam의 finally와 같음) */
export function useDeleteTeam() {
    const refresh = useRefreshTeamsAndEnsembles();
    return useMutation({
        mutationFn: ({ id, pin }: { id: string; pin: string }) => deleteTeam(id, pin),
        onSettled: refresh,
    });
}
