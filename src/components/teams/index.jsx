import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import { addTeam, updateTeam, deleteTeam, isTeamExist } from 'api/teams';
import useMessage from 'hooks/useMessage';
import { useFetchContext, useDrawerContext } from 'context';
import { url } from 'constants';
import { Container } from 'components/common/Container';
import TeamInfoDrawer from './TeamInfoDrawer';
import EventInfoDrawer from './EventInfoDrawer';
import AddTeamDrawer1 from './AddTeamDrawer1';
import AddTeamDrawer2 from './AddTeamDrawer2';
import AddTeamDrawer3 from './AddTeamDrawer3';
import AddTeamDrawer4 from './AddTeamDrawer4';
import AddTeamDrawer5 from './AddTeamDrawer5';
import AddTeamDrawer6 from './AddTeamDrawer6';
import UpdateTeamDrawer1 from './UpdateTeamDrawer1';
import UpdateTeamDrawer2 from './UpdateTeamDrawer2';
import UpdateTeamDrawer3 from './UpdateTeamDrawer3';
import UpdateTeamDrawer4 from './UpdateTeamDrawer4';
import UpdateTeamDrawer5 from './UpdateTeamDrawer5';
import DeleteTeamDrawer from './DeleteTeamDrawer';

const eventNames1 = ['보소', '기소', '베소', '드소', '키소'];
const eventNames2 = ['메인 회의', '재학생 회의', '그냥 회의'];

const getMonthDate = (year, month) => {
    const date = new Date(year, month, 1);
    date.setDate(date.getDate() - 1);

    return date.getDate();
}

const getDay = (year, month, date) => {
    const daysKor = ['일', '월', '화', '수', '목', '금', '토'];
    const tempDate = new Date(year, month - 1, date);
    return daysKor[tempDate.getDay()] + '요일';
}

function getNextDay(dayOfWeek) {
    const daysOfWeekMap = {
        0: 1,
        1: 2,
        2: 3,
        3: 4,
        4: 5,
        5: 6,
        6: 0
    };
  
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const targetDayOfWeek = daysOfWeekMap[dayOfWeek];
  
    let daysUntilNext = (targetDayOfWeek - todayDayOfWeek + 7) % 7;
  
    const nextDate = new Date();
    nextDate.setDate(today.getDate() + daysUntilNext);
  
    const month = nextDate.getMonth() + 1;
    const date = nextDate.getDate();
  
    return `(${month}월 ${date}일~)`;
}

const Teams = () => {
    const today = new Date();

    const [ensembleTeamId, setEnsembleTeamId] = useState('');
    const [ensembleTeamName, setEnsembleTeamName] = useState('');
    const [ensembleDay, setEnsembleDay] = useState(0);
    const [ensembleStartTime, setEnsembleStartTime] = useState(18);
    const [ensembleEndTime, setEnsembleEndTime] = useState(21);
    const [ensembleRoom, setEnsembleRoom] = useState('동방');
    const [ensembleType, setEnsembleType] = useState('유기한');
    const [ensembleDueYear, setEnsembleDueYear] = useState(today.getFullYear());
    const [ensembleDueMonth, setEnsembleDueMonth] = useState(today.getMonth() + 1);
    const [ensembleDueDate, setEnsembleDueDate] = useState(today.getDate());

    // new
    const { teams, fetchData } = useFetchContext();
    const { setOpenedDrawers, openDrawer, closeAllDrawers } = useDrawerContext();
    const [message, contextHolder] = useMessage();
    // 각 state는 TeamInfo와 AddTeam 모두에 사용 (두 액션은 독립 보장)
    const [id, setId] = useState(''); // AddTeam에는 사용 X
    const [type, setType] = useState('');
    const [name, setName] = useState('');
    const [desc, setDesc] = useState(['', '', '', '', '', '', '']); // [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 소개/셋리스트]
    const [pin, setPin] = useState('');

    const setAllState = useCallback((
        id = '',
        type = '',
        name = '',
        desc = ['', '', '', '', '', '', ''],
        pin = ''
    ) => {
        setId(id);
        setType(type);
        setName(name);
        setDesc(desc);
        setPin(pin);
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

    const handleClickEvent = useCallback((name) => {
        setName(name);
        openDrawer('eventInfo');
    }, [openDrawer]);

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

    const handleAddEnsemble = async () => { // TODO 작성 완료 이후 useCallback 적용
        let due = '';
        let day = 0;

        if (ensembleType === '무기한') {
            due = '2099-12-31';
        } else {
            due = `${ensembleDueYear}-${String(ensembleDueMonth).padStart(2, 0)}-${String(ensembleDueDate).padStart(2, 0)}`;

        }
        if (ensembleType === '일회성') {
            const date = new Date(ensembleDueYear, ensembleDueMonth - 1, ensembleDueDate);

            if (date.getDay() === 0) {
                day = 6;
            } else {
                day = date.getDay() - 1;
            }
        } else {
            day = ensembleDay;
        }

        await axios.post(`${url}/ensembles`, {
            teamId: ensembleTeamId,
            teamName: ensembleTeamName,
            day: day,
            startTime: ensembleStartTime,
            endTime: ensembleEndTime,
            type: ensembleType,
            room: ensembleRoom,
            due: due
        });

        setEnsembleTeamId('');
        setEnsembleTeamName('');
        setEnsembleDay(0);
        setEnsembleStartTime(18);
        setEnsembleEndTime(21);
        setEnsembleRoom('동방');
        setEnsembleType('유기한');
        setEnsembleDueYear(today.getFullYear());
        setEnsembleDueMonth(today.getMonth() + 1);
        setEnsembleDueDate(today.getDate());

        fetchData();
    }

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
                    <TeamButton key={name} isEvent idx={idx} onClick={() => handleClickEvent(name)}>{name}</TeamButton>
                ))}
            </TeamsContainer>
            <TeamsContainer>
                {eventNames2.map((name) => (
                    <TeamButton key={name} isEvent idx={5} onClick={() => handleClickEvent(name)}>{name}</TeamButton>
                ))}
            </TeamsContainer>

            {/* DRAWERS */}
            <TeamInfoDrawer
                id={id}
                type={type}
                name={name}
                desc={desc}
                pin={pin}
                setAllState={setAllState}
            />
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