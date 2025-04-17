import React, { useState } from 'react';
import styled from 'styled-components';
import { Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import Modal from 'react-modal';
import { Radio } from '@mui/material';
import { useDataContext, useDrawerContext } from 'context';
import { idx2hour, url } from 'constants';
import { media } from 'styles/media';
import { Container } from 'components/common/Container';
import TeamAddDrawer1 from './TeamAddDrawer1';
import TeamAddDrawer2 from './TeamAddDrawer2';
import TeamAddDrawer3 from './TeamAddDrawer3';
import TeamAddDrawer4 from './TeamAddDrawer4';
import TeamAddDrawer5 from './TeamAddDrawer5';
import TeamAddDrawer6 from './TeamAddDrawer6';

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

    const { teams, fetchData } = useDataContext();
    const { openDrawer } = useDrawerContext();
    const [teamAddModal, setTeamAddModal] = useState(false);
    const [teamAddName, setTeamAddName] = useState('');
    const [teamAddDesc, setTeamAddDesc] = useState(['', '', '', '', '', '', '']);
    const [teamAddType, setTeamAddType] = useState('신입-정기/연말공연');
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
    const [type, setType] = useState('');
    const [name, setName] = useState('');
    const [desc, setDesc] = useState(['', '', '', '', '', '', '']); // [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 소개/셋리스트]
    const [pin, setPin] = useState('');

    const handleAddTeam = async () => {
        if (!teamAddName) {
            return;
        }
        setTeamAddModal(false);
        
        await axios.post(`${url}/teams`, {
            name: teamAddName,
            desc: teamAddDesc,
            type: teamAddType,
            publishDate: new Date()
        });

        fetchData();

        setTeamAddName('');
        setTeamAddDesc(['', '', '', '', '', '', '']);
        setTeamAddType('신입-정기/연말공연');
    };

    const handleDeleteTeam = async (e, team) => {
        e.stopPropagation();

        try {
            await axios.get(`${url}/teamexist?id=${team.id}`);
            
            if (!window.confirm(`"${team.name}" 팀을 삭제해요.\n진짜 삭제할래요?`)) {
                return;
            }
            await axios.get(`${url}/deleteteam?id=${team.id}`);
        }
        catch {
            alert('이미 삭제된 팀이에요.');
        }

        fetchData();
    }

    const handleClickTeam = async (team) => {
        try {
            await axios.get(`${url}/teamexist?id=${team.id}`);
            setEnsembleTeamId(team.id);
            setEnsembleTeamName(team.name);
        }
        catch {
            alert('이미 삭제된 팀이에요.');
            fetchData();
        }
    };

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
                {/* <TeamAddButton onClick={() => setTeamAddModal(true)}> */}
                <TeamAddButton onClick={() => openDrawer('teamAdd1')}>
                    <PlusOutlined />
                    팀 추가
                </TeamAddButton>
                <TeamAddDrawer1 setType={setType} />
                <TeamAddDrawer2 name={name} setName={setName} />
                <TeamAddDrawer3 desc={desc} setDesc={setDesc} />
                <TeamAddDrawer4 desc={desc} setDesc={setDesc} />
                <TeamAddDrawer5
                    pin={pin}
                    setPin={setPin}
                    type={type}
                    setType={setType}
                    name={name}
                    setName={setName}
                    desc={desc} />
                <TeamAddDrawer6 type={type} name={name} desc={desc} />
            </TeamsContainer>
            <StyledDivider />
            <TeamsContainer>
                <TeamButton isEvent idx={1}>보소</TeamButton>
                <TeamButton isEvent idx={2}>기소</TeamButton>
                <TeamButton isEvent idx={3}>베소</TeamButton>
                <TeamButton isEvent idx={4}>드소</TeamButton>
                <TeamButton isEvent idx={5}>키소</TeamButton>
            </TeamsContainer>
            <TeamsContainer>
                <TeamButton isEvent idx={0}>메인 회의</TeamButton>
                <TeamButton isEvent idx={0}>재학생 회의</TeamButton>
                <TeamButton isEvent idx={0}>그냥 회의</TeamButton>
            </TeamsContainer>
            



            <Modal
                isOpen={!!teamAddModal}
                onRequestClose={() => setTeamAddModal(false)}
                style={modalStyle}
                contentLabel='TeamAdd'
            >
                <ModalTitleContainer>
                    <ModalTitle>팀 추가</ModalTitle>
                    <ModalExitButton onClick={() => setTeamAddModal(false)}>✕</ModalExitButton>
                </ModalTitleContainer>
                <ModalFormContainer style={{ paddingTop: '24px' }}>
                    <ModalLabel>팀 이름</ModalLabel>
                    <ModalInput
                        value={teamAddName}
                        onChange={e => {
                            if (e.target.value.length <= 20) {
                                setTeamAddName(e.target.value);
                            }
                        }}
                        placeholder='팀명 입력해요 (~20 글자)'
                    />
                    <DescContainer>
                        <DescLeftSection>
                            <LabelContentPair>
                                <DescLabel>Vo.</DescLabel>
                                <DescInput
                                    value={teamAddDesc[0]}
                                    onChange={e => {
                                        if (e.target.value.length <= 16) {
                                            setTeamAddDesc(prev => {
                                                const newDesc = [...prev];
                                                newDesc[0] = e.target.value;
                                                return newDesc;
                                            });
                                        }
                                    }}
                                    placeholder='보컬 이름'
                                />
                            </LabelContentPair>
                            <LabelContentPair>
                                <DescLabel>Gt.</DescLabel>
                                <DescInput
                                    value={teamAddDesc[1]}
                                    onChange={e => {
                                        if (e.target.value.length <= 16) {
                                            setTeamAddDesc(prev => {
                                                const newDesc = [...prev];
                                                newDesc[1] = e.target.value;
                                                return newDesc;
                                            });
                                        }
                                    }}
                                    placeholder='기타(들) 이름'
                                />
                            </LabelContentPair>
                            <LabelContentPair>
                                <DescLabel>Ba.</DescLabel>
                                <DescInput
                                    value={teamAddDesc[2]}
                                    onChange={e => {
                                        if (e.target.value.length <= 16) {
                                            setTeamAddDesc(prev => {
                                                const newDesc = [...prev];
                                                newDesc[2] = e.target.value;
                                                return newDesc;
                                            });
                                        }
                                    }}
                                    placeholder='베이스 이름'
                                />
                            </LabelContentPair>
                            <LabelContentPair>
                                <DescLabel>Dr.</DescLabel>
                                <DescInput
                                    value={teamAddDesc[3]}
                                    onChange={e => {
                                        if (e.target.value.length <= 16) {
                                            setTeamAddDesc(prev => {
                                                const newDesc = [...prev];
                                                newDesc[3] = e.target.value;
                                                return newDesc;
                                            });
                                        }
                                    }}
                                    placeholder='드럼 이름'
                                />
                            </LabelContentPair>
                            <LabelContentPair>
                                <DescLabel>Key.</DescLabel>
                                <DescInput
                                    value={teamAddDesc[4]}
                                    onChange={e => {
                                        if (e.target.value.length <= 16) {
                                            setTeamAddDesc(prev => {
                                                const newDesc = [...prev];
                                                newDesc[4] = e.target.value;
                                                return newDesc;
                                            });
                                        }
                                    }}
                                    placeholder='키보드(들) 이름'
                                />
                            </LabelContentPair>
                            <LabelContentPair>
                                <DescLabel>Mgr.</DescLabel>
                                <DescInput
                                    value={teamAddDesc[5]}
                                    onChange={e => {
                                        if (e.target.value.length <= 16) {
                                            setTeamAddDesc(prev => {
                                                const newDesc = [...prev];
                                                newDesc[5] = e.target.value;
                                                return newDesc;
                                            });
                                        }
                                    }}
                                    placeholder='매니저(들) 이름'
                                />
                            </LabelContentPair>
                        </DescLeftSection>
                        <DescRightSection>
                            <DescLabel>소개/셋리스트</DescLabel>
                            <SetlistTextarea
                                value={teamAddDesc[6]}
                                onChange={e => {
                                    if (e.target.value.length <= 100) {
                                        setTeamAddDesc(prev => {
                                            const newDesc = [...prev];
                                            newDesc[6] = e.target.value;
                                            return newDesc;
                                        });
                                    }
                                }}
                                placeholder='팀 소개랑 선곡이랑 이것 저것 써요'
                            />
                        </DescRightSection>
                    </DescContainer>
                    <ModalLabel>팀 타입</ModalLabel>
                    <RadioContainer>
                        <RadioLabel
                            onClick={() => setTeamAddType('신입-정기/연말공연')}
                        >
                            <Radio checked={teamAddType === '신입-정기/연말공연'} />
                            신입-정기/연말공연
                        </RadioLabel>
                        <RadioLabel
                            onClick={() => setTeamAddType('메인/재학생-정기/연말공연')}
                        >
                            <Radio checked={teamAddType === '메인/재학생-정기/연말공연'} />
                            메인/재학생-정기/연말공연
                        </RadioLabel>
                        <RadioLabel
                            onClick={() => setTeamAddType('신입-외부공연')}
                        >
                            <Radio checked={teamAddType === '신입-외부공연'} />
                            신입-외부공연
                        </RadioLabel>
                        <RadioLabel
                            onClick={() => setTeamAddType('메인/재학생-외부공연')}
                        >
                            <Radio checked={teamAddType === '메인/재학생-외부공연'} />
                            메인/재학생-외부공연
                        </RadioLabel>
                    </RadioContainer>
                    <SubmitButtonContainer>
                        <SubmitButton disabled={teamAddName.length === 0} onClick={handleAddTeam}>추가하기</SubmitButton>
                    </SubmitButtonContainer>
                </ModalFormContainer>
            </Modal>
            <Modal
                isOpen={!!ensembleTeamId}
                onRequestClose={() => setEnsembleTeamId('')}
                style={modalStyle}
                contentLabel='EnsembleAdd'
            >
                <ModalTitleContainer>
                    <ModalTitle>합주 추가</ModalTitle>
                    <ModalExitButton onClick={() => setEnsembleTeamId('')}>✕</ModalExitButton>
                </ModalTitleContainer>
                <ModalFormContainer>
                    <ModalRowContainer>
                        <ModalLabel>팀 이름</ModalLabel>
                        <Bold>{ensembleTeamName}</Bold>
                    </ModalRowContainer>
                    <ModalRowContainer  style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <ModalLabel>합주 타입</ModalLabel>
                        <RadioContainer>
                            <RadioLabel
                                onClick={() => setEnsembleType('유기한')}
                            >
                                <Radio checked={ensembleType === '유기한'} />
                                유기한 - 지정한 공연 날짜 이후 자동으로 삭제할 거예요
                            </RadioLabel>
                            <RadioLabel
                                onClick={() => setEnsembleType('무기한')}
                            >
                                <Radio checked={ensembleType === '무기한'} />
                                무기한 - 알아서 수동으로 삭제해야 해요
                            </RadioLabel>
                            <RadioLabel
                                onClick={() => setEnsembleType('일회성')}
                            >
                                <Radio checked={ensembleType === '일회성'} />
                                일회성 - 지정한 날에 하고 나면 사라져요
                            </RadioLabel>
                        </RadioContainer>
                    </ModalRowContainer>
                    {ensembleType !== '일회성' && (
                        <ModalRowContainer>
                            <ModalLabel>합주 요일</ModalLabel>
                            <Select
                                value={ensembleDay}
                                onChange={(e) => setEnsembleDay(Number(e.target.value))}
                            >
                                {['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'].map((day, idx) => (
                                    <option key={day} value={idx}>{day}</option>
                                ))}
                            </Select>
                            <ModalText highlight>&nbsp;&nbsp;{getNextDay(ensembleDay)}</ModalText>
                        </ModalRowContainer>
                    )}
                    {ensembleType !== '무기한' && (
                        <ModalRowContainer>
                            {ensembleType === '유기한' && (<ModalLabel>공연 날짜</ModalLabel>)}
                            {ensembleType === '일회성' && (<ModalLabel>합주 날짜</ModalLabel>)}
                            <Select
                                value={ensembleDueYear}
                                onChange={(e) => setEnsembleDueYear(Number(e.target.value))}
                            >
                                {Array.from({ length: 2 }, (_, i) => i + today.getFullYear()).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </Select>
                            <ModalText>년</ModalText>
                            <Select
                                value={ensembleDueMonth}
                                onChange={(e) => setEnsembleDueMonth(Number(e.target.value))}
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <option key={month} value={month}>{month}</option>
                                ))}
                            </Select>
                            <ModalText>월</ModalText>
                            <Select
                                value={ensembleDueDate}
                                onChange={(e) => setEnsembleDueDate(Number(e.target.value))}
                            >
                                {Array.from({ length: getMonthDate(ensembleDueYear, ensembleDueMonth) }, (_, i) => i + 1).map(date => (
                                    <option key={date} value={date}>{date}</option>
                                ))}
                            </Select>
                            <ModalText>일</ModalText>
                            <ModalText highlight>&nbsp;&nbsp;({getDay(ensembleDueYear, ensembleDueMonth, ensembleDueDate)})</ModalText>
                        </ModalRowContainer>
                    )}
                    {ensembleType === '유기한' && (<ModalText style={{color: 'red', marginTop: '2px'}}>(합주 날짜가 아니에요!!!)</ModalText>)}
                    <ModalRowContainer> 
                    <ModalLabel>합주 시간</ModalLabel>
                        <Select
                            value={ensembleStartTime}
                            onChange={(e) => setEnsembleStartTime(Number(e.target.value))}
                        >
                            {[...Array(idx2hour.length).keys()].map(time => (
                                <option key={time} value={time}>{idx2hour[time]}</option>
                            ))}
                        </Select>
                        <ModalText>~</ModalText>
                        <Select
                            value={ensembleEndTime}
                            onChange={(e) => setEnsembleEndTime(Number(e.target.value))}
                        >
                            {Array.from({ length: idx2hour.length - ensembleStartTime - 1 }, (_, i) => i + ensembleStartTime).map(time => (
                                <option key={time} value={time}>{idx2hour[time + 1]}</option>
                            ))}
                        </Select>
                    </ModalRowContainer>
                    <ModalRowContainer style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <ModalLabel>합주실</ModalLabel>
                        <RadioContainer>
                            <RadioLabel
                                onClick={() => setEnsembleRoom('동방')}
                            >
                                <Radio checked={ensembleRoom === '동방'} />
                                동방
                            </RadioLabel>
                            <RadioLabel
                                onClick={() => setEnsembleRoom('외부')}
                            >
                                <Radio checked={ensembleRoom === '외부'} />
                                외부 합주실
                            </RadioLabel>
                        </RadioContainer>
                    </ModalRowContainer>
                    <SubmitButtonContainer>
                        <SubmitButton onClick={handleAddEnsemble}>추가하기</SubmitButton>
                    </SubmitButtonContainer>
                </ModalFormContainer>
            </Modal>
        </Container>
    )
};

