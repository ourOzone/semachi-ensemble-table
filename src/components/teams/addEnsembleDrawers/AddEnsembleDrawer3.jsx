import { useState, useMemo } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { useDrawerContext } from "context";
import { idx2hour } from "constants";
import { Button } from 'antd';
import dayjs from 'dayjs';

const drawerId = 'addEnsemble3';

const AddEnsembleDrawer3 = ({ startDate, startTime, setStartTime, endTime, setEndTime }) => {
    const { openDrawer } = useDrawerContext();

    const [startTimeStr, setStartTimeStr] = useState('');
    const [endTimeStr, setEndTimeStr] = useState('');

    const handleClick = (idx) => {
        // startTime과 endTime의 값은 모두 block의 index (0 ~ 29)
        // startIdx 설정
        if (startTime === null || endTime !== null) {
            // setStartTime(dayjs(`${dayjs(startDate).format("YYYY-MM-DD")}T${time}`));
            setStartTime(idx);
            setStartTimeStr(idx2hour[idx]);
            setEndTime(null);
            setEndTimeStr('');

        // endIdx 설정
        } else {
            // 같은 거 고른 경우 취소
            if (idx === startTime) {
                console.log('brrbrr')
                setStartTime(null);
                setStartTimeStr('');
            }
            // 더 앞 시간을 고른 경우
            else if (idx < startTime) {
                setEndTime(startTime);
                setEndTimeStr(startTimeStr);
                setStartTime(idx);
                setStartTimeStr(idx2hour[idx]);
            // 일반적인 경우
            } else {
                setEndTime(idx);
                setEndTimeStr(idx2hour[idx]);
            }

        }
    };

    const isSelected = (idx) => {
        if (startTime === null) return false;
        if (endTime === null) return idx === startTime;
        return idx >= startTime && idx <= endTime;
    }

    return (
        <Drawer drawerId={drawerId}>
            <Title>시간은요 🕗</Title>
            <TimeHeader show={!!endTime}>
                {`${dayjs(startDate).format("YYYY년 M월 D일")} ${startTimeStr}~${endTimeStr}`}
            </TimeHeader>
            <TimeGridWrapper>
                {idx2hour.map((time, idx) => (
                    <TimeButton
                        key={time}
                        selected={isSelected(idx)}
                        onClick={() => handleClick(idx)}
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

const TimeHeader = styled.div`
    height: 2rem;
    margin-top: 2rem;
    font-size: 2rem;
    font-family: Bold;
    width: 100%;
    text-align: center;
    opacity: ${({ show }) => (show ? 1 : 0)};
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
    background-color: ${({ selected, theme }) => (selected ? theme.primary : theme.white)};
    color: ${({ selected, theme }) => (selected ? theme.white : theme.black)};
    &:hover, &:active {
        background-color: ${({ theme }) => theme.primary} !important;
        color: ${({ theme }) => theme.white} !important;
    }

    & * {
        font-size: 1.25rem;
    }
`;

export default AddEnsembleDrawer3;
