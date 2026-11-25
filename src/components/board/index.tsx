import { useCallback, useState } from 'react';
import { isNotFound } from '@/api';
import { ensembleExists } from '@/api/ensemble';
import { useTeamContext, useEnsembleContext, useDrawerContext } from '@/context';
import { useQuery } from '@tanstack/react-query';
import {
    ensemblesQueryOptions,
    useDeleteEnsemble,
    useRefreshEnsembles,
    useBoardSchedule,
    useUpdateEnsemble,
} from '@/queries/ensembles';
import { useRefreshTeamsAndEnsembles, useTeams } from '@/queries/teams';
import WeekCalendar from '@/components/schedule/WeekCalendar';
import SlotDrawer, { type SlotView } from '@/components/schedule/SlotDrawer';
import EnsembleInfoDrawer from '@/components/schedule/EnsembleInfoDrawer';
import UpdateEnsembleDrawer2 from './updateEnsembleDrawers/UpdateEnsembleDrawer2';
import UpdateEnsembleDrawer3 from './updateEnsembleDrawers/UpdateEnsembleDrawer3';
import UpdateEnsembleDrawer4 from './updateEnsembleDrawers/UpdateEnsembleDrawer4';
import dayjs, { type Dayjs } from 'dayjs';
import { toast } from 'sonner';
import { getRepeatEnd, toEnsembleRequest } from '@/lib/ensemble';
import {
    getRegularNextDate,
    resolveSlotTap,
    type BoardDay,
    type BoardView,
    type CalendarEvent,
} from '@/lib/calendar';
import { getTodayIdx } from '@/lib/week';
import type { TimeSlot } from '@/types';
import 'dayjs/locale/ko';

dayjs.locale('ko');

interface BoardProps {
    /** 보여줄 7일 (왼쪽부터 열 순서, lib/calendar의 getBoardDays) */
    days: BoardDay[];
    today: Dayjs;
    view: BoardView;
    /** 주를 바꿀 때 들어오는 방향 (애니메이션). 처음 그릴 때는 null */
    direction: 'prev' | 'next' | null;
}

