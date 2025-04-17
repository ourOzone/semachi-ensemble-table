import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Divider, Alert, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import { addTeam, deleteTeam, isTeamExist } from 'api/teams';
import { Radio } from '@mui/material';
import { useFetchContext, useDrawerContext } from 'context';
import { idx2hour, url } from 'constants';
import { media } from 'styles/media';
import { Container } from 'components/common/Container';
import TeamInfoDrawer from './TeamInfoDrawer';
import AddTeamDrawer1 from './AddTeamDrawer1';
import AddTeamDrawer2 from './AddTeamDrawer2';
import AddTeamDrawer3 from './AddTeamDrawer3';
import AddTeamDrawer4 from './AddTeamDrawer4';
import AddTeamDrawer5 from './AddTeamDrawer5';
import AddTeamDrawer6 from './AddTeamDrawer6';

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
    const { openDrawer, closeAllDrawers } = useDrawerContext();
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
    }, [url, fetchData, setEnsembleTeamId, setEnsembleTeamName]);

    const handleClickAddTeam = useCallback(() => {
        openDrawer('addTeam1');
    }, []);

    const handleAddTeam = useCallback(async (type, name, desc, pin) => {
        try {
            await addTeam({ type, name, desc, pin, publishDate: new Date() });
            fetchData();
            setAllState(); // 초기화

        } catch (err) {
            alert('팀 추가에 실패했어요. 인터넷 상태가 괜찮은데 이게 떴다면 초비상이니 빠르게 개발자나 회장에게 연락해주세요.'); // TODO 교체
        }
    }, []);

    const handleDeleteTeam = async (id) => {
        // e.stopPropagation();

        try {
            await isTeamExist(id);
            message.error('zzz')
            // if (!window.confirm(`진짜 삭제해요?`)) {
            //     return;
            // }
            // await deleteTeam(id);
            // alert('삭제했어요');
            // closeAllDrawers();
        }
        catch {
            alert('이미 삭제된 팀이에요.');
        }

        fetchData();
    }

    const handleAddEnsemble = async () => {
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
                <TeamButton isEvent idx={0}>보소</TeamButton>
                <TeamButton isEvent idx={1}>기소</TeamButton>
                <TeamButton isEvent idx={2}>베소</TeamButton>
                <TeamButton isEvent idx={3}>드소</TeamButton>
                <TeamButton isEvent idx={4}>키소</TeamButton>
            </TeamsContainer>
            <TeamsContainer>
                <TeamButton isEvent idx={5}>메인 회의</TeamButton>
                <TeamButton isEvent idx={5}>재학생 회의</TeamButton>
                <TeamButton isEvent idx={5}>그냥 회의</TeamButton>
            </TeamsContainer>

            <TeamInfoDrawer
                id={id}
                type={type}
                name={name}
                desc={desc}
                pin={pin}
                handleDeleteTeam={handleDeleteTeam}
                setAllState={setAllState}
            />
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
            <AddTeamDrawer6 type={type} name={name} desc={desc} />
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