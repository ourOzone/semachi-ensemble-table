import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import Modal from 'react-modal';
import { useCustomContext } from '../Context';

const daysKor = ['월', '화', '수', '목', '금', '토', '일'];
const hours = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];
const idx2hour = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '24:00'];

const getMonday = () => {
    const monday = new Date();
    const day = monday.getDay();
    if (day === 0) {
        monday.setDate(monday.getDate() - 6);
    } else {
        monday.setDate(monday.getDate() - day + 1);
    }

    return monday;
}

const getWeek = () => {
    const date = getMonday();

    const week = [];
    for (let i = 0; i < 7; i++) {
        week.push(date.getDate());
        date.setDate(date.getDate() + 1);
    }
    
    return week;
}

const isToday = (dayIdx) => {
    const date = new Date().getDate();
    const monday = getMonday();
    monday.setDate(monday.getDate() + dayIdx);

    return monday.getDate() === date;
}

const Board = () => {
    const { ensembles } = useCustomContext();
    const [info, setInfo] = useState(null);
    const [week, setWeek] = useState(getWeek());

    const handleInfoModal = async (id) => {
        const { data } = await axios.get(`https://us-central1-semachi.cloudfunctions.net/ensembleinfo?id=${id}`);
        setInfo(data);
    };

    return (
        <Container>
            <HourColumn>
                {hours.map(hour => <Hour key={hour}>{hour}</Hour>)}
            </HourColumn>
            <DayColumnContainer>
                {ensembles && ensembles.map((day, dayIdx) => (
                    <DayColumn key={dayIdx}>
                        <DateTitle istoday={isToday(dayIdx)}>
                            {week[dayIdx]}
                        </DateTitle>
                        <DayTitle istoday={isToday(dayIdx)}>
                            {daysKor[dayIdx]}
                        </DayTitle>
                        <BlockContainer>
                            {day.map((block, time) => (
                                <Block key={`${dayIdx}_${time}`}>
                                    {block.map((ensemble) => (
                                        <Ensemble
                                            key={`${dayIdx}_${time}_${ensemble.id}`}
                                            teamcoloridx={ensemble.teamcoloridx}
                                            onClick={() => handleInfoModal(ensemble.id)}
                                        >
                                            {block.length < 4 && ensemble.teamName}
                                        </Ensemble>
                                    ))}
                                </Block>
                            ))}
                        </BlockContainer>
                    </DayColumn>
                ))}
            </DayColumnContainer>
            <Modal
                isOpen={info}
                onRequestClose={() => {
                    setInfo(null);
                }}
                style={modalStyle}
                contentLabel='Info'
            >
                <ModalTitle>합주 정보</ModalTitle>
                <ModalFormContainer>
                    <InfoContainer>
                        <InfoInnerContainer>
                            <ModalLabel>팀 이름</ModalLabel>
                            <ModalLabel>팀 소개</ModalLabel>
                            <ModalLabel>팀 타입</ModalLabel>
                            <ModalLabel>합주 시간</ModalLabel>
                            <ModalLabel>합주실</ModalLabel>
                            <ModalLabel>합주 타입</ModalLabel>
                            <ModalLabel>합주 종료일</ModalLabel>
                        </InfoInnerContainer>
                        <InfoInnerContainer>
                            <InfoLabel>{info && info.name}</InfoLabel>
                            <InfoLabel>{info && info.desc}</InfoLabel>
                            <InfoLabel>{info && info.type}팀타입으로수정!!!</InfoLabel>
                            <InfoLabel>{info && `${daysKor[info.day]}요일 (${week[info.day]}일) ${idx2hour[info.startTime]}-${idx2hour[info.endTime + 1]}`}</InfoLabel>
                            <InfoLabel>{info && info.room}</InfoLabel>
                            <InfoLabel>{info && info.type}</InfoLabel>
                            <InfoLabel>{info && info.due}</InfoLabel>
                        </InfoInnerContainer>
                    </InfoContainer>
                    <InfoButtonContainer>
                        <Button>팀 정보 수정</Button>
                        <Button>합주 삭제</Button>
                    </InfoButtonContainer>
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
        backgroundColor: '#ecf5fd',
        boxShadow: '0px 0px 16px rgba(0, 0, 0, 0.1)'
    }
};

const Container = styled.div`
    display: flex;
    background-color: #fdfdfd;
    border-radius: 40px;
    padding: 32px 16px 32px 16px;
    width: 100%;
    max-width: 1080px;
`;

const HourColumn = styled.div`
    display: flex;
    flex-direction: column;
    margin: 2px 8px 0 0;
`;

const Hour = styled.div`
    text-align: center;
    user-select: none;
    margin-top: 62px;
`;

const DayColumnContainer = styled.div`
    display: flex;
    width: 100%;
`;

const DayColumn = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
`;

const DateTitle = styled.div`
    text-align: center;
    margin-bottom: 4px;
    user-select: none;
    ${({ istoday }) => istoday && `
        color: #2e77e5;
        font-family: Bold;
    `};
`;

const DayTitle = styled.div`
    text-align: center;
    font-size: 175%;
    margin-bottom: 8px;
    user-select: none;
    ${({ istoday }) => istoday && `
        color: #2e77e5;
        font-family: Bold;
    `};
`;

const BlockContainer = styled.div`
    display: flex;
    flex-direction: column;
    & > *:nth-child(odd) {
        margin: 2px 2px 0;
    }
    & > *:nth-child(even) {
        margin: 0 2px 2px;
    }
`;

const Block = styled.div`
    display: flex;
    background-color: #ecf5fd;
    height: 38px;
`;

const Ensemble = styled.div`
    flex: 1;
    height: 38px;
    background-color: ${(props) => props.theme.teamColors[props.teamcoloridx]};
    color: ${({ theme }) => theme.white};
    padding: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
    cursor: pointer;
`;

const ModalTitle = styled.div`
    font-family: Bold;
    font-size: 150%;
    color: ${({ theme }) => theme.title};
    user-select: none;
    text-align: center;
    margin-bottom: 24px;
`;

const ModalFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    background-color: ${({ theme }) => theme.white};
    border-radius: 40px;
    padding: 24px;
    width: 100%;
`;

const InfoContainer = styled.div`
    display: flex;
    margin-bottom: 32px;
    
    & > * + * {
        margin-left: 16px;
    }
`;

const InfoInnerContainer = styled.div`
    display: flex;
    flex-direction: column;

    & > * + * {
        margin-top: 16px;
    }
`;

const ModalLabel = styled.div`
    display: flex;
    font-size: 125%;
    user-select: none;
`;

const InfoLabel = styled.div`
    font-family: Bold;
    font-size: 125%;
`;

const InfoButtonContainer = styled.div`
    display: flex;
    justify-content: center;

    & > * + * {
        margin-left: 32px;
    }
`;

const Button = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 160px;
    background-color: ${({ theme }) => theme.primary};
    padding: 8px 16px;
    border-radius: 100px;
    font-size: 125%;
    color: ${({ theme }) => theme.white};
    user-select: none;
    cursor: pointer;
`;

export default Board;