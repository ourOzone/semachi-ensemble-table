import { useCallback, useState } from 'react';
import { isNotFound } from '@/api/index';
import { ensembleExists } from '@/api/ensemble';
import { useDrawerStore } from '@/stores/drawer';
import { useEnsembleSelectionStore, useTeamSelectionStore } from '@/stores/selection';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ensemblesQueryOptions,
    useDeleteEnsemble,
    useRefreshEnsembles,
    useBoardSchedule,
    useUpdateEnsemble,
} from '@/queries/ensembles';
import { teamsQueryOptions, useRefreshTeamsAndEnsembles, useTeams } from '@/queries/teams';
import WeekCalendar from './week-calendar';
import SlotDrawer, { type SlotView } from './slot-drawer';
import EnsembleInfoDrawer from './ensemble-info-drawer';
import AddEnsembleDrawer, { type AddEnsembleInput } from './add-ensemble-drawer';
import type { EditTarget } from './add-ensemble-store';
import dayjs, { type Dayjs } from 'dayjs';
import { toast } from 'sonner';
import { getRepeatEnd, toEnsembleRequest, withStartTime } from '@/lib/ensemble';
import { formatDate } from '@/components/sheet/drawer-parts';
import {
    findOverlapLimit,
    getRegularNextDate,
    resolveSlotTap,
    type BoardDay,
    type BoardView,
    type CalendarEvent,
} from '@/lib/calendar';
import { getTodayIdx } from '@/lib/week';
import type { TimeSlot } from '@/types/index';
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
// PIN 단계는 합주 정보 Drawer 안에 있고, 수정은 PIN이 맞으면 합주 수정 Drawer(합주 잡기 Drawer의 수정 모드, 31차)
const Board = ({ days, today, view, direction }: BoardProps) => {
    const teams = useTeams();
    const columns = useBoardSchedule(days.map((day) => day.date));
    // 수정·미루기 때 반복 종료 날짜(due)를 그대로 두기 위해 서버 응답 원본을 본다
    const { data: ensembleList, isPending: ensemblesPending } = useQuery(ensemblesQueryOptions);
    // 처음 불러오는 동안은 캘린더에 회색 상자 (V-3 1차). 팀 색이 팀 순서로 정해져 팀 목록도 기다린다
    const { isPending: teamsPending } = useQuery(teamsQueryOptions);
    const refreshEnsembles = useRefreshEnsembles();
    const refreshTeamsAndEnsembles = useRefreshTeamsAndEnsembles();
    const { mutateAsync: updateEnsembleAsync } = useUpdateEnsemble();
    const { mutateAsync: deleteEnsembleAsync } = useDeleteEnsemble();
    const queryClient = useQueryClient();
    const { setTeamStates } = useTeamSelectionStore();
    const { setEnsembleStates, setNextDate, setRepeat } = useEnsembleSelectionStore();
    const { setOpenedDrawers, openDrawer, closeAllDrawers } = useDrawerStore();

    // 이미 삭제된 합주를 만났을 때: 상태·Drawer 초기화 후 합주 목록을 다시 불러온다
    const handleEnsembleGone = useCallback(() => {
        setTeamStates();
        setEnsembleStates();
        closeAllDrawers();
        refreshEnsembles();
    }, [closeAllDrawers, refreshEnsembles, setEnsembleStates, setTeamStates]);

    // 이미 삭제된 합주인지 체크. 정보·PIN Drawer가 다음 단계로 가기 전에 사용한다 (true를 리턴하면 계속 진행)
    // 이미 삭제됐으면(404) 알리고 Drawer를 모두 닫는다. 확인 요청 자체가 실패하면(서버 오류 등) 알리고 그대로 둔다
    // (V-3 17차, 이전: 둘을 구분하지 않고 알림 없이 Drawer를 모두 닫았다)
    const checkEnsembleExists = useCallback(
        async (id: string) => {
            try {
                await ensembleExists(id);
                return true;
            } catch (err) {
                if (isNotFound(err)) {
                    handleEnsembleGone();
                    toast.error('이미 삭제된 합주예요.');
                } else {
                    toast.error('확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
                }
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
                toast.error('이미 삭제된 팀이에요.'); // V-3 17차 (이전: 알림 없이 닫았다)
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

    // 미루기·바로 하기·반복으로 바꾸기의 저장 (수정은 handleEditEnsemble).
    // 이미 삭제됐으면 서버가 404를 준다 → 이미 삭제된 합주 처리 (이전에는 수정 전에 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5)
    const handleUpdateEnsemble = useCallback(
        async (
            id: string,
            teamId: string,
            repeat: boolean,
            nextDate: Dayjs | null,
            startTime: TimeSlot | null,
            endTime: TimeSlot | null,
            pin: string,
        ) => {
            try {
                // 반복 종료 날짜는 그대로 둔다 (반복 → 반복일 때만. 일회성을 반복으로 바꾸면 계속 반복, 23차).
                // 이전에는 수정·미루기 때마다 반복 합주의 due를 2099-12-31로 덮어썼다
                const current = ensembleList?.find(({ _id: ensembleId }) => ensembleId === id);
                const repeatEnd =
                    repeat && current?.repeat ? getRepeatEnd(current.due, dayjs()) : null;
                // 정보 Drawer가 열려 있는 동안 호출되어 null이 아님 (null이면 nextDate.day()에서 TypeError → catch, 기존 동작)
                await updateEnsembleAsync({
                    id,
                    pin,
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

    // 합주 수정 Drawer에서 저장 (31차). 합주 잡기와 같이 저장 직전에 다시 불러와 4개 겹침을 한 번 더 확인한다 (자신은 빼고).
    // 성공하면 합주 정보로 돌아와 바뀐 값을 보여준다. 반복 종료 날짜도 이 Drawer에서 고친 값으로 보낸다
    const handleEditEnsemble = async (
        { team, repeat, date, startTime, endTime, repeatEnd }: AddEnsembleInput,
        target: EditTarget | null,
        pin: string,
    ) => {
        if (!target) return false;
        try {
            const latest = await queryClient.fetchQuery({ ...ensemblesQueryOptions, staleTime: 0 });
            const others = latest.filter(({ _id: ensembleId }) => ensembleId !== target.id);
            if (findOverlapLimit(others, { date, repeat, until: repeatEnd, startTime, endTime })) {
                toast.error('그사이 이 시간에 합주가 4개 잡혔어요. 다른 시간을 골라 주세요.');
                return false;
            }
            await updateEnsembleAsync({
                id: target.id,
                pin,
                ...toEnsembleRequest(
                    team.id,
                    repeat,
                    withStartTime(date, startTime),
                    startTime,
                    endTime,
                    repeatEnd,
                ),
            });
            setEnsembleStates(target.id, repeat, date, startTime, endTime);
            // 요일이 바뀌었을 수 있어 캘린더 날짜는 버린다 ("같은 시간에 다른 팀 합주 잡기"는 다음 합주 날짜로)
            setCalendarDate(null);
            setOpenedDrawers(['ensembleInfo']);
            // 알림은 한 문장만 (V-3 15차, 이전: 아래에 합주 요약)
            toast.success(team.isEvent ? '일정을 수정했어요.' : '합주를 수정했어요.');
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
    };

    const handleDeleteEnsemble = useCallback(
        async (id: string, pin: string) => {
            try {
                await deleteEnsembleAsync({ id, pin });
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
            pin: string,
        ) => {
            const skipTo = dayjs(nextDate).add(7, 'day');
            const saved = await handleUpdateEnsemble(
                id,
                teamId,
                repeat,
                skipTo,
                startTime,
                endTime,
                pin,
            );
            if (saved) {
                setNextDate((prev) => dayjs(prev).add(7, 'day'));
                toast.success(`${formatDate(skipTo)}로 미뤘어요.`); // V-3 16차
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
            pin: string,
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
                pin,
            );
            if (saved) {
                setNextDate(regular);
                toast.success(`${formatDate(regular)}부터 다시 해요.`); // V-3 16차
            }
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
            pin: string,
        ) => {
            const saved = await handleUpdateEnsemble(
                id,
                teamId,
                true,
                nextDate,
                startTime,
                endTime,
                pin,
            );
            if (saved) {
                setRepeat(true);
                toast.success('매주 반복으로 바꿨어요.'); // V-3 16차
            }
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
                loading={ensemblesPending || teamsPending}
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
            <AddEnsembleDrawer mode="update" onSubmit={handleEditEnsemble} />
        </>
    );
};

export default Board;
