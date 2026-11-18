import { useState, useCallback } from 'react';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { useTeamContext, useEnsembleContext, useDrawerContext } from '@/context';
import { idx2hour } from '@/constants';
import { Button } from 'antd';
import dayjs from 'dayjs';
import OkButton from '@/components/common/OkButton';

const AddEnsembleDrawer3 = ({ drawerId, handleAddEnsemble }) => {
    const { id, name } = useTeamContext();
    const { repeat, nextDate, startTime, setStartTime, endTime, setEndTime } = useEnsembleContext();
    const { openDrawer } = useDrawerContext();

    const [startTimeStr, setStartTimeStr] = useState('');
    const [endTimeStr, setEndTimeStr] = useState('');

    const onClose = useCallback(() => {
        setStartTime(null);
        setEndTime(null);
        setStartTimeStr('');
        setEndTimeStr('');
    }, [setStartTime, setEndTime, setStartTimeStr, setEndTimeStr]);

    const handleClick = useCallback(
        (id, name, repeat, nextDate, startTime, endTime) => {
            handleAddEnsemble(id, name, repeat, nextDate, startTime, endTime);
            openDrawer('addEnsemble4');
        },
        [handleAddEnsemble, openDrawer],
    );

    const handleClickTime = useCallback(
        (idx, startTime, endTime, startTimeStr) => {
            // startTime과 endTime의 값은 모두 block의 index (0 ~ 29)
            // startIdx 설정
            if (startTime === null || endTime !== null) {
                setStartTime(idx);
                setStartTimeStr(idx2hour[idx]);
                setEndTime(null);
                setEndTimeStr('');

                // endIdx 설정
            } else {
                // 같은 거 고른 경우 취소
                if (idx === startTime) {
                    setStartTime(null);
                    setStartTimeStr('');
                }
                // 더 앞 시간을 고른 경우
                else if (idx < startTime) {
                    setEndTime(startTime - 1);
                    setEndTimeStr(startTimeStr);
                    setStartTime(idx);
                    setStartTimeStr(idx2hour[idx]);
                    // 일반적인 경우
                } else {
                    setEndTime(idx - 1);
                    setEndTimeStr(idx2hour[idx]);
                }
                console.log(idx - 1, idx2hour[idx]);
            }
        },
        [setStartTime, setEndTime],
    );

    const isSelected = (idx) => {
        if (startTime === null) return false;
        if (endTime === null) return idx === startTime;
        return idx >= startTime && idx <= endTime + 1;
    };

    return (
        <Drawer drawerId={drawerId} onClose={onClose}>
            <Title>시간은요 🕗</Title>
            <Header show={endTime !== null}>
                <Time>
                    {`${dayjs(nextDate).format('YYYY년 M월 D일 (ddd)')} ${repeat ? '부터' : '에만'}`}
                    <br />
                    {`${repeat ? '매주' : ''} ${startTimeStr}~${endTimeStr}에 🔥`}
                </Time>
                <OkButton
                    disabled={endTime === null}
                    label="이대로 할래요"
                    onClick={() => handleClick(id, name, repeat, nextDate, startTime, endTime)}
                />
            </Header>
            <TimeGridWrapper>
                {idx2hour.map((time, idx) => (
                    <TimeButton
                        key={time}
                        selected={isSelected(idx)}
                        onClick={() => handleClickTime(idx, startTime, endTime, startTimeStr)}
                    >
                        {time}
                    </TimeButton>
                ))}
            </TimeGridWrapper>
        </Drawer>
    );
};

const Title = styled.span`
    font-size: 2.5rem;
    font-family: Bold;
`;

const Header = styled.div`
    height: 8.5rem;
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    visibility: ${({ show }) => (show ? 'visible' : 'hidden')};
`;

const Time = styled.div`
    font-size: 1.75rem;
    font-family: Bold;
    width: 100%;
    text-align: center;
    color: ${({ theme }) => theme.title};
`;

const TimeGridWrapper = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    padding: 1rem;
    margin-top: 2rem;
    transition: margin-top 0.4s ease;
`;

const TimeButton = styled(Button)`
    height: 4rem;
    border-radius: 1rem;
    padding: 0;
    background-color: ${({ selected, theme }) => (selected ? theme.primary : theme.white)};
    color: ${({ selected, theme }) => (selected ? theme.white : theme.black)};
    &:hover,
    &:active {
        background-color: ${({ theme }) => theme.primary} !important;
        color: ${({ theme }) => theme.white} !important;
    }

    & * {
        font-size: 1.25rem;
    }
`;

export default AddEnsembleDrawer3;
