import type { SetStateAction } from 'react';
import type { Dayjs } from 'dayjs';
import { create } from 'zustand';
import type { TimeSlot } from '@/types';

// 지금 보고 있는 팀·합주: 팀 정보·소모임 정보·합주 정보 Drawer가 보여 줄 대상.
// V-6에 context/team·context/ensemble(React Context)에서 옮겼다. 값과 함수 이름·동작은 그대로다.
// Zustand라 Provider가 없고, 고른 값이 바뀔 때만 다시 그린다 (이전: Provider value가 매번 새 객체, ISSUES P3).
// id만 두고 내용을 조회 결과에서 찾게 하지 않은 이유: 미루기·수정 직후 다시 불러오기가 끝나기 전에도
// 바뀐 값을 바로 보여 주려고 (조회 결과에서 찾으면 잠깐 이전 값이 보인다)

const EMPTY_DESC = ['', '', '', '', '', '', ''];

export interface TeamSelectionState {
    id: string;
    /** 팀 종류. 초기화 상태는 '' */
    type: string;
    name: string;
    /** [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트] */
    desc: string[];
    /** 인자를 생략하면 초기값으로 되돌린다 */
    setTeamStates: (id?: string, type?: string, name?: string, desc?: string[]) => void;
}

export const useTeamSelectionStore = create<TeamSelectionState>()((set) => ({
    id: '',
    type: '',
    name: '',
    desc: EMPTY_DESC,
    setTeamStates: (id = '', type = '', name = '', desc = EMPTY_DESC) =>
        set({ id, type, name, desc }),
}));

export interface EnsembleSelectionState {
    id: string;
    repeat: boolean;
    /** 다음 합주 날짜. 선택 안 됨은 null */
    nextDate: Dayjs | null;
    /** 시간칸 (0~29). 선택 안 됨은 null */
    startTime: TimeSlot | null;
    endTime: TimeSlot | null;
    setRepeat: (value: SetStateAction<boolean>) => void;
    setNextDate: (value: SetStateAction<Dayjs | null>) => void;
    /** 인자를 생략하면 초기값으로 되돌린다 */
    setEnsembleStates: (
        id?: string,
        repeat?: boolean,
        nextDate?: Dayjs | null,
        startTime?: TimeSlot | null,
        endTime?: TimeSlot | null,
    ) => void;
}

export const useEnsembleSelectionStore = create<EnsembleSelectionState>()((set) => ({
    id: '',
    repeat: false,
    nextDate: null,
    startTime: null,
    endTime: null,
    setRepeat: (value) =>
        set((state) => ({ repeat: typeof value === 'function' ? value(state.repeat) : value })),
    setNextDate: (value) =>
        set((state) => ({
            nextDate: typeof value === 'function' ? value(state.nextDate) : value,
        })),
    setEnsembleStates: (
        id = '',
        repeat = false,
        nextDate = null,
        startTime = null,
        endTime = null,
    ) => set({ id, repeat, nextDate, startTime, endTime }),
}));
