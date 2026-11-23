import { useCallback } from 'react';
import styled from 'styled-components';
import { Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { Team, TimeSlot } from '@/types';
import { isNotFound } from '@/api';
import { teamExists } from '@/api/team';
import { useTeamContext, useEnsembleContext, useDrawerContext } from '@/context';
import { useAddEnsemble } from '@/queries/ensembles';
import {
    useAddTeam,
    useDeleteTeam,
    useRefreshTeamsAndEnsembles,
    useTeams,
    useUpdateTeam,
} from '@/queries/teams';
import { eventIds } from '@/constants';
import { toEnsembleRequest } from '@/lib/ensemble';
import { Container } from '@/components/common/Container';
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
import AddEnsembleDrawer1 from './addEnsembleDrawers/AddEnsembleDrawer1';
import AddEnsembleDrawer2 from './addEnsembleDrawers/AddEnsembleDrawer2';
import AddEnsembleDrawer3 from './addEnsembleDrawers/AddEnsembleDrawer3';
import AddEnsembleDrawer4 from './addEnsembleDrawers/AddEnsembleDrawer4';

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
    const { setEnsembleStates } = useEnsembleContext();
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

    const handleAddEnsemble = useCallback(
        async (
            id: string,
            name: string,
            repeat: boolean,
            nextDate: Dayjs | null,
            startTime: TimeSlot | null,
            endTime: TimeSlot | null,
        ) => {
            try {
                // 서버가 팀 존재를 검사하지 않으므로(ISSUES B4) 사전 확인을 유지한다
                if (await checkTeamExists(id)) {
                    // 선택을 마친 뒤에만 호출되어 null이 아님 (null이면 nextDate.day()에서 TypeError → catch, 기존 동작)
                    await addEnsembleAsync({
                        teamName: name,
                        ...toEnsembleRequest(id, repeat, nextDate!, startTime!, endTime!),
                    });
                    setTeamStates(); // 초기화
                    setEnsembleStates();
                    return true;
                }
                return false; // 팀이 이미 삭제됨 (checkTeamExists가 Drawer를 닫음)
            } catch {
                // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
                return false;
            }
        },
        [addEnsembleAsync, checkTeamExists, setEnsembleStates, setTeamStates],
    );

    return (
        <Container>
            <TeamsContainer>
                {teams &&
                    teams.map((team, idx) => (
                        <TeamButton key={idx} idx={idx} onClick={() => handleClickTeam(team)}>
                            {team.name}
                        </TeamButton>
                    ))}
                <AddTeamButton onClick={handleClickAddTeam}>
                    <PlusOutlined />팀 추가
                </AddTeamButton>
            </TeamsContainer>
            <StyledDivider />
            <TeamsContainer>
                {eventNames1.map((name, idx) => (
                    <TeamButton
                        key={name}
                        isEvent
                        idx={idx}
                        // eventNames1·2와 eventIds는 같은 순서·길이다 (constants)
                        onClick={() => handleClickEvent(eventIds[idx]!, name)}
                    >
                        {name}
                    </TeamButton>
                ))}
            </TeamsContainer>
            <TeamsContainer>
                {eventNames2.map((name, idx) => (
                    <TeamButton
                        key={name}
                        isEvent
                        idx={idx + eventNames1.length}
                        onClick={() => handleClickEvent(eventIds[idx + eventNames1.length]!, name)}
                    >
                        {name}
                    </TeamButton>
                ))}
            </TeamsContainer>

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
            <AddEnsembleDrawer1 drawerId="addEnsemble1" />
            <AddEnsembleDrawer2 drawerId="addEnsemble2" />
            <AddEnsembleDrawer3 drawerId="addEnsemble3" handleAddEnsemble={handleAddEnsemble} />
            <AddEnsembleDrawer4 drawerId="addEnsemble4" />
        </Container>
    );
};

const TeamsContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
`;

const StyledDivider = styled(Divider)`
    margin: 1.5rem 0 1rem;
`;

interface TeamButtonProps {
    /** 소모임·회의 버튼이면 true (eventColors 사용) */
    isEvent?: boolean;
    /** 색상 인덱스. AddTeamButton은 넘기지 않지만 배경·그림자를 자체 값으로 덮어써 영향 없음 */
    idx?: number;
}

const TeamButton = styled.div<TeamButtonProps>`
    display: flex;
    align-items: center;
    margin: 0.5rem 0 0 0.5rem;
    background-color: ${({ theme, isEvent, idx }) =>
        isEvent ? theme.eventColors[idx!] : theme.teamColors[idx! % theme.teamColors.length]};
    padding: 0.75rem 1.5rem;
    border-radius: 100rem;
    font-size: 1.25rem;
    color: ${({ theme }) => theme.white};
    cursor: pointer;
    user-select: none;
    border: 0.0625rem solid ${({ theme }) => theme.border};
    box-shadow: 0 0.25rem 0.125rem
        ${({ theme, isEvent, idx }) =>
            isEvent ? theme.eventColors[idx!] : theme.teamColors[idx! % theme.teamColors.length]}33;

    opacity: 1;
    transition: opacity 0.3s ease;

    &:hover {
        opacity: 0.6;
    }
`;

const AddTeamButton = styled(TeamButton)`
    background-color: ${({ theme }) => theme.white};
    color: ${({ theme }) => theme.black};
    border: 0.0625rem dashed ${({ theme }) => theme.primary};
    box-shadow: 0 0.25rem 0.125rem ${({ theme }) => theme.primary}22;
    padding-left: 1.25rem;

    & svg {
        font-size: 1.25rem;
        margin-right: 0.5rem;
    }
`;

export default Teams;
