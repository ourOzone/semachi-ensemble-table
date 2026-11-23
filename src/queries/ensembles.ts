import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { addEnsemble, deleteEnsemble, getEnsembles, updateEnsemble } from '@/api/ensemble';
import { buildColorMap, toBoard, toTeams } from '@/lib/board';
import { toWeekSchedule, type CalendarEvent, type WithLane } from '@/lib/calendar';
import type { EnsembleBoard, EnsembleUpdateRequest } from '@/types';
import { ENSEMBLES, ensemblesQueryKey, useRefresh } from './keys';
import { teamsQueryOptions } from './teams';

export { ensemblesQueryKey };

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

const NO_WEEK: WithLane<CalendarEvent>[][] = Array.from({ length: 7 }, () => []);

/**
 * 한 주의 캘린더 (View 개편 V-2). weekStart는 그 주 월요일 0시 (lib/calendar의 getWeekStart).
 * 팀 색이 팀 목록 순서로 정해지므로 팀·합주를 모두 불러온 뒤에 만든다. 불러오기 전에는 빈 주
 */
export function useWeekSchedule(weekStart: Dayjs): WithLane<CalendarEvent>[][] {
    const { data: teams } = useQuery({ ...teamsQueryOptions, select: toTeams });
    const { data: ensembles } = useQuery(ensemblesQueryOptions);
    const weekKey = weekStart.valueOf();

    return useMemo(
        () =>
            teams && ensembles
                ? toWeekSchedule(ensembles, buildColorMap(teams), dayjs(weekKey), dayjs())
                : NO_WEEK,
        [teams, ensembles, weekKey],
    );
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
