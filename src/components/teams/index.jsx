import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { addTeam, updateTeam, deleteTeam, isTeamExist } from 'api/team';
import { addEnsemble } from 'api/ensemble';
import useMessage from 'hooks/useMessage';
import { useFetchContext, useTeamContext, useEnsembleContext, useDrawerContext } from 'context';
import { eventIds } from 'constants';
import { Container } from 'components/common/Container';
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
const eventNames2 = ['메인 회의', '재학생 회의', '회의', '오디션', '합주 불가'];

const Teams = () => {
    const { teams, fetchData } = useFetchContext();
    const { setTeamStates } = useTeamContext();
    const { setEnsembleStates } = useEnsembleContext();
    const { setOpenedDrawers, openDrawer, closeAllDrawers } = useDrawerContext();
    const [message, contextHolder] = useMessage();

    const handleClickTeam = useCallback(async ({ id, type, name, desc }) => {
        try {
            await isTeamExist(id); // 누른 팀이 이미 삭제됐으면 에러
            setTeamStates(id, type, name, desc);
            openDrawer('teamInfo');
        } catch {
            message.warning('이미 삭제된 팀이에요.');
            fetchData();
        }
    }, [message, fetchData, openDrawer, setTeamStates]);

    // id값은 순서대로 event0~ 으로 지정
    const handleClickEvent = useCallback((id, name) => {
        setTeamStates(id, '', name);
        openDrawer('eventInfo');
    }, [openDrawer, setTeamStates]);

    const handleClickAddTeam = useCallback(() => {
        openDrawer('addTeam1');
    }, [openDrawer]);

    const handleAddTeam = useCallback(async (type, name, desc, pin) => {
        try {
            await addTeam({ type, name, desc, pin, publishDate: new Date() });
            fetchData();
            setTeamStates(); // 초기화

        } catch (err) {
            message.error('팀 추가에 실패했어요. 인터넷 상태가 괜찮은데 이게 떴다면 초비상이니 빠르게 개발자나 회장에게 연락해주세요.');
        }
    }, [message, fetchData, setTeamStates]);

    const handleUpdateTeam = useCallback(async (id, type, name, desc) => {
        try {
            await updateTeam(id, { type, name, desc });
            fetchData();
            message.success('잘 바꿔놨어요.');
            setOpenedDrawers(['teamInfo']);
        } catch (err) {
            message.error('팀 수정에 실패했어요. 인터넷 상태가 괜찮은데 이게 떴다면 초비상이니 빠르게 개발자나 회장에게 연락해주세요.');
        }
    }, [message, fetchData, setOpenedDrawers]);

    const handleDeleteTeam = useCallback(async (id) => {
        try {
            await isTeamExist(id);
            // TODO PIN 입력 로직 추가
            await deleteTeam(id);
            message.success('삭제했어요.');
        }
        catch {
            message.warning('이미 삭제된 팀이에요.')
        }
        finally {
            setTeamStates();
            closeAllDrawers();
        }

        fetchData();
    }, [closeAllDrawers, fetchData, message, setTeamStates]);

    const handleAddEnsemble = useCallback(async (id, name, repeat, nextDate, startTime, endTime) => {
        const formattednextDate = nextDate.format('YYYY-MM-DD');

        try {
            await addEnsemble({
                teamId: id,
                teamName: name,
                day: (nextDate.day() + 6) % 7, // 월요일 0 ~ 일요일 6으로 변환
                nextDate: formattednextDate,
                startTime,
                endTime,
                type: repeat ? '매주 반복' : '이번 주만',
                due: repeat ? '2099-12-31' : formattednextDate, // TODO 삭제
            });
            fetchData();
            setTeamStates(); // 초기화
            setEnsembleStates();
        } catch (err) {
            message.error('합주 추가에 실패했어요. 인터넷 상태가 괜찮은데 이게 떴다면 초비상이니 빠르게 개발자나 회장에게 연락해주세요.');
        }
    }, [message, fetchData, setTeamStates, setEnsembleStates]);

    return (
        <Container>
            {contextHolder}
            <TeamsContainer>
                {teams && teams.map((team, idx) => (
                    <TeamButton
                        key={idx}
                        idx={idx}
                        onClick={() => handleClickTeam(team)}
                    >
                        {team.name}
                    </TeamButton>
                ))}
                <AddTeamButton onClick={handleClickAddTeam}>
                    <PlusOutlined />
                    팀 추가
                </AddTeamButton>
            </TeamsContainer>
            <StyledDivider />
            <TeamsContainer>
                {eventNames1.map((name, idx) => (
                    <TeamButton key={name} isEvent idx={idx} onClick={() => handleClickEvent(eventIds[idx], name)}>{name}</TeamButton>
                ))}
            </TeamsContainer>
            <TeamsContainer>
                {eventNames2.map((name, idx) => (
                    <TeamButton key={name} isEvent idx={idx + eventNames1.length} onClick={() => handleClickEvent(eventIds[idx + eventNames1.length], name)}>{name}</TeamButton>
                ))}
            </TeamsContainer>

            {/* DRAWERS */}
            <TeamInfoDrawer drawerId='teamInfo' />
            <EventInfoDrawer drawerId='eventInfo' />
            <AddTeamDrawer1 drawerId='addTeam1' />
            <AddTeamDrawer2 drawerId='addTeam2' />
            <AddTeamDrawer3 drawerId='addTeam3' />
            <AddTeamDrawer4 drawerId='addTeam4' />
            <AddTeamDrawer5 drawerId='addTeam5' handleAddTeam={handleAddTeam} />
            <AddTeamDrawer6 drawerId='addTeam6' />
            <UpdateTeamDrawer1 drawerId='updateTeam1' />
            <UpdateTeamDrawer2 drawerId='updateTeam2' />
            <UpdateTeamDrawer3 drawerId='updateTeam3' />
            <UpdateTeamDrawer4 drawerId='updateTeam4' />
            <UpdateTeamDrawer5 drawerId='updateTeam5' handleUpdateTeam={handleUpdateTeam} />
            <DeleteTeamDrawer drawerId='deleteTeam' handleDeleteTeam={handleDeleteTeam} />
            <AddEnsembleDrawer1 drawerId='addEnsemble1' />
            <AddEnsembleDrawer2 drawerId='addEnsemble2' />
            <AddEnsembleDrawer3 drawerId='addEnsemble3' handleAddEnsemble={handleAddEnsemble} />
            <AddEnsembleDrawer4 drawerId='addEnsemble4' />
        </Container>
    )
};

const TeamsContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
`;

const StyledDivider = styled(Divider)`
    margin: 1.5rem 0 1rem;
`;

const TeamButton = styled.div`
    display: flex;
    align-items: center;
    margin: 0.5rem 0 0 0.5rem;
    background-color: ${({ theme, isEvent, idx }) => isEvent ? 
        theme.eventColors[idx] : 
        theme.teamColors[idx % theme.teamColors.length]
    };
    padding: 0.75rem 1.5rem;
    border-radius: 100rem;
    font-size: 1.25rem;
    color: ${({ theme }) => theme.white};
    cursor: pointer;
    user-select: none;
    border: 0.0625rem solid ${({ theme }) => theme.border};
    box-shadow: 0 0.25rem 0.125rem ${({ theme, isEvent, idx }) => isEvent ? 
        theme.eventColors[idx] : 
        theme.teamColors[idx % theme.teamColors.length]
    }33;

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