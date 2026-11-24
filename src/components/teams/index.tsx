import { useCallback } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import type { Team } from '@/types';
import { isNotFound } from '@/api';
import { teamExists } from '@/api/team';
import { useTeamContext, useDrawerContext } from '@/context';
import { useAddEnsemble } from '@/queries/ensembles';
import {
    useAddTeam,
    useDeleteTeam,
    useRefreshTeamsAndEnsembles,
    useTeams,
    useUpdateTeam,
} from '@/queries/teams';
import { eventIds, idx2hour } from '@/constants';
import { buildColorMap } from '@/lib/board';
import { toEnsembleRequest } from '@/lib/ensemble';
import TeamChips, { type Chip } from '@/components/schedule/TeamChips';
import AddEnsembleDrawer, {
    type AddEnsembleInput,
    type TeamOption,
} from '@/components/schedule/AddEnsembleDrawer';
import { formatDate, formatTimeRange } from '@/components/schedule/drawerParts';
import theme from '@/styles/theme';
import TeamInfoDrawer from './TeamInfoDrawer';
import EventInfoDrawer from './EventInfoDrawer';
import AddTeamDrawer1 from './addTeamDrawers/AddTeamDrawer1';
import AddTeamDrawer2 from './addTeamDrawers/AddTeamDrawer2';
import AddTeamDrawer3 from './addTeamDrawers/AddTeamDrawer3';
import AddTeamDrawer4 from './addTeamDrawers/AddTeamDrawer4';
import AddTeamDrawer5 from './addTeamDrawers/AddTeamDrawer5';
import AddTeamDrawer6 from './addTeamDrawers/AddTeamDrawer6';
import UpdateTeamDrawer1 from './updateTeamDrawers/UpdateTeamDrawer1';
import UpdateTeamDrawer2 from './updateTeamDrawers/UpdateTeamDrawer2';
import UpdateTeamDrawer3 from './updateTeamDrawers/UpdateTeamDrawer3';
import UpdateTeamDrawer4 from './updateTeamDrawers/UpdateTeamDrawer4';
import UpdateTeamDrawer5 from './updateTeamDrawers/UpdateTeamDrawer5';
import DeleteTeamDrawer from './DeleteTeamDrawer';

const eventNames1 = ['보소', '기소', '베소', '드소', '키소'];
const eventNames2 = ['메인 회의', '재학생 회의', '회의', '오디션', '합주 불가', '동방 사용 불가'];

