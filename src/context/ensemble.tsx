import {
    createContext,
    useState,
    useCallback,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';
import type { Dayjs } from 'dayjs';
import type { TimeSlot } from '@/types';

// 합주판에서 누른 합주 (합주 정보 Drawer가 보여주는 값).
// V-2 정리(2026-11-25): 옛 합주 추가·수정 Drawer 단계 사이 값 전달용(org* 복원 값, 달력의 보이는 달,
// 쓰는 곳 없는 setter)을 지웠다. 남은 것은 합주 정보 Drawer와 Board가 쓴다 (context 자체는 V-6에서 정리)

export interface EnsembleContextValue {
    id: string;
    repeat: boolean;
    setRepeat: Dispatch<SetStateAction<boolean>>;
    /** 선택 안 됨은 null */
    nextDate: Dayjs | null;
    setNextDate: Dispatch<SetStateAction<Dayjs | null>>;
    /** 선택 안 됨은 null */
    startTime: TimeSlot | null;
    /** 선택 안 됨은 null */
    endTime: TimeSlot | null;
    /** 인자를 생략하면 초기값으로 되돌린다 */
    setEnsembleStates: (
        id?: string,
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
    const [nextDate, setNextDate] = useState<Dayjs | null>(null);
    const [startTime, setStartTime] = useState<TimeSlot | null>(null); // idx값 (0 ~ 29)
    const [endTime, setEndTime] = useState<TimeSlot | null>(null); // idx값 (0 ~ 29)

    const setEnsembleStates = useCallback(
        (
            id = '',
            repeat = false,
            nextDate: Dayjs | null = null,
            startTime: TimeSlot | null = null,
            endTime: TimeSlot | null = null,
        ) => {
            setId(id);
            setRepeat(repeat);
            setNextDate(nextDate);
            setStartTime(startTime);
            setEndTime(endTime);
        },
        [],
    );

    return (
        <EnsembleContext.Provider
            value={{
                id,
                repeat,
                setRepeat,
                nextDate,
                setNextDate,
                startTime,
                endTime,
                setEnsembleStates,
            }}
        >
            {children}
        </EnsembleContext.Provider>
    );
}

export { EnsembleContextProvider, EnsembleContext };
