import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { addTeam, updateTeam, deleteTeam, isTeamExist } from 'api/teams';
import { addEnsemble } from 'api/ensembles';
import useMessage from 'hooks/useMessage';
import { useFetchContext, useDrawerContext } from 'context';
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
    const { setOpenedDrawers, openDrawer, closeAllDrawers } = useDrawerContext();
    const [message, contextHolder] = useMessage();

    // 각 state는 TeamInfo와 AddTeam 모두에 사용 (두 액션은 독립 보장)
    const [id, setId] = useState(''); // AddTeam에는 사용 X
    const [type, setType] = useState('');
    const [name, setName] = useState('');
    const [desc, setDesc] = useState(['', '', '', '', '', '', '']); // [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 소개/셋리스트]
    const [pin, setPin] = useState('');

    const [repeat, setRepeat] = useState(false);
    const [nextDate, setNextDate] = useState(null); // dayjs (2025-05-27T00:00:00.000Z"), POST시 YYYY-MM-DD의 string으로 변환
    const [startTime, setStartTime] = useState(null); // idx값 (0 ~ 29)
    const [endTime, setEndTime] = useState(null); // idx값 (0 ~ 29)

    const setAllState = useCallback((
        id = '',
        type = '',
        name = '',
        desc = ['', '', '', '', '', '', ''],
        pin = '',
        repeat = false,
        nextDate = null,
        startTime = null,
        endTime = null,
    ) => {
        setId(id);
        setType(type);
        setName(name);
        setDesc(desc);
        setPin(pin);
        setRepeat(repeat);
        setNextDate(nextDate);
        setStartTime(startTime);
        setEndTime(endTime);
    }, []);

    const handleClickTeam = useCallback(async ({ id, type, name, desc, pin }) => {
        try {
            await isTeamExist(id); // 누른 팀이 이미 삭제됐으면 에러
            setAllState(id, type, name, desc, pin);
            openDrawer('teamInfo');
        } catch {
            message.error('이미 삭제된 팀이에요.');
            fetchData();
        }
    }, [message, fetchData, openDrawer, setAllState]);

    // id값은 순서대로 event0~ 으로 지정
    const handleClickEvent = useCallback((id, name) => {
        setAllState(id, '', name);
        openDrawer('eventInfo');
    }, [openDrawer, setAllState]);

    const handleClickAddTeam = useCallback(() => {
        openDrawer('addTeam1');
    }, [openDrawer]);

    const handleAddTeam = useCallback(async (type, name, desc, pin) => {
        try {
            await addTeam({ type, name, desc, pin, publishDate: new Date() });
            fetchData();
            setAllState(); // 초기화

        } catch (err) {
            message.error('팀 추가에 실패했어요. 인터넷 상태가 괜찮은데 이게 떴다면 초비상이니 빠르게 개발자나 회장에게 연락해주세요.');
        }
    }, [message, fetchData, setAllState]);

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
            setAllState();
            closeAllDrawers();
        }

        fetchData();
    }, [closeAllDrawers, fetchData, message, setAllState]);

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
                due: repeat ? '2099-12-31' : formattednextDate,
            });
            fetchData();
            setAllState(); // 초기화
        } catch (err) {
            message.error('합주 추가에 실패했어요. 인터넷 상태가 괜찮은데 이게 떴다면 초비상이니 빠르게 개발자나 회장에게 연락해주세요.');
        }
    }, [message, fetchData, setAllState]);

    const handleSkip = useCallback((id) => {
        // TODO skip api
        message.success('알겠어요.');
    }, [message]);

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
            <TeamInfoDrawer type={type} name={name} desc={desc} setAllState={setAllState} />
            <EventInfoDrawer name={name} setAllState={setAllState} />
            <AddTeamDrawer1 setType={setType} />
            <AddTeamDrawer2 name={name} setName={setName} />
            <AddTeamDrawer3 desc={desc} setDesc={setDesc} />
            <AddTeamDrawer4 desc={desc} setDesc={setDesc} />
            <AddTeamDrawer5
                type={type}
                name={name}
                desc={desc}
                pin={pin}
                setPin={setPin}
                handleAddTeam={handleAddTeam}
            />
            <AddTeamDrawer6 />
            <UpdateTeamDrawer1 id={id} pin={pin} setPin={setPin} />
            <UpdateTeamDrawer2 setType={setType} />
            <UpdateTeamDrawer3 name={name} setName={setName} />
            <UpdateTeamDrawer4 desc={desc} setDesc={setDesc} />
            <UpdateTeamDrawer5
                id={id}
                type={type}
                name={name}
                desc={desc}
                setDesc={setDesc}
                handleUpdateTeam={handleUpdateTeam}
            />
            <DeleteTeamDrawer id={id} pin={pin} setPin={setPin} handleDeleteTeam={handleDeleteTeam} />
            <AddEnsembleDrawer1 setRepeat={setRepeat}/>
            <AddEnsembleDrawer2 repeat={repeat} setNextDate={setNextDate} />
            <AddEnsembleDrawer3
                id={id}
                name={name}
                repeat={repeat}
                nextDate={nextDate}
                startTime={startTime}
                setStartTime={setStartTime}
                endTime={endTime}
                setEndTime={setEndTime}
                handleAddEnsemble={handleAddEnsemble}
            />
            <AddEnsembleDrawer4 />
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