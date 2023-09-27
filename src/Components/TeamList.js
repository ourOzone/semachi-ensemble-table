import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import Modal from 'react-modal';
import { Radio } from '@mui/material';
import { useCustomContext } from '../Context';

const getPublishDate = () => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
  
    return `${year}-${month}-${day}`;
  }

const TeamList = () => {
    const { teams, init } = useCustomContext();
    const [teamAddModal, setTeamAddModal] = useState(false);
    const [teamAddName, setTeamAddName] = useState('');
    const [teamAddDesc, setTeamAddDesc] = useState('');
    const [teamAddType, setTeamAddType] = useState('신입-정기/연말공연');
    
    const handleTeamAdd = async () => {
        if (!teamAddName) {
            return;
        }

        setTeamAddModal(false);
        
        const { data } = await axios.post('https://us-central1-semachi.cloudfunctions.net/teamadd', {
            name: teamAddName,
            desc: teamAddDesc,
            type: teamAddType,
            publishDate: getPublishDate()
        });

        init();

        setTeamAddName('');
        setTeamAddDesc('');
        setTeamAddType('신입-정기/연말공연');
    };

    const handleTeamDelete = async (team) => {
        if (!window.confirm('진짜 삭제할래요?')) {
            return;
        }
        
        const { data } = await axios.get(`https://us-central1-semachi.cloudfunctions.net/teamdelete?id=${team.id}`)
        
        init();
    }

    return (
        <Container>
            <TeamListLabelContainer>
                <TeamListTitle>
                    팀 목록
                </TeamListTitle>
                <TeamListDesc>
                    합주 일정을 추가하려면 팀을 눌러요
                </TeamListDesc>
            </TeamListLabelContainer>
            <TeamListContainer>
                <TeamAddButton onClick={() => setTeamAddModal(true)}>+</TeamAddButton>
                {teams && teams.map((team, idx) => (
                    <TeamContainer key={idx} idx={idx}>
                        <Team>{team.name}</Team>
                        <TeamDeleteButton onClick={() => handleTeamDelete(team)}>✕</TeamDeleteButton>
                    </TeamContainer>
                ))}
            </TeamListContainer>
            <Modal
                isOpen={teamAddModal}
                onRequestClose={() => setTeamAddModal(false)}
                style={modalStyle}
                contentLabel='TeamAdd'
            >
                <ModalTitle>팀 추가</ModalTitle>
                <ModalFormContainer>
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
                    <ModalLabel>팀 소개</ModalLabel>
                    <ModalTextArea
                        value={teamAddDesc}
                        onChange={e => setTeamAddDesc(e.target.value)}
                        placeholder='팀원 목록이랑 선곡이랑 이것 저것 써요'
                    />
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
                        <SubmitButton disabled={teamAddName.length === 0} onClick={handleTeamAdd}>추가하기</SubmitButton>
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
`;

const TeamListLabelContainer = styled.div`
    display: flex;
    align-items: flex-end;
    margin-left: 24px;
`;

const TeamListTitle = styled.div`
    font-size: 200%;
    margin-right: 8px;
    user-select: none;
`;

const TeamListDesc = styled.div`
    color: ${({ theme }) => theme.gray};
    user-select: none;
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

const ModalLabel = styled.div`
    font-size: 125%;
    user-select: none;
    margin-bottom: 16px;
`;

const ModalInput = styled.input`
    resize: none;
    border: none;
    overflow: hidden;
    margin: 0 24px 32px;
    padding: 16px;
    background-color: ${({ theme }) => theme.background};
    border-radius: 16px;

    &:focus {
        outline: 2px solid ${({ theme }) => theme.primary};
    }
`;

const ModalTextArea = styled.textarea`
    resize: none;
    border: none;
    height: 200px;
    margin: 0 24px 32px;
    padding: 16px;
    background-color: ${({ theme }) => theme.background};
    border-radius: 16px;
    
    &:focus {
        outline: 2px solid ${({ theme }) => theme.primary};
    }
`;

const RadioContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin-left: 16px;
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
    margin: 32px 0 16px;
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

export default TeamList;