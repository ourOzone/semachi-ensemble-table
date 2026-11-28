import { useCallback } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import type { Team } from '@/types/index';
import { isNotFound } from '@/api/index';
import { teamExists } from '@/api/team';
import { useDrawerStore } from '@/stores/drawer';
import { useTeamSelectionStore } from '@/stores/selection';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ensemblesQueryOptions, useAddEnsemble } from '@/queries/ensembles';
import { findOverlapLimit } from '@/lib/calendar';
import {
    useAddTeam,
    useDeleteTeam,
    teamsQueryOptions,
    useRefreshTeamsAndEnsembles,
    useTeams,
    useUpdateTeam,
} from '@/queries/teams';
import { eventIds } from '@/constants/index';
import { buildColorMap } from '@/lib/board';
import { toEnsembleRequest, withStartTime } from '@/lib/ensemble';
import TeamChips, { type Chip } from './team-chips';
import AddEnsembleDrawer, {
    type AddEnsembleInput,
    type TeamOption,
} from '@/features/schedule/add-ensemble-drawer';
import { defaultTeamColor, eventColors } from '@/constants/colors';
import TeamInfoDrawer from './team-info-drawer';
import EventInfoDrawer from './event-info-drawer';
import AddTeamDrawer from './add-team-drawer';
import { pinnedFirst, usePinnedTeamsStore } from './pinned-teams-store';
import type { AddTeamInput, UpdateTeamInput } from './types';

const eventNames1 = ['보소', '기소', '베소', '드소', '키소'];
const eventNames2 = ['메인 회의', '재학생 회의', '회의', '오디션', '합주 불가', '동방 사용 불가'];