const modalStyle = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '90%',
        maxWidth: '720px',
        padding: '24px',
        border: 'none',
        borderRadius: '40px',
        backgroundColor: '#f5f8ff',
        boxShadow: '0px 0px 16px rgba(0, 0, 0, 0.1)'
    }
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
    background-color: ${(props) => props.isEvent ? 
        props.theme.eventColors[props.idx] : 
        props.theme.teamColors[props.idx % props.theme.teamColors.length]
    };
    padding: 0.75rem 1.5rem;
    border-radius: 100rem;
    font-size: 1.25rem;
    color: ${({ theme }) => theme.white};
    cursor: pointer;
    user-select: none;
    border: 0.0625rem solid ${({ theme }) => theme.border};
    box-shadow: 0 0.25rem 0.125rem ${(props) => props.isEvent ? 
        props.theme.eventColors[props.idx] : 
        props.theme.teamColors[props.idx % props.theme.teamColors.length]
    }33;

    opacity: 1;
    transition: opacity 0.3s ease;

    &:hover {
        opacity: 0.6;
    }
`;

const TeamAddButton = styled(TeamButton)`
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

// 이 밑으로 전부 모달

const ModalTitleContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 12px 24px;
    width: 100%;

    ${media.large`
        padding: 0 4px 12px;
    `}
