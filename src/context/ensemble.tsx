import {
    createContext,
    useState,
    useCallback,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import type { TimeSlot } from '@/types';

export interface EnsembleContextValue {
    id: string;
    setId: Dispatch<SetStateAction<string>>;
    repeat: boolean;
    setRepeat: Dispatch<SetStateAction<boolean>>;
    /** 선택 안 됨은 null */
    nextDate: Dayjs | null;
    setNextDate: Dispatch<SetStateAction<Dayjs | null>>;
    /** 선택 안 됨은 null */
    startTime: TimeSlot | null;
    setStartTime: Dispatch<SetStateAction<TimeSlot | null>>;
    /** 선택 안 됨은 null */
    endTime: TimeSlot | null;
    setEndTime: Dispatch<SetStateAction<TimeSlot | null>>;
    /** 합주 추가·수정 달력에 보이는 달 */
    currentMonth: Dayjs;
    setCurrentMonth: Dispatch<SetStateAction<Dayjs>>;
    orgRepeat: boolean;
    orgNextDate: Dayjs | null;
    orgStartTime: TimeSlot | null;
    orgEndTime: TimeSlot | null;
    /** 인자를 생략하면 초기값으로 되돌린다 */
    setEnsembleStates: (
        id?: string,
        repeat?: boolean,
        nextDate?: Dayjs | null,
        startTime?: TimeSlot | null,
        endTime?: TimeSlot | null,
        currentMonth?: Dayjs,
    ) => void;
    setEnsembleOrgStates: (
        repeat?: boolean,
        nextDate?: Dayjs | null,
        startTime?: TimeSlot | null,
        endTime?: TimeSlot | null,
    ) => void;
}

const EnsembleContext = createContext<EnsembleContextValue | null>(null);

interface EnsembleContextProviderProps {
    children: ReactNode;
}

function EnsembleContextProvider({ children }: EnsembleContextProviderProps) {
    const [id, setId] = useState('');
    const [repeat, setRepeat] = useState(false);
    const [nextDate, setNextDate] = useState<Dayjs | null>(null); // dayjs (2025-05-27T00:00:00.000Z"), POST시 YYYY-MM-DD의 string으로 변환
    const [startTime, setStartTime] = useState<TimeSlot | null>(null); // idx값 (0 ~ 29)
    const [endTime, setEndTime] = useState<TimeSlot | null>(null); // idx값 (0 ~ 29)
    const [currentMonth, setCurrentMonth] = useState(dayjs()); // 합주 추가시 달력에서 사용, drawer close시 초기화 위해 여기에 선언

    // 합주 수정시 수정하다 뒤로가기 했을 때 state가 바뀌지 않도록 하기 위함
    const [orgRepeat, setOrgRepeat] = useState(false);
    const [orgNextDate, setOrgNextDate] = useState<Dayjs | null>(null);
    const [orgStartTime, setOrgStartTime] = useState<TimeSlot | null>(null);
    const [orgEndTime, setOrgEndTime] = useState<TimeSlot | null>(null);

    const setEnsembleStates = useCallback(
        (
            id = '',
            repeat = false,
            nextDate: Dayjs | null = null,
            startTime: TimeSlot | null = null,
            endTime: TimeSlot | null = null,
            currentMonth: Dayjs = dayjs(),
        ) => {
            setId(id);
            setRepeat(repeat);
            setNextDate(nextDate);
            setStartTime(startTime);
            setEndTime(endTime);
            setCurrentMonth(currentMonth);
        },
        [],
    );

    const setEnsembleOrgStates = useCallback(
        (
            repeat = false,
            nextDate: Dayjs | null = null,
            startTime: TimeSlot | null = null,
            endTime: TimeSlot | null = null,
        ) => {
            setOrgRepeat(repeat);
            setOrgNextDate(nextDate);
            setOrgStartTime(startTime);
            setOrgEndTime(endTime);
        },
        [],
    );

    return (
        <EnsembleContext.Provider
            value={{
                id,
                setId,
                repeat,
                setRepeat,
                nextDate,
                setNextDate,
                startTime,
                setStartTime,
                endTime,
                setEndTime,
                currentMonth,
                setCurrentMonth,
                orgRepeat,
                orgNextDate,
                orgStartTime,
                orgEndTime,
                setEnsembleStates,
                setEnsembleOrgStates,
            }}
        >
            {children}
        </EnsembleContext.Provider>
    );
}

export { EnsembleContextProvider, EnsembleContext };