// 합주표 (View 개편 V-2: 주 단위 캘린더 + 아래에서 올라오는 합주 정보·합주 잡기 Drawer).
// PIN 단계는 합주 정보 Drawer 안에 있고, 수정의 입력 단계(반복 여부·날짜·시간)는 아직 옛 Drawer다
const Board = ({ days, today, view, direction }: BoardProps) => {
    const teams = useTeams();
    const columns = useBoardSchedule(days.map((day) => day.date));
    // 수정·미루기 때 반복 종료 날짜(due)를 그대로 두기 위해 서버 응답 원본을 본다
    const { data: ensembleList } = useQuery(ensemblesQueryOptions);
    const refreshEnsembles = useRefreshEnsembles();
    const refreshTeamsAndEnsembles = useRefreshTeamsAndEnsembles();
    const { mutateAsync: updateEnsembleAsync } = useUpdateEnsemble();
    const { mutateAsync: deleteEnsembleAsync } = useDeleteEnsemble();
    const { setTeamStates } = useTeamContext();
    const { setEnsembleStates, setNextDate, setRepeat } = useEnsembleContext();
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

    // 합주 블록 클릭: 바로 정보 Drawer를 연다 (이전에는 여기서 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5).
    // 합주 잡기 Drawer의 목록에서 고른 경우에도 쓰므로, 열린 Drawer를 정보 Drawer로 바꾼다
    // 누른 블록의 캘린더 날짜 (그 블록이 있던 열의 날짜): "같은 시간에 다른 팀 합주 잡기"의 날짜 (24차)
    const [calendarDate, setCalendarDate] = useState<Dayjs | null>(null);
    const handleEnsembleClick = useCallback(
        (
            { id, teamId, name, repeat, nextDate, startTime, endTime }: CalendarEvent,
            date: Dayjs,
        ) => {
            setTeamStates(teamId, '', name);
            setEnsembleStates(id, repeat, nextDate, startTime, endTime);
            setCalendarDate(date);
            setOpenedDrawers(['ensembleInfo']);
        },
        [setOpenedDrawers, setTeamStates, setEnsembleStates],
    );

    // 시간칸 클릭 (빈 칸, 또는 이름이 안 보이는 겹친 곳): 그 시간에 합주가 하나면 그 합주의 정보,
    // 없으면 빈 시간, 둘 이상이면 겹친 합주 목록을 합주 잡기 Drawer로 보여준다
    const [slotView, setSlotView] = useState<SlotView | null>(null);
    const handleSlotClick = (column: number, slot: TimeSlot) => {
        const date = days[column]?.date;
        if (!date) return;
        const tap = resolveSlotTap(columns[column] ?? [], slot);
        if (tap.kind === 'single') {
            handleEnsembleClick(tap.event, date);
            return;
        }
        setSlotView({
            date,
            day: getTodayIdx(date),
            tap: tap.kind === 'empty' ? { kind: 'empty', slot, range: tap.range } : tap,
        });
        openDrawer('slotInfo');
    };

    // 합주 정보 Drawer에서 팀 이름 클릭 (id는 team id). 합주 정보 Drawer를 팀 정보 Drawer로 바꾼다
    // (이전: 합주 정보 위에 쌓여, 뒤로 가면 합주 정보로 돌아왔다).
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
            setEnsembleStates();
            setOpenedDrawers(['teamInfo']);
        },
        [
            closeAllDrawers,
            refreshTeamsAndEnsembles,
            setEnsembleStates,
            setOpenedDrawers,
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
                // 반복 종료 날짜는 그대로 둔다 (반복 → 반복일 때만. 일회성을 반복으로 바꾸면 계속 반복, 23차).
                // 이전에는 수정·미루기 때마다 반복 합주의 due를 2099-12-31로 덮어썼다
                const current = ensembleList?.find(({ _id: ensembleId }) => ensembleId === id);
                const repeatEnd =
                    repeat && current?.repeat ? getRepeatEnd(current.due, dayjs()) : null;
                // 선택을 마친 뒤에만 호출되어 null이 아님 (null이면 nextDate.day()에서 TypeError → catch, 기존 동작)
                await updateEnsembleAsync({
                    id,
                    ...toEnsembleRequest(
                        teamId,
                        repeat,
                        nextDate!,
                        startTime!,
                        endTime!,
                        repeatEnd,
                    ),
                });
                setOpenedDrawers(['ensembleInfo']);
                return true;
            } catch (err) {
                if (isNotFound(err)) {
                    handleEnsembleGone();
                    toast.error('이미 삭제된 합주예요.');
                } else {
                    toast.error('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
                }
                return false;
            }
        },
        [ensembleList, handleEnsembleGone, setOpenedDrawers, updateEnsembleAsync],
    );

    const handleDeleteEnsemble = useCallback(
        async (id: string) => {
            try {
                await deleteEnsembleAsync(id);
                toast.success('삭제했어요.');
            } catch (err) {
                // 이미 삭제됐으면(404) 결과는 같다
                if (isNotFound(err)) toast.success('삭제했어요.');
                else toast.error('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
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
            return saved;
        },
        [handleUpdateEnsemble, setNextDate],
    );

    // 바로 하기(미루기 취소): 여러 번 미뤘어도 한 번에 되돌린다. 미루지 않았다면 다음 합주였을 날짜(오늘부터 처음 오는 그 요일)로 저장.
    // 처음부터 미래에 시작하도록 잡은 합주라면 시작을 앞당기는 것이 된다 (서버 데이터로 둘을 구분할 수 없음, ISSUES V9)
    const handleUnskipEnsemble = useCallback(
        async (
            id: string,
            teamId: string,
            repeat: boolean,
            nextDate: Dayjs | null,
            startTime: TimeSlot | null,
            endTime: TimeSlot | null,
        ) => {
            // 정보 Drawer가 열려 있는 동안 호출되어 null이 아님
            const regular = getRegularNextDate(
                { day: (nextDate!.day() + 6) % 7, endTime: endTime! },
                dayjs(),
            );
            const saved = await handleUpdateEnsemble(
                id,
                teamId,
                repeat,
                regular,
                startTime,
                endTime,
            );
            if (saved) setNextDate(regular);
            return saved;
        },
        [handleUpdateEnsemble, setNextDate],
    );

    // 일회성 합주를 매주 반복으로 바꾸기 (날짜·시간은 그대로)
    const handleRepeatEnsemble = useCallback(
        async (
            id: string,
            teamId: string,
            _repeat: boolean,
            nextDate: Dayjs | null,
            startTime: TimeSlot | null,
            endTime: TimeSlot | null,
        ) => {
            const saved = await handleUpdateEnsemble(
                id,
                teamId,
                true,
                nextDate,
                startTime,
                endTime,
            );
            if (saved) setRepeat(true);
            return saved;
        },
        [handleUpdateEnsemble, setRepeat],
    );

    return (
        <>
            <WeekCalendar
                days={days}
                columns={columns}
                today={today}
                view={view}
                direction={direction}
                onClickEvent={handleEnsembleClick}
                onClickSlot={handleSlotClick}
            />

            {/* DRAWERS */}
            <SlotDrawer
                view={slotView}
                onSelect={(event) => slotView && handleEnsembleClick(event, slotView.date)}
            />
            <EnsembleInfoDrawer
                checkEnsembleExists={checkEnsembleExists}
                handleClickTeamInfo={handleClickTeamInfo}
                handleSkipEnsemble={handleSkipEnsemble}
                handleUnskipEnsemble={handleUnskipEnsemble}
                handleRepeatEnsemble={handleRepeatEnsemble}
                handleDeleteEnsemble={handleDeleteEnsemble}
                calendarDate={calendarDate}
            />
            <UpdateEnsembleDrawer2 drawerId="updateEnsemble2" />
            <UpdateEnsembleDrawer3 drawerId="updateEnsemble3" />
            <UpdateEnsembleDrawer4
                drawerId="updateEnsemble4"
                handleUpdateEnsemble={handleUpdateEnsemble}
            />
        </>
    );
};

export default Board;
