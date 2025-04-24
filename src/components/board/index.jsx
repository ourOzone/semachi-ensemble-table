import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import dayjs from "dayjs";
import Modal from 'react-modal';
import { useFetchContext } from 'context';
import useMessage from 'hooks/useMessage';
import { days, hours, idx2hour, url } from 'constants';
import { media } from 'styles/media';
import { Container } from 'components/common/Container';

// 월요일 0 ~ 일요일 6 기준에서, 오늘의 idx값
const todayIdx = dayjs().day() === 0 ? 6 : dayjs().day() - 1;

// 이번주 날짜(일) 7개
const week = Array.from({ length: 7 }, (_, i) =>
    dayjs().day(1).add(i, 'day').date()
);

const Board = () => {
    const { ensembles, fetchData } = useFetchContext();
    const [message, contextHolder] = useMessage();
    const [info, setInfo] = useState(null);
    const [infoId, setInfoId] = useState('');
    const [modifyId, setModifyId] = useState('');
    const [modifyName, setModifyName] = useState('');
    const [modifyDesc, setModifyDesc] = useState(['', '', '', '', '', '', '']);

    const handleEnsembleClick = async (id) => {
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
        if (!window.confirm(`"${info.name}" 팀의\n${`${days[info.day]}요일 ${idx2hour[info.start_time]} ~ ${idx2hour[info.end_time + 1]}`} 합주를 삭제해요.\n진짜 삭제할래요?`)) {
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
                {ensembles?.map((day, idx) => (
                    <ColumnWrapper key={idx}>
                        <LabelWrapper isToday={idx === todayIdx}>
                            <DateLabel>
                                {week[idx]}
                            </DateLabel>
                            <DayLabel>
                                {days[idx]}
                            </DayLabel>
                        </LabelWrapper>
                        <Column>
                            {day.map((block, time) => (
                                <Block key={`${idx}_${time}`}>
                                    {block.map((ensemble) => (
                                        <Ensemble
                                            key={`${idx}_${time}_${ensemble.id}`}
                                            teamColor={ensemble.teamColor}
                                            // TODO nextDate 사용으로 로직 변경
                                            gray={ensemble.isOneTime ? Math.ceil(Math.abs(new Date(ensemble.due) - new Date()) / (1000 * 3600 * 24)) >= 7 : null}
                                            onClick={() => handleEnsembleClick(ensemble.id)}
                                        >
                                            {/* 이게 무슨 의미인가 */}
                                            {block.length < 4 && ensemble.teamName}
                                        </Ensemble>
                                    ))}
                                </Block>
                            ))}
                        </Column>
                    </ColumnWrapper>
                ))}
            </Table>
        </Container>
    )
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

    & > * {
        ${({ theme, isToday }) => isToday && `
            color: ${theme.primary};
            font-family: Bold;
        `};
    }
`;

const DateLabel = styled.div`
    text-align: center;
    user-select: none;
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
    background-color: ${({ theme, teamColor, gray }) => gray ? theme.disabledGray : teamColor};
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

export default Board;