const Teams = () => {
    const teams = useTeams();
    const refreshTeamsAndEnsembles = useRefreshTeamsAndEnsembles();
    const { mutateAsync: addTeamAsync } = useAddTeam();
    const { mutateAsync: updateTeamAsync } = useUpdateTeam();
    const { mutateAsync: deleteTeamAsync } = useDeleteTeam();
    const { mutateAsync: addEnsembleAsync } = useAddEnsemble();
    const { setTeamStates } = useTeamContext();
    const { setOpenedDrawers, openDrawer, closeAllDrawers } = useDrawerContext();

    // 이미 삭제된 팀을 만났을 때: 상태·Drawer 초기화 후 팀·합주 목록을 다시 불러온다
    const handleTeamGone = useCallback(() => {
        setTeamStates();
        closeAllDrawers();
        refreshTeamsAndEnsembles();
    }, [closeAllDrawers, refreshTeamsAndEnsembles, setTeamStates]);

    // 이미 삭제된 팀인지 체크. 팀 정보·PIN Drawer와 합주 추가(서버가 팀 존재를 검사하지 않음: ISSUES B4)가 사용한다
    // 해당 함수를 try -> if(else 없음) 에서 호출: false 리턴시 if문 넘긴채 그대로 try문 종료, 이후 try문 내에서 에러시 catch
    const checkTeamExists = useCallback(
        async (id: string) => {
            try {
                await teamExists(id);
                return true;
            } catch {
                handleTeamGone();
                return false;
            }
        },
        [handleTeamGone],
    );

    // 팀 클릭: 바로 팀 정보 Drawer를 연다 (이전에는 여기서 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5)
    const handleClickTeam = useCallback(
        ({ id, type, name, desc }: Team) => {
            setTeamStates(id, type, name, desc);
            openDrawer('teamInfo');
        },
        [openDrawer, setTeamStates],
    );

    // 소모임 및 회의 클릭 (id값은 순서대로 event0~ 으로 지정)
    const handleClickEvent = useCallback(
        (id: string, name: string) => {
            setTeamStates(id, '', name);
            openDrawer('eventInfo');
        },
        [openDrawer, setTeamStates],
    );

    // 팀 추가 버튼
    const handleClickAddTeam = useCallback(() => {
        setTeamStates(); // 초기화
        openDrawer('addTeam1');
    }, [setTeamStates, openDrawer]);

    const handleAddTeam = useCallback(
        async (type: string, name: string, desc: string[], pin: string) => {
            try {
                await addTeamAsync({ type, name, desc, pin, publishDate: dayjs() });
                setTeamStates(); // 초기화
                return true;
            } catch {
                // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
                return false;
            }
        },
        [addTeamAsync, setTeamStates],
    );

    // 이미 삭제됐으면 서버가 404를 준다 → 이미 삭제된 팀 처리 (이전에는 수정 전에 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5)
    const handleUpdateTeam = useCallback(
        async (id: string, type: string, name: string, desc: string[]) => {
            try {
                await updateTeamAsync({ id, type, name, desc });
                setOpenedDrawers(['teamInfo']);
            } catch (err) {
                if (isNotFound(err)) handleTeamGone();
                // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
            }
        },
        [handleTeamGone, setOpenedDrawers, updateTeamAsync],
    );

    const handleDeleteTeam = useCallback(
        async (id: string) => {
            try {
                await deleteTeamAsync(id);
            } catch {
                // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
            } finally {
                setTeamStates();
                closeAllDrawers();
            }
        },
        [closeAllDrawers, deleteTeamAsync, setTeamStates],
    );

    // 합주 잡기 Drawer의 저장 (View 개편 V-2 21차). 성공하면 Drawer를 모두 닫고 알림 (이전: 완료 화면 Drawer "락앤롤!")
    const handleAddEnsemble = useCallback(
        async ({ team, repeat, date, startTime, endTime }: AddEnsembleInput) => {
            try {
                // 서버가 팀 존재를 검사하지 않으므로(ISSUES B4) 사전 확인을 유지한다.
                // 소모임·일정은 팀 목록에 없는 고정 id라 확인하지 않는다 (옛 흐름은 확인 요청을 보냈다)
                if (!team.isEvent && !(await checkTeamExists(team.id))) {
                    toast.error('이미 삭제된 팀이에요.'); // checkTeamExists가 Drawer를 모두 닫았다
                    return false;
                }
                // 날짜에 시작 시각을 붙여 보낸다: 서버는 지난 일회성 합주를 날짜로 걸러 내는데(오늘 0시 기준),
                // 0시로 보내면 서버 시간대에 따라 그날이 되기 전에 지난 것으로 걸러질 수 있다 (옛 달력은 고른 때의 시각이 붙었다)
                const [hour = 0, minute = 0] = (idx2hour[startTime] ?? '').split(':').map(Number);
                const nextDate = date.hour(hour).minute(minute);
                await addEnsembleAsync({
                    teamName: team.name,
                    ...toEnsembleRequest(team.id, repeat, nextDate, startTime, endTime),
                });
                setTeamStates(); // 초기화
                closeAllDrawers();
                toast.success(team.isEvent ? '일정을 잡았어요.' : '합주를 잡았어요.', {
                    description: `${team.name} · ${formatDate(date)}${repeat ? '부터 매주' : ''} ${formatTimeRange(startTime, endTime)}`,
                });
                return true;
            } catch {
                toast.error('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
                return false;
            }
        },
        [addEnsembleAsync, checkTeamExists, closeAllDrawers, setTeamStates],
    );

    // 팀 목록 (View 개편 V-2: 한 줄로 줄이고 "전체"로 펼침). 색은 합주표와 같은 매핑(buildColorMap)
    const colorMap = buildColorMap(teams);
    const teamChips: Chip[] = teams.map((team) => ({
        key: team.id,
        name: team.name,
        color: colorMap[team.id] ?? theme.blueGray,
        onClick: () => handleClickTeam(team),
    }));
    const eventChips: Chip[] = [...eventNames1, ...eventNames2].map((name, idx) => ({
        key: name,
        name,
        color: theme.eventColors[idx] ?? theme.blueGray,
        onClick: () => handleClickEvent(eventIds[idx]!, name), // eventIds와 같은 순서
    }));

    // 합주 잡기 Drawer의 팀 고르기 (팀 목록과 같은 색)
    const teamOptions: TeamOption[] = teams.map((team, idx) => ({
        id: team.id,
        name: team.name,
        color: teamChips[idx]!.color,
        isEvent: false,
    }));
    const eventOptions: TeamOption[] = eventChips.map((chip, idx) => ({
        id: eventIds[idx]!, // eventIds와 같은 순서
        name: chip.name,
        color: chip.color,
        isEvent: true,
    }));

    return (
        <>
            <TeamChips teams={teamChips} events={eventChips} onAddTeam={handleClickAddTeam} />

            {/* DRAWERS */}
            <TeamInfoDrawer drawerId="teamInfo" checkTeamExists={checkTeamExists} />
            <EventInfoDrawer drawerId="eventInfo" />
            <AddTeamDrawer1 drawerId="addTeam1" />
            <AddTeamDrawer2 drawerId="addTeam2" />
            <AddTeamDrawer3 drawerId="addTeam3" />
            <AddTeamDrawer4 drawerId="addTeam4" />
            <AddTeamDrawer5 drawerId="addTeam5" handleAddTeam={handleAddTeam} />
            <AddTeamDrawer6 drawerId="addTeam6" />
            <UpdateTeamDrawer1 drawerId="updateTeam1" checkTeamExists={checkTeamExists} />
            <UpdateTeamDrawer2 drawerId="updateTeam2" />
            <UpdateTeamDrawer3 drawerId="updateTeam3" />
            <UpdateTeamDrawer4 drawerId="updateTeam4" />
            <UpdateTeamDrawer5 drawerId="updateTeam5" handleUpdateTeam={handleUpdateTeam} />
            <DeleteTeamDrawer
                drawerId="deleteTeam"
                checkTeamExists={checkTeamExists}
                handleDeleteTeam={handleDeleteTeam}
            />
            <AddEnsembleDrawer
                teams={teamOptions}
                events={eventOptions}
                onSubmit={handleAddEnsemble}
            />
        </>
    );
};

export default Teams;
