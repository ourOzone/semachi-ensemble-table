import React, { createContext, useState, useCallback } from 'react';
import dayjs from 'dayjs';

const EnsembleContext = createContext();

function EnsembleContextProvider({ children }) {

    const [id, setId] = useState('');
    const [repeat, setRepeat] = useState(false);
    const [nextDate, setNextDate] = useState(null); // dayjs (2025-05-27T00:00:00.000Z"), POST시 YYYY-MM-DD의 string으로 변환
    const [startTime, setStartTime] = useState(null); // idx값 (0 ~ 29)
    const [endTime, setEndTime] = useState(null); // idx값 (0 ~ 29)
    const [currentMonth, setCurrentMonth] = useState(dayjs()); // 합주 추가시 달력에서 사용, drawer close시 초기화 위해 여기에 선언

    const setEnsembleStates = useCallback((
        id = '',
        repeat = false,
        nextDate = null,
        startTime = null,
        endTime = null,
        currentMonth = dayjs(),
    ) => {
        setId(id);
        setRepeat(repeat);
        setNextDate(nextDate);
        setStartTime(startTime);
        setEndTime(endTime);
        setCurrentMonth(currentMonth);
    }, []);

    return (
        <EnsembleContext.Provider value={{
            id, setId,
            repeat, setRepeat,
            nextDate, setNextDate,
            startTime, setStartTime,
            endTime, setEndTime,
            currentMonth, setCurrentMonth,
            setEnsembleStates,
         }}>
            {children}
        </EnsembleContext.Provider>
    );
}

export { EnsembleContextProvider, EnsembleContext };