`;

const ModalTitle = styled.div`
    flex: 1;
    margin: 0;
    font-family: Bold;
    font-size: 1.5rem;
    color: ${({ theme }) => theme.title};
    user-select: none;
    text-align: center;
`;

const ModalExitButton = styled.button`
    background: none;
    border: none;
    user-select: none;
    font-size: 1.5rem;
    cursor: pointer;
`;

const ModalFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    background-color: ${({ theme }) => theme.white};
    border-radius: 40px;
    padding: 24px;
    padding-top: 8px;
    width: 100%;
    ${media.large`
        padding: 24px 24px 8px;
    `}
`;

const ModalLabel = styled.div`
    font-size: 1.25rem;
    user-select: none;
    min-width: 84px;
    @media (max-width: 360px) {
    min-width: 64px;
    }
    @media (max-width: 360px) {
    min-width: 52px;
    }
`;

const ModalInput = styled.input`
    resize: none;
    border: none;
    overflow: hidden;
    margin: 16px 24px 32px;
    padding: 16px;
    background-color: ${({ theme }) => theme.background};
    border-radius: 16px;

    &:focus {
        outline: 2px solid ${({ theme }) => theme.primary};
    }

    ${media.large`
        margin: 8px 0 16px;
        padding: 8px 16px;
    `}
`;

const RadioContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin: 16px 16px 0 16px;

    ${media.large`
        margin: 8px 8px 0 0;
    `}
`;

const RadioLabel = styled.div`
    display: flex;
    align-items: center;
    user-select: none;
    cursor: pointer;
`;

const SubmitButtonContainer = styled.div`
    display: flex;
    justify-content: center;
    width: 100%;
    margin: 16px 0;
`;

const SubmitButton = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 160px;
    background-color: ${({ theme }) => theme.primary};
    padding: 8px 16px;
    border-radius: 100px;
    font-size: 1.25rem;
    color: ${({ theme }) => theme.white};
    user-select: none;
    cursor: pointer;

    ${({ disabled }) => disabled && `
        background-color: #cccccc;
        cursor: default;
    `}
`;

const ModalRowContainer = styled.div`
    display: flex;
    align-items: center;
    margin-top: 16px;
`;

const Bold = styled.div`
    font-family: Bold;
    font-size: 1.25rem;
    margin-left: 16px;
    user-select: none;

    ${media.large`
        margin-left: 0;
    `}
`;

const Select = styled.select`
    margin: 0 8px;
    padding: 4px 8px;
    border: none;
    background-color: ${({ theme }) => theme.background};
    border-radius: 8px;
    cursor: pointer;
    appearance: none;
    text-align: center;
    user-select: none;

    &:focus {
        outline: 2px solid ${({ theme }) => theme.primary};
    }
    ${media.large`
        margin: 0 2px;
        padding: 0 4px;
    `}
`;

