import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import Modal from 'react-modal';
import { Radio } from '@mui/material';
import { useCustomContext } from '../Context';
import { idx2hour } from '../global';

const getMonthDate = (year, month) => {
    const date = new Date(year, month, 1);
    date.setDate(date.getDate() - 1);

    return date.getDate();
}

const TeamList = () => {
    const today = new Date();

    const { teams, getEnsembles, isLoading, setIsLoading, init } = useCustomContext();
    const [teamAddModal, setTeamAddModal] = useState(false);
    const [teamAddName, setTeamAddName] = useState('');
    const [teamAddDesc, setTeamAddDesc] = useState('');
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

    const handleTeamAdd = async () => {
        if (!teamAddName) {
            return;
        }

        setTeamAddModal(false);
        
        const { data } = await axios.post('https://us-central1-semachi.cloudfunctions.net/teamadd', {
            name: teamAddName,
            desc: teamAddDesc,
            type: teamAddType,
            publishDate: new Date()
        });

        init();

        setTeamAddName('');
        setTeamAddDesc('');
        setTeamAddType('신입-정기/연말공연');
    };

    const handleTeamDelete = async (e, team) => {
        e.stopPropagation();

        if (!window.confirm('진짜 삭제할래요?')) {
            return;
        }
        
        const { data } = await axios.get(`https://us-central1-semachi.cloudfunctions.net/teamdelete?id=${team.id}`)
        
        init();
    }

    const handleEnsembleAdd = async () => {
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

        const { data } = await axios.post('https://us-central1-semachi.cloudfunctions.net/ensembleadd', {
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

        getEnsembles(teams);
    }

    return (
        <div style={{ border: '1px solid black', padding: '8px'}}>
            <div>
                <h2 style={{fontSize: '200%'}}>
                    팀 목록
                </h2>
                <div style={{marginBottom: '8px'}}>
                    합주 일정을 추가하려면 팀을 눌러요
                </div>
            </div>
            <div style={{display: 'flex'}}>
                <button>+</button>
                {teams && teams.map((team, idx) => (
                    <div style={{display: 'flex', marginLeft: '8px', border: '1px solid black'}}
                        key={idx}
                        idx={idx}
                        onClick={() => {
                            setEnsembleTeamId(team.id);
                            setEnsembleTeamName(team.name);
                        }}
                    >
                        <div>{team.name}</div>
                        <button onClick={(e) => handleTeamDelete(e, team)}>✕</button>
                    </div>
                ))}
            </div>
        </div>
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
    flex-direction: column;
    background-color: ${({ theme }) => theme.white};
    border-radius: 40px;
    padding: 32px 16px 16px;
    width: 100%;
    max-width: 1080px;
    
    @media (max-width: 560px) {
        padding: 24px 8px 8px;
    }
`;

const TeamListLabelContainer = styled.div`
    display: flex;
    align-items: flex-end;
    margin-left: 24px;

    @media (max-width: 380px) {
        flex-direction: column;
        align-items: flex-start;
    }
`;

const TeamListTitle = styled.div`
    font-size: 200%;
    margin-right: 8px;
    user-select: none;
`;

const TeamListDesc = styled.div`
    color: ${({ theme }) => theme.gray};
    user-select: none;

    @media (max-width: 560px) {
        margin-left: 2px;
    }
`;

const TeamListContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    margin: 16px;
`;

const TeamAddButton = styled.div`
    display: flex;
    align-items: center;
    margin: 8px 0 0 8px;
    min-height: 41px; // 반응형
    background-color: ${({ theme }) => theme.primary};
    border-radius: 100px;
    font-size: 175%;
    padding: 0 20px;
    color: ${({ theme }) => theme.white};
    user-select: none;
    cursor: pointer;
    
    @media (max-width: 560px) {
        min-height: 0px;
    }
`;

const TeamContainer = styled.div`
    display: flex;
    align-items: center;
    margin: 8px 0 0 8px;
    background-color: ${(props) => props.theme.teamColors[props.idx % 10]};
    padding: 8px 16px;
    border-radius: 100px;
    cursor: pointer;
`;

const Team = styled.div`
    font-size: 125%;
    margin-right: 12px;
    color: ${({ theme }) => theme.white};
    user-select: none;
`;

const TeamDeleteButton = styled.div`
    padding-bottom: 4px;
    color: ${({ theme }) => theme.white};
    user-select: none;

    @media (max-width: 560px) {
            padding-bottom: 2px;
        }
`;

const ModalTitle = styled.div`
    font-family: Bold;
    font-size: 150%;
    color: ${({ theme }) => theme.title};
    user-select: none;
    text-align: center;
    width: 100%;
    padding-left: 28px;
`;

const ModalTitleContainer = styled.div`
    display: flex;
    justify-content: flex-end;
    width: 100%;
    margin-bottom: 20px;

    @media (max-width: 560px) {
        margin-bottom: 12px;
    }
`;

const ModalEscapeButton = styled.div`
    margin-right: 8px;
    font-size: 150%;
    user-select: none;
    cursor: pointer;
`;

const ModalFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    background-color: ${({ theme }) => theme.white};
    border-radius: 40px;
    padding: 24px;
    width: 100%;
    @media (max-width: 560px) {
        padding: 24px 24px 8px;
    }
`;

const ModalLabel = styled.div`
    font-size: 125%;
    user-select: none;
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

    @media (max-width: 560px) {
        margin: 8px 16px 16px;
    }
`;

const ModalTextArea = styled.textarea`
    resize: none;
    border: none;
    height: 200px;
    margin: 16px 24px 32px;
    padding: 16px;
    background-color: ${({ theme }) => theme.background};
    border-radius: 16px;
    
    &:focus {
        outline: 2px solid ${({ theme }) => theme.primary};
    }

    @media (max-width: 560px) {
        margin: 8px 16px 16px;
        height: 120px;
    }
`;

const RadioContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin: 16px 16px 0 16px;

    @media (max-width: 560px) {
        margin: 8px 8px 0 8px;
    }
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
    font-size: 125%;
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
    margin-bottom: 16px;
`;

const Bold = styled.div`
    font-family: Bold;
    font-size: 125%;
    margin-left: 16px;
    user-select: none;
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
    @media (max-width: 560px) {
        margin: 0 2px;
    }
`;

const ModalText = styled.div`
    user-select: none;
`;

export default TeamList;