const Teams = () => {
    const teams = useTeams();
    // 처음 불러오는 동안은 회색 알약 (V-3 1차)
    const { isPending: teamsPending } = useQuery(teamsQueryOptions);
    const refreshTeamsAndEnsembles = useRefreshTeamsAndEnsembles();
    const { mutateAsync: addTeamAsync } = useAddTeam();
    const { mutateAsync: updateTeamAsync } = useUpdateTeam();
    const { mutateAsync: deleteTeamAsync } = useDeleteTeam();
    const { mutateAsync: addEnsembleAsync } = useAddEnsemble();
    const queryClient = useQueryClient();
    const { setTeamStates } = useTeamSelectionStore();
    const { setOpenedDrawers, openDrawer, closeAllDrawers } = useDrawerStore();
    const pinnedIds = usePinnedTeamsStore((state) => state.ids);

    // 이미 삭제된 팀을 만났을 때: 상태·Drawer 초기화 후 팀·합주 목록을 다시 불러온다
    const handleTeamGone = useCallback(() => {
        setTeamStates();
        closeAllDrawers();
        refreshTeamsAndEnsembles();
    }, [closeAllDrawers, refreshTeamsAndEnsembles, setTeamStates]);

    // 이미 삭제된 팀인지 체크. 팀 정보·PIN Drawer가 사용한다 (합주 잡기는 서버가 확인한다: B-8 B4)
    // 해당 함수를 try -> if(else 없음) 에서 호출: false 리턴시 if문 넘긴채 그대로 try문 종료, 이후 try문 내에서 에러시 catch
    // 이미 삭제됐으면(404) 알리고 Drawer를 모두 닫는다. 확인 요청 자체가 실패하면(서버 오류 등) 알리고 그대로 둔다
    // (V-3 17차, 이전: 둘을 구분하지 않고 알림 없이 Drawer를 모두 닫았다)
    const checkTeamExists = useCallback(
        async (id: string) => {
            try {
                await teamExists(id);
                return true;
            } catch (err) {
                if (isNotFound(err)) {
                    handleTeamGone();
                    toast.error('이미 삭제된 팀이에요.');
                } else {
                    toast.error('확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
                }
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
        openDrawer('addTeam');
    }, [setTeamStates, openDrawer]);

    // 팀 추가 Drawer의 저장 (V-3 10차). 성공하면 Drawer를 닫고 알림 (이전: 완료 화면 Drawer "팀을 만들었어요"),
    // 실패하면 알리고 Drawer(PIN 만들기)에 머문다. due: 팀 자동 삭제 날짜 (백엔드 개편 B-9)
    const handleAddTeam = useCallback(
        async ({ type, name, desc, pin, due }: AddTeamInput) => {
            try {
                await addTeamAsync({
                    type,
                    name,
                    desc,
                    pin,
                    publishDate: dayjs(),
                    due,
                });
                setTeamStates(); // 초기화
                closeAllDrawers();
                toast.success('팀을 만들었어요.');
                return true;
            } catch {
                toast.error('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
                return false;
            }
        },
        [addTeamAsync, closeAllDrawers, setTeamStates],
    );

    // 팀 수정 Drawer의 저장 (V-3 13차, 이전: 옛 Drawer 5단계, 알림 없음). 성공하면 고친 값으로 팀 정보 Drawer로 돌아가며 알림.
    // 이미 삭제됐으면 서버가 404를 준다 → 이미 삭제된 팀 처리 (이전에는 수정 전에 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5)
    const handleUpdateTeam = useCallback(
        async (id: string, { type, name, desc, due }: UpdateTeamInput, pin: string) => {
            try {
                await updateTeamAsync({
                    id,
                    pin,
                    type,
                    name,
                    desc,
                    due,
                });
                setTeamStates(id, type, name, desc); // 팀 정보 Drawer가 고친 값으로
                setOpenedDrawers(['teamInfo']);
                toast.success('팀을 수정했어요.');
                return true;
            } catch (err) {
                if (isNotFound(err)) {
                    handleTeamGone();
                    toast.error('이미 삭제된 팀이에요.');
                } else {
                    toast.error('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
                }
                return false;
            }
        },
        [handleTeamGone, setOpenedDrawers, setTeamStates, updateTeamAsync],
    );

    // 팀 정보 Drawer의 팀 삭제 PIN 단계에서 (V-3 9차: 알림 추가, 합주 삭제와 같은 문구)
    const handleDeleteTeam = useCallback(
        async (id: string, pin: string) => {
            try {
                await deleteTeamAsync({ id, pin });
                toast.success('삭제했어요.');
            } catch (err) {
                // 이미 삭제됐으면(404) 결과는 같다
                if (isNotFound(err)) toast.success('삭제했어요.');
                else toast.error('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
            } finally {
                setTeamStates();
                closeAllDrawers();
            }
        },
        [closeAllDrawers, deleteTeamAsync, setTeamStates],
    );

    // 합주 잡기 Drawer의 저장 (View 개편 V-2 21차). 성공하면 Drawer를 모두 닫고 알림 (이전: 완료 화면 Drawer "락앤롤!")
    const handleAddEnsemble = useCallback(
        async (
            { team, repeat, date, startTime, endTime, repeatEnd }: AddEnsembleInput,
            _target: unknown,
            pin: string,
        ) => {
            try {
                // 팀이 있는지는 서버가 확인한다: 없으면 404 → 아래 catch (백엔드 개편 B-8 B4, 이전: 저장 전에 존재 확인 요청)
                // 저장 직전에 합주 목록을 다시 불러와 4개 겹침을 한 번 더 확인한다 (24차).
                // 다른 사람이 그새 같은 시간에 잡았을 수 있다. 다시 불러온 목록으로 Drawer에도 알림이 뜬다
                const latest = await queryClient.fetchQuery({
                    ...ensemblesQueryOptions,
                    staleTime: 0,
                });
                if (
                    findOverlapLimit(latest, { date, repeat, until: repeatEnd, startTime, endTime })
                ) {
                    toast.error('그사이 이 시간에 합주가 4개 잡혔어요. 다른 시간을 골라 주세요.');
                    return false;
                }
                // 날짜에 시작 시각을 붙여 보낸다 (lib/ensemble의 withStartTime)
                const nextDate = withStartTime(date, startTime);
                await addEnsembleAsync({
                    pin,
                    ...toEnsembleRequest(team.id, repeat, nextDate, startTime, endTime, repeatEnd),
                });
                setTeamStates(); // 초기화
                closeAllDrawers();
                // 알림은 한 문장만 (V-3 15차, 이전: 아래에 합주 요약)
                toast.success(team.isEvent ? '일정을 잡았어요.' : '합주를 잡았어요.');
                return true;
            } catch (err) {
                if (isNotFound(err)) {
                    // 그새 팀이 삭제됐다 (서버가 확인, B4). 이전 사전 확인과 같이 Drawer를 모두 닫고 다시 불러온다
                    handleTeamGone();
                    toast.error(team.isEvent ? '이미 삭제된 일정이에요.' : '이미 삭제된 팀이에요.');
                } else {
                    toast.error('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
                }
                return false;
            }
        },
        [addEnsembleAsync, closeAllDrawers, handleTeamGone, queryClient, setTeamStates],
    );

    // 팀 목록 (View 개편 V-2: 한 줄로 줄이고 "전체"로 펼침). 색은 합주표와 같은 매핑(buildColorMap)
    const colorMap = buildColorMap(teams);
    const teamChips: Chip[] = teams.map((team) => ({
        key: team.id,
        name: team.name,
        color: colorMap[team.id] ?? defaultTeamColor,
        onClick: () => handleClickTeam(team),
        pinned: pinnedIds.includes(team.id),
    }));
    const eventChips: Chip[] = [...eventNames1, ...eventNames2].map((name, idx) => ({
        key: name,
        name,
        color: eventColors[idx] ?? defaultTeamColor,
        onClick: () => handleClickEvent(eventIds[idx]!, name), // eventIds와 같은 순서
        striped: true, // 합주판 블록과 같은 줄무늬 (V-3 1차)
    }));
    // 소모임(보소~키소)과 회의 등(메인 회의~)은 줄을 나눈다 (V-3 1차)
    const eventGroups = [
        eventChips.slice(0, eventNames1.length),
        eventChips.slice(eventNames1.length),
    ];

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
            <TeamChips
                // 고정한 팀을 고정한 순서대로 맨 앞에 (V-3 11차). 색은 위에서 원래 순서로 정했다
                teams={pinnedFirst(teamChips, (chip) => chip.key, pinnedIds)}
                eventGroups={eventGroups}
                onAddTeam={handleClickAddTeam}
                loading={teamsPending}
            />

            {/* DRAWERS */}
            <TeamInfoDrawer checkTeamExists={checkTeamExists} handleDeleteTeam={handleDeleteTeam} />
            <EventInfoDrawer />
            <AddTeamDrawer onSubmit={handleAddTeam} />
            <AddTeamDrawer mode="update" onUpdate={handleUpdateTeam} />
            <AddEnsembleDrawer
                teams={teamOptions}
                events={eventOptions}
                onSubmit={handleAddEnsemble}
            />
        </>
    );
};

export default Teams;
