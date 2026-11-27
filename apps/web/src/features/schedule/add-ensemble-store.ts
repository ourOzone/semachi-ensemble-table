import dayjs, { type Dayjs } from 'dayjs';
import { create } from 'zustand';
import { useDrawerStore } from '@/stores/drawer';
import type { DrawerId, TimeSlot } from '@/types/index';
import type { TeamOption } from './add-ensemble-drawer';

// 합주 잡기 Drawer(AddEnsembleDrawer)를 여는 곳이 여러 군데라(팀 정보·소모임 정보·합주판의 빈 시간·겹친 합주 목록·합주 정보),
// 미리 채울 값을 여기에 두고 Drawer는 열릴 때마다 이 값으로 입력을 새로 시작한다 (View 개편 V-2 21차).
// 입력값 자체는 Drawer 안의 로컬 상태다.
// 합주 수정(31차)도 같은 Drawer를 쓴다: openUpdateEnsemble로 열면 지금 값이 채워지고, 팀은 바꿀 수 없다.

export interface AddEnsemblePreset {
    /** 팀(또는 소모임·일정) id. 팀 정보에서 열면 그 팀, 합주판에서 열면 없음(골라야 함) */
    teamId?: string;
    /** 합주판에서 열면 누른 날짜·시간 (팀 정보에서 열면 없음) */
    date?: Dayjs;
    startTime?: TimeSlot;
    /** 저장하지 않고 닫으면 돌아갈 Drawer (팀 정보·소모임 정보). 없으면 모두 닫는다 */
    returnTo?: DrawerId;
}

/** 수정할 합주의 지금 값 (합주 정보 Drawer에서 PIN이 맞은 뒤 연다) */
export interface EditTarget {
    id: string;
    /** 팀은 바꿀 수 없다 (PIN이 이 팀의 PIN) */
    team: TeamOption;
    repeat: boolean;
    /** 다음 합주 날짜 (반복이면 시작 날짜), 0시 */
    date: Dayjs;
    startTime: TimeSlot;
    endTime: TimeSlot;
    /** 반복 종료 날짜. 일회성이거나 계속 반복이면 null */
    repeatEnd: Dayjs | null;
    /** 합주 정보의 PIN 단계에서 맞은 팀 PIN. 저장할 때 서버가 다시 확인한다 (백엔드 개편 B-6) */
    pin: string;
}

interface AddEnsembleState {
    /** 열 때마다 1씩 늘어, Drawer가 입력을 새로 시작하는 기준(key)이 된다 */
    session: number;
    preset: AddEnsemblePreset;
    /** 수정으로 열었으면 그 합주, 합주 잡기면 null */
    edit: EditTarget | null;
}

export const useAddEnsembleStore = create<AddEnsembleState>()(() => ({
    session: 0,
    preset: {},
    edit: null,
}));

/** 합주 잡기 Drawer를 연다. 열린 Drawer는 모두 이 Drawer로 바뀐다 (옛 Drawer 위에 쌓으면 옛 Drawer가 위에 그려진다) */
export function openAddEnsemble(preset: AddEnsemblePreset) {
    // 캘린더에서 지난 요일(이번 주 앞쪽)을 보고 열었으면 다음에 오는 그 요일로 (지난 날짜에는 잡을 수 없다)
    let date = preset.date?.startOf('day');
    const today = dayjs().startOf('day');
    while (date && date.isBefore(today)) date = date.add(7, 'day');
    useAddEnsembleStore.setState((state) => ({
        session: state.session + 1,
        preset: { ...preset, date },
        edit: null,
    }));
    useDrawerStore.getState().setOpenedDrawers(['addEnsemble']);
}

/** 합주 수정 Drawer(같은 Drawer의 수정 모드)를 연다. 저장하지 않고 닫으면 합주 정보로 돌아간다 */
export function openUpdateEnsemble(target: EditTarget) {
    useAddEnsembleStore.setState((state) => ({
        session: state.session + 1,
        preset: { returnTo: 'ensembleInfo' },
        edit: target,
    }));
    useDrawerStore.getState().setOpenedDrawers(['updateEnsemble']);
}
