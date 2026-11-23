import { useCallback } from 'react';
import { isNotFound } from '@/api';
import { ensembleExists } from '@/api/ensemble';
import { useTeamContext, useEnsembleContext, useDrawerContext } from '@/context';
import {
    useDeleteEnsemble,
    useRefreshEnsembles,
    useUpdateEnsemble,
    useWeekSchedule,
} from '@/queries/ensembles';
import { useRefreshTeamsAndEnsembles, useTeams } from '@/queries/teams';
import WeekCalendar from '@/components/schedule/WeekCalendar';
import EnsembleInfoDrawer from './EnsembleInfoDrawer';
import UpdateEnsembleDrawer1 from './updateEnsembleDrawers/UpdateEnsembleDrawer1';
import UpdateEnsembleDrawer2 from './updateEnsembleDrawers/UpdateEnsembleDrawer2';
import UpdateEnsembleDrawer3 from './updateEnsembleDrawers/UpdateEnsembleDrawer3';
import UpdateEnsembleDrawer4 from './updateEnsembleDrawers/UpdateEnsembleDrawer4';
import DeleteEnsembleDrawer from './DeleteEnsembleDrawer';
import SkipEnsembleDrawer from './SkipEnsembleDrawer';
import dayjs, { type Dayjs } from 'dayjs';
import { toEnsembleRequest } from '@/lib/ensemble';
import type { CalendarEvent } from '@/lib/calendar';
import type { TimeSlot } from '@/types';
import 'dayjs/locale/ko';

dayjs.locale('ko');

interface BoardProps {
    /** 보여줄 주의 월요일 0시 (lib/calendar의 getWeekStart) */
    weekStart: Dayjs;
    /** 오늘이 이 주에 있으면 요일 인덱스(월 0 ~ 일 6), 없으면 null */
    todayIdx: number | null;
}

