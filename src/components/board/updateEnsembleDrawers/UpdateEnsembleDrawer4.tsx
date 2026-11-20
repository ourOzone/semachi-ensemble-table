import { useState, useCallback } from 'react';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { useTeamContext, useEnsembleContext, useDrawerContext } from '@/context';
import { idx2hour } from '@/constants';
import { Button } from 'antd';
import dayjs from 'dayjs';
import OkButton from '@/components/common/OkButton';
import type { DrawerId, TimeSlot } from '@/types';
import type { HandleUpdateEnsemble } from '../types';

interface UpdateEnsembleDrawer4Props {
    drawerId: DrawerId;
    handleUpdateEnsemble: HandleUpdateEnsemble;
}

const UpdateEnsembleDrawer4 = ({ drawerId, handleUpdateEnsemble }: UpdateEnsembleDrawer4Props) => {
    const { id: teamId } = useTeamContext();
    const { id, repeat, nextDate, startTime, setStartTime, endTime, setEndTime } =
        useEnsembleContext();
    const { openDrawer } = useDrawerContext();

    const [startTimeStr, setStartTimeStr] = useState('');
    const [endTimeStr, setEndTimeStr] = useState('');

    const onClose = useCallback(() => {
        setStartTime(null);
        setEndTime(null);
        setStartTimeStr('');
        setEndTimeStr('');
    }, [setStartTime, setEndTime, setStartTimeStr, setEndTimeStr]);

    const handleClickTime = useCallback(
        (
            idx: TimeSlot,
            startTime: TimeSlot | null,
            endTime: TimeSlot | null,
            startTimeStr: string,
        ) => {
            // startTime과 endTime의 값은 모두 block의 index (0 ~ 29)
            // startIdx 설정
            if (startTime === null || endTime !== null) {
                // setStartTime(dayjs(`${dayjs(nextDate).format("YYYY-MM-DD")}T${time}`));
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
            }
        },
        [setStartTime, setEndTime],
    );

    const isSelected = (idx: TimeSlot): boolean => {
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
                    onClick={() =>
                        handleUpdateEnsemble(id, teamId, repeat, nextDate, startTime, endTime)
                    }
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

interface HeaderProps {
    show: boolean;
}

const Header = styled.div<HeaderProps>`
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

interface TimeButtonProps {
    selected: boolean;
}

const TimeButton = styled(Button)<TimeButtonProps>`
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

export default UpdateEnsembleDrawer4;