const ModalText = styled.div`
    user-select: none;
    ${props => props.highlight && `
        color: ${props.theme.primary};
    `}
`;

const DescContainer = styled.div`
    display: flex;
    width: 100%;
    padding-left: 16px;
    margin-bottom: 16px;
    ${media.large`
        padding-left: 4px;
        margin-bottom: 0;
    `}
`;

const DescLeftSection = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    padding-right: 8px;
`;

const DescRightSection = styled.div`
    flex: 1;
    padding-right: 24px;

    ${media.large`
        padding-right: 0;
    `}
`;

const LabelContentPair = styled.div`
    display: flex;
    margin-bottom: 8px;
`;

const DescLabel = styled.div`
    display: flex;
    align-items: center;
    font-size: 1.25rem;
    user-select: none;
    min-width: 60px;

    ${media.large`
        min-width: 40px;
    `}
    ${media.large`
        min-width: 32px;
    `}
`;

const DescInput = styled.input`
    resize: none;
    border: none;
    overflow: hidden;
    padding: 8px 12px;
    background-color: ${({ theme }) => theme.background};
    border-radius: 16px;
    width: 160px;

    &:focus {
        outline: 2px solid ${({ theme }) => theme.primary};
    }

    ${media.large`
        width: 80px;
    `}

    ${media.small`
        width: 80px;
    `}
`;

const SetlistTextarea = styled.textarea`
    resize: none;
    border: none;
    width: 100%;
    height: 204px;
    margin-top: 16px;
    padding: 16px;
    background-color: ${({ theme }) => theme.background};
    border-radius: 16px;
    
    &:focus {
        outline: 2px solid ${({ theme }) => theme.primary};
    }

    ${media.large`
        padding: 8px 16px;
        margin: 8px 0 16px;
        height: 188px;
    `}
`;

export default Teams;