// 합주표 (View 개편 V-2: 주 단위 캘린더). 합주 정보·수정·미루기·삭제 Drawer는 아직 옛 Drawer다
const Board = ({ weekStart, todayIdx }: BoardProps) => {
    const teams = useTeams();
    const week = useWeekSchedule(weekStart);
    const refreshEnsembles = useRefreshEnsembles();
    const refreshTeamsAndEnsembles = useRefreshTeamsAndEnsembles();
    const { mutateAsync: updateEnsembleAsync } = useUpdateEnsemble();
    const { mutateAsync: deleteEnsembleAsync } = useDeleteEnsemble();
    const { setTeamStates } = useTeamContext();
    const { setEnsembleStates, setNextDate } = useEnsembleContext();
    const { setOpenedDrawers, openDrawer, closeAllDrawers } = useDrawerContext();

    // 이미 삭제된 합주를 만났을 때: 상태·Drawer 초기화 후 합주 목록을 다시 불러온다
    const handleEnsembleGone = useCallback(() => {
        setTeamStates();
        setEnsembleStates();
        closeAllDrawers();
        refreshEnsembles();
    }, [closeAllDrawers, refreshEnsembles, setEnsembleStates, setTeamStates]);

    // 이미 삭제된 합주인지 체크. 정보·PIN Drawer가 다음 단계로 가기 전에 사용한다 (true를 리턴하면 계속 진행)
    const checkEnsembleExists = useCallback(
        async (id: string) => {
            try {
                await ensembleExists(id);
                return true;
            } catch {
                handleEnsembleGone();
                return false;
            }
        },
        [handleEnsembleGone],
    );

    // 합주 블록 클릭: 바로 정보 Drawer를 연다 (이전에는 여기서 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5)
    const handleEnsembleClick = useCallback(
        ({ id, teamId, name, repeat, nextDate, startTime, endTime }: CalendarEvent) => {
            setTeamStates(teamId, '', name);
            setEnsembleStates(id, repeat, nextDate, startTime, endTime);
            openDrawer('ensembleInfo');
        },
        [openDrawer, setTeamStates, setEnsembleStates],
    );

    // 합주 정보 Drawer에서 팀 정보 보기 클릭 (id는 team id).
    // 불러온 팀 목록에서 찾는다. 없으면 이미 삭제된 팀 (이전에는 존재 확인 요청 후 찾았다: 사전 결정 5)
    const handleClickTeamInfo = useCallback(
        (id: string) => {
            const team = teams.find((team) => team.id === id);
            if (!team) {
                setTeamStates();
                setEnsembleStates();
                closeAllDrawers();
                refreshTeamsAndEnsembles();
                return;
            }
            setTeamStates(id, team.type, team.name, team.desc);
            openDrawer('teamInfo');
        },
        [
            closeAllDrawers,
            openDrawer,
            refreshTeamsAndEnsembles,
            setEnsembleStates,
            setTeamStates,
            teams,
        ],
    );

    // 이미 삭제됐으면 서버가 404를 준다 → 이미 삭제된 합주 처리 (이전에는 수정 전에 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5)
    const handleUpdateEnsemble = useCallback(
        async (
            id: string,
            teamId: string,
            repeat: boolean,
            nextDate: Dayjs | null,
            startTime: TimeSlot | null,
            endTime: TimeSlot | null,
        ) => {
            try {
                // 선택을 마친 뒤에만 호출되어 null이 아님 (null이면 nextDate.day()에서 TypeError → catch, 기존 동작)
                await updateEnsembleAsync({
                    id,
                    ...toEnsembleRequest(teamId, repeat, nextDate!, startTime!, endTime!),
                });
                setOpenedDrawers(['ensembleInfo']);
                return true;
            } catch (err) {
                if (isNotFound(err)) handleEnsembleGone();
                // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
                return false;
            }
        },
        [handleEnsembleGone, setOpenedDrawers, updateEnsembleAsync],
    );

    const handleDeleteEnsemble = useCallback(
        async (id: string) => {
            try {
                await deleteEnsembleAsync(id);
            } catch {
                // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
            } finally {
                setEnsembleStates();
                closeAllDrawers();
            }
        },
        [closeAllDrawers, deleteEnsembleAsync, setEnsembleStates],
    );

    // 다음 번에 안 해요 클릭 시 nextDate를 7일 뒤로 변경.
    // 저장에 성공한 뒤에 화면의 다음 날짜를 바꾼다 (이전: 저장을 기다리지 않고 먼저 바꿔, 실패해도 바뀐 날짜가 보였다: ISSUES F4)
    const handleSkipEnsemble = useCallback(
        async (
            id: string,
            teamId: string,
            repeat: boolean,
            nextDate: Dayjs | null,
            startTime: TimeSlot | null,
            endTime: TimeSlot | null,
        ) => {
            const saved = await handleUpdateEnsemble(
                id,
                teamId,
                repeat,
                dayjs(nextDate).add(7, 'day'),
                startTime,
                endTime,
            );
            if (saved) {
                setNextDate((prev) => dayjs(prev).add(7, 'day'));
            }
        },
        [handleUpdateEnsemble, setNextDate],
    );

    return (
        <>
            <WeekCalendar
                week={week}
                weekStart={weekStart}
                todayIdx={todayIdx}
                onClickEvent={handleEnsembleClick}
            />

            {/* DRAWERS */}
            <EnsembleInfoDrawer
                drawerId="ensembleInfo"
                checkEnsembleExists={checkEnsembleExists}
                handleClickTeamInfo={handleClickTeamInfo}
                handleSkipEnsemble={handleSkipEnsemble}
            />
            <UpdateEnsembleDrawer1
                drawerId="updateEnsemble1"
                checkEnsembleExists={checkEnsembleExists}
            />
            <UpdateEnsembleDrawer2 drawerId="updateEnsemble2" />
            <UpdateEnsembleDrawer3 drawerId="updateEnsemble3" />
            <UpdateEnsembleDrawer4
                drawerId="updateEnsemble4"
                handleUpdateEnsemble={handleUpdateEnsemble}
            />
            <DeleteEnsembleDrawer
                drawerId="deleteEnsemble"
                checkEnsembleExists={checkEnsembleExists}
                handleDeleteEnsemble={handleDeleteEnsemble}
            />
            <SkipEnsembleDrawer
                drawerId="skipEnsemble"
                checkEnsembleExists={checkEnsembleExists}
                handleSkipEnsemble={handleSkipEnsemble}
            />
        </>
    );
};

export default Board;
