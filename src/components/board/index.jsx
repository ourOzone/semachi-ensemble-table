import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import Modal from 'react-modal';
import { useFetchContext } from 'context';
import useMessage from 'hooks/useMessage';
import { daysKor, hours, idx2hour, url } from 'constants';
import { media } from 'styles/media';
import { Container } from 'components/common/Container';

const Board = () => {
    const { ensembles, fetchData } = useFetchContext();
    const [message, contextHolder] = useMessage();
    const [info, setInfo] = useState(null);
    const [infoId, setInfoId] = useState('');
    const [modifyId, setModifyId] = useState('');
    const [modifyName, setModifyName] = useState('');
    const [modifyDesc, setModifyDesc] = useState(['', '', '', '', '', '', '']);

    const monday = useMemo(() => {
        const monday = new Date();
        const day = monday.getDay();
        if (day === 0) {
            monday.setDate(monday.getDate() - 6);
        } else {
            monday.setDate(monday.getDate() - day + 1);
        }
    
        return monday;
    }, []);
    
    const week = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            return date.getDate();
        });
    }, [monday]);
    
    const isToday = useCallback((dayIdx) => {
        const today = new Date().getDate();
        const targetDate = new Date(monday);
        targetDate.setDate(monday.getDate() + dayIdx);
        return targetDate.getDate() === today;
    }, [monday]);

    const handleInfoModal = async (id) => {
        try {
            const { data } = await axios.get(`${url}/ensembleinfo?id=${id}`);
            console.log(data)
            setInfo(data);
            setInfoId(id);
            
        } catch {
            message.warning('이미 삭제된 합주예요.');
            fetchData();
        }
    };

    const handleDeleteEnsemble = async (info, id) => {
        if (!window.confirm(`"${info.name}" 팀의\n${`${daysKor[info.day]}요일 ${idx2hour[info.start_time]} ~ ${idx2hour[info.end_time + 1]}`} 합주를 삭제해요.\n진짜 삭제할래요?`)) {
            return;
        }

        await axios.get(`${url}/deleteensemble?id=${id}`);
        fetchData();
        
        setInfo(null);
    };

    const handleModifyTeam = async () => {
        await axios.post(`${url}/teammodify?id=${modifyId}`, {
            name: modifyName,
            desc: modifyDesc
        });

        fetchData();
        setModifyId('');
        setModifyName('');
        setModifyDesc(['', '', '', '', '', '', '']);

    };
    return (
        <Container row>
            {contextHolder}
            <HourColumn>
                {hours.map(hour => <Hour key={hour}>{hour}</Hour>)}
            </HourColumn>
            <Table>
                {ensembles && ensembles.map((day, dayIdx) => (
                    <ColumnWrapper key={dayIdx}>
                        <LabelWrapper>
                            <DateLabel isToday={isToday(dayIdx) ? true : null}>
                                {week[dayIdx]}
                            </DateLabel>
                            <DayLabel isToday={isToday(dayIdx) ? true : null}>
                                {daysKor[dayIdx]}
                            </DayLabel>
                        </LabelWrapper>
                        <Column>
                            {day.map((block, time) => (
                                <Block key={`${dayIdx}_${time}`}>
                                    {block.map((ensemble) => (
                                        <Ensemble
                                            key={`${dayIdx}_${time}_${ensemble.id}`}
                                            teamColorIdx={ensemble.teamColorIdx}
                                            gray={ensemble.isOneTime ? Math.ceil(Math.abs(new Date(ensemble.due) - new Date()) / (1000 * 3600 * 24)) >= 7 : null}
                                            onClick={() => handleInfoModal(ensemble.id)}
                                        >
                                            {block.length < 4 && ensemble.teamName}
                                        </Ensemble>
                                    ))}
                                </Block>
                            ))}
                        </Column>
                    </ColumnWrapper>
                ))}
            </Table>

            <Modal
                isOpen={!!info}
                onRequestClose={() => {setInfo(null)}}
                style={modalStyle}
                contentLabel='Info'
            >
                <ModalTitleContainer>
                    <ModalTitle>합주 정보</ModalTitle>
                    <ModalExitButton onClick={() => setInfo(null)}>✕</ModalExitButton>
                </ModalTitleContainer>
                <ModalFormContainer>
                    <InfoContainer>
                        <ModalRowContainer>
                            <ModalLabel>팀 이름</ModalLabel>
                            <InfoLabel>{info && info.name}</InfoLabel>
                        </ModalRowContainer>
                        <ModalRowContainer>
                            <DescContainer>
                                <DescLeftSection>
                                    <LabelContentPair>
                                        <DescLabel>Vo.</DescLabel>
                                        <DescName>{info && info.desc[0]}</DescName>
                                    </LabelContentPair>
                                    <LabelContentPair>
                                        <DescLabel>Gt.</DescLabel>
                                        <DescName>{info && info.desc[1]}</DescName>
                                    </LabelContentPair>
                                    <LabelContentPair>
                                        <DescLabel>Ba.</DescLabel>
                                        <DescName>{info && info.desc[2]}</DescName>
                                    </LabelContentPair>
                                    <LabelContentPair>
                                        <DescLabel>Dr.</DescLabel>
                                        <DescName>{info && info.desc[3]}</DescName>
                                    </LabelContentPair>
                                    <LabelContentPair>
                                        <DescLabel>Key.</DescLabel>
                                        <DescName>{info && info.desc[4]}</DescName>
                                    </LabelContentPair>
                                    <LabelContentPair>
                                        <DescLabel>Mgr.</DescLabel>
                                        <DescName>{info && info.desc[5]}</DescName>
                                    </LabelContentPair>
                                </DescLeftSection>
                                <DescRightSection>
                                    <ModalLabel>소개/셋리스트</ModalLabel>
                                    <Setlist>{info && info.desc[6]}</Setlist>
                                </DescRightSection>
                            </DescContainer>
                        </ModalRowContainer>
                        <ModalRowContainer>
                            <ModalLabel>팀 타입</ModalLabel>
                            <InfoLabel>{info && info.teamType}</InfoLabel>
                        </ModalRowContainer>
                        <ModalRowContainer>
                            <ModalLabel>합주 시간</ModalLabel>
                            <InfoLabel>{info && `${daysKor[info.day]}요일 ${idx2hour[info.start_time]} ~ ${idx2hour[info.end_time + 1]}`}</InfoLabel>
                        </ModalRowContainer>
                        <ModalRowContainer>
                            <ModalLabel>합주실</ModalLabel>
                            <InfoLabel>{info && info.room}</InfoLabel>
                        </ModalRowContainer>
                        <ModalRowContainer>
                            <ModalLabel>합주 타입</ModalLabel>
                            <InfoLabel>{info && info.type}</InfoLabel>
                        </ModalRowContainer>
                        {info && info.type !== '무기한' && (
                            <ModalRowContainer>
                                <ModalLabel>{info && info.type === '유기한' ? '공연 날짜' : '합주 날짜'}</ModalLabel>
                                <InfoLabel>{info && info.due.split('T')[0]}</InfoLabel>
                            </ModalRowContainer>
                        )}
                    </InfoContainer>
                    {info && (
                        <>
                            <InfoButtonContainer>
                                <Button onClick={() => {
                                    setModifyId(info.id);
                                    setModifyName(info.name);
                                    setModifyDesc(info.desc);
                                    setInfo(null)
                                }}>팀 수정</Button>
                                <Button onClick={() => handleDeleteEnsemble(info, infoId)}>합주 삭제</Button>
                            </InfoButtonContainer>
                        </>
                    )}
                </ModalFormContainer>
            </Modal>
            <Modal
                isOpen={!!modifyId}
                onRequestClose={() => {
                    setModifyId('');
                    setModifyName('');
                    setModifyDesc(['', '', '', '', '', '', '']);
                }}
                style={modalStyle}
                contentLabel='TeamModify'
            >
                <ModalTitleContainer>
                    <ModalTitle>팀 정보 수정</ModalTitle>
                    <ModalExitButton onClick={() => {
                        setModifyId('');
                        setModifyName('');
                        setModifyDesc(['', '', '', '' ,'', '', '']);
                    }}>✕</ModalExitButton>
                </ModalTitleContainer>
                <ModalFormContainer>
                    <ModalLabel>팀 이름</ModalLabel>
                    <ModalInput
                        value={modifyName}
                        onChange={e => {
                            if (e.target.value.length <= 20) {
                                setModifyName(e.target.value);
                            }
                        }}
                        placeholder='팀명 입력해요 (~20 글자)'
                    />
                    
                    <DescContainer>
                        <DescLeftSection>
                            <LabelContentPair>
                                <DescLabel>Vo.</DescLabel>
                                <DescInput
                                    value={modifyDesc[0]}
                                    onChange={e => {
                                        if (e.target.value.length <= 16) {
                                            setModifyDesc(prev => {
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
                                    value={modifyDesc[1]}
                                    onChange={e => {
                                        if (e.target.value.length <= 16) {
                                            setModifyDesc(prev => {
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
                                    value={modifyDesc[2]}
                                    onChange={e => {
                                        if (e.target.value.length <= 16) {
                                            setModifyDesc(prev => {
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
                                    value={modifyDesc[3]}
                                    onChange={e => {
                                        if (e.target.value.length <= 16) {
                                            setModifyDesc(prev => {
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
                                    value={modifyDesc[4]}
                                    onChange={e => {
                                        if (e.target.value.length <= 16) {
                                            setModifyDesc(prev => {
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
                                    value={modifyDesc[5]}
                                    onChange={e => {
                                        if (e.target.value.length <= 16) {
                                            setModifyDesc(prev => {
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
                                value={modifyDesc[6]}
                                onChange={e => {
                                    if (e.target.value.length <= 100) {
                                        setModifyDesc(prev => {
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
                    <SubmitButtonContainer>
                        <SubmitButton disabled={modifyName.length === 0} onClick={handleModifyTeam}>수정하기</SubmitButton>
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

const HourColumn = styled.div`
    display: flex;
    flex-direction: column;
    margin: 4rem 0.5rem 0; // 4rem = LabelWrapper height + margin-bottom + 여유 0.25rem
`;

const Hour = styled.div`
    text-align: center;
    user-select: none;
    height: 5.25rem; // 5.25rem = block 2.5rem * 2 + even margin-bottom 0.25rem
`;

const Table = styled.div`
    display: flex;
    width: 100%;
`;

const ColumnWrapper = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
`;

const LabelWrapper = styled.div`
    display: flex;
    flex-direction: column;
    height: 3.25rem;
    margin-bottom: 0.5rem;
    gap: 0.25rem;
`;

const DateLabel = styled.div`
    text-align: center;
    user-select: none;
    ${({ theme, isToday }) => isToday && `
        color: ${theme.primary};
        font-family: Bold;
    `};
`;

const DayLabel = styled(DateLabel)`
    font-size: 1.75rem;
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
    
    & > *:nth-child(even) {
        margin-bottom: 0.25rem;
    }
`;

const Block = styled.div`
    display: flex;
    background-color: ${({ theme }) => theme.boardBackground};
    height: 2.5rem;
    margin-right: 0.25rem;
`;

const Ensemble = styled.div`
    width: 100%;
    height: 2.5rem;
    background-color: ${({ theme, teamColorIdx, gray }) => gray ? theme.disabledGray : theme.teamColors[teamColorIdx % theme.teamColors.length]};
    color: ${({ theme }) => theme.white};

    /* opacity: ${({ alpha }) => alpha ? 0.3 : 1}; */
    padding: 0.125rem;
    user-select: none;
    cursor: pointer;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    word-break: break-word;
`;

// 이 밑으로 모달

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
    width: 100%;
`;

const InfoContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin-bottom: 32px;

    ${media.large`
        margin-bottom: 8px;
    `}
`;

const ModalRowContainer = styled.div`
    display: flex;
    margin-bottom: 16px;
`;

const ModalLabel = styled.div`
    display: flex;
    font-size: 1.25rem;
    user-select: none;
    min-width: 120px;

    ${media.large`
        min-width: 64px;
    `}
`;

const InfoLabel = styled.div`
    font-family: Bold;
    font-size: 1.25rem;
    white-space: pre-line;
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
    font-size: 1.25rem;
    color: ${({ theme }) => theme.white};
    user-select: none;
    cursor: pointer;
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
        margin: 8px 16px 16px;
        padding: 8px 16px;
    `}
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

    ${media.large`
        margin: 8px 16px 16px;
    `}
`;

const SubmitButtonContainer = styled.div`
    display: flex;
    justify-content: center;
    width: 100%;
    margin: 32px 0 16px;

    ${media.large`
        margin: 8px 0 0;
    `}
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

const DescContainer = styled.div`
    display: flex;
    width: 100%;
    padding-left: 16px;
    ${media.large`
        padding-left: 4px;
    `}
`;

const DescLeftSection = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    padding-right: 2px;
`;

const DescRightSection = styled.div`
    flex: 1;
    padding-right: 24px;
    ${media.large`
        padding-right: 16px;
    `}
`;

const LabelContentPair = styled.div`
    display: flex;
    margin-bottom: 8px;
`;

const DescLabel = styled.div`
    display: flex;
    font-size: 1.25rem;
    user-select: none;
    min-width: 80px;

    ${media.large`
        min-width: 40px;
    `}
`;

const DescName = styled.div`
    font-family: Bold;
    font-size: 1.25rem;
    white-space: pre-line;
    word-break: keep-all;

    ${media.small`
        width: 52px;
    `}
`;

const Setlist = styled.div`
    margin: 8px 0 0 8px;
    /* white-space: pre-wrap;
    overflow-y: auto; */

    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 8; /* 원하는 줄 수를 설정 */
    -webkit-box-orient: vertical;
    white-space: pre-wrap;
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
        width: 60px;
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

export default Board;