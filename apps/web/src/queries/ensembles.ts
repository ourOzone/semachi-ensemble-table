import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { addEnsemble, deleteEnsemble, getEnsembles, updateEnsemble } from '@/api/ensemble';
import { buildColorMap, toTeams } from '@/lib/board';
import { toDaysSchedule, type CalendarEvent, type WithLane } from '@/lib/calendar';
import type { EnsembleUpdateRequest } from '@/types';
import { ENSEMBLES, ensemblesQueryKey, useRefresh } from './keys';
import { teamsQueryOptions } from './teams';

export { ensemblesQueryKey };

/** 서버 응답 원본(EnsembleResponse[])을 캐시한다 */
export const ensemblesQueryOptions = queryOptions({
    queryKey: ensemblesQueryKey,
    queryFn: getEnsembles,
});

/**
 * 합주판의 날짜들(열 순서)마다 그날 보이는 합주 (View 개편 V-2, 26차부터 날짜 단위: lib/calendar의 getBoardDays).
 * 팀 색이 팀 목록 순서로 정해지므로 팀·합주를 모두 불러온 뒤에 만든다. 불러오기 전에는 빈 날짜들
 */
export function useBoardSchedule(dates: readonly Dayjs[]): WithLane<CalendarEvent>[][] {
    const { data: teams } = useQuery({ ...teamsQueryOptions, select: toTeams });
    const { data: ensembles } = useQuery(ensemblesQueryOptions);
    const datesKey = dates.map((date) => date.valueOf()).join(',');

    return useMemo(() => {
        const days = datesKey.split(',').map((ms) => dayjs(Number(ms)));
        return teams && ensembles
            ? toDaysSchedule(ensembles, buildColorMap(teams), days, dayjs())
            : days.map(() => []);
    }, [teams, ensembles, datesKey]);
}

// ---------------- 변경 (mutation) ----------------
// 훅의 책임: 서버 요청 + 합주 목록만 다시 불러오기 (이전: 4개 목록 전체, ISSUES P1)
// UI 반응(Drawer 이동·상태 초기화, 404 = 이미 삭제됨 처리)은 호출부가 mutateAsync 결과에 따라 처리한다.

export function useRefreshEnsembles() {
    return useRefresh(ENSEMBLES);
}

/** 서버가 팀 존재를 검사하지 않으므로(ISSUES B4) 호출부가 팀 존재 확인 후 호출한다 */
export function useAddEnsemble() {
    const refreshEnsembles = useRefreshEnsembles();
    return useMutation({ mutationFn: addEnsemble, onSuccess: refreshEnsembles });
}

/** 합주 수정·미루기 */
export function useUpdateEnsemble() {
    const refreshEnsembles = useRefreshEnsembles();
    return useMutation({
        mutationFn: ({ id, ...ensemble }: EnsembleUpdateRequest & { id: string }) =>
            updateEnsemble(id, ensemble),
        onSuccess: refreshEnsembles,
    });
}

/** 성공·실패(404 = 이미 삭제됨 포함) 모두 다시 불러온다 (이전 handleDeleteEnsemble의 finally와 같음) */
export function useDeleteEnsemble() {
    const refreshEnsembles = useRefreshEnsembles();
    return useMutation({ mutationFn: deleteEnsemble, onSettled: refreshEnsembles });
}
