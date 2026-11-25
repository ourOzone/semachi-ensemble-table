import dayjs, { type Dayjs } from 'dayjs';
import { create } from 'zustand';
import { useDrawerStore } from '@/stores/drawer';
import type { DrawerId, TimeSlot } from '@/types';

// 합주 잡기 Drawer(AddEnsembleDrawer)를 여는 곳이 여러 군데라(팀 정보·소모임 정보·합주판의 빈 시간·겹친 합주 목록·합주 정보),
// 미리 채울 값을 여기에 두고 Drawer는 열릴 때마다 이 값으로 입력을 새로 시작한다 (View 개편 V-2 21차).
// 입력값 자체는 Drawer 안의 로컬 상태다.

export interface AddEnsemblePreset {
    /** 팀(또는 소모임·일정) id. 팀 정보에서 열면 그 팀, 합주판에서 열면 없음(골라야 함) */
    teamId?: string;
    /** 합주판에서 열면 누른 날짜·시간 (팀 정보에서 열면 없음) */
    date?: Dayjs;
    startTime?: TimeSlot;
    /** 저장하지 않고 닫으면 돌아갈 Drawer (팀 정보·소모임 정보). 없으면 모두 닫는다 */
    returnTo?: DrawerId;
}

interface AddEnsembleState {
    /** 열 때마다 1씩 늘어, Drawer가 입력을 새로 시작하는 기준(key)이 된다 */
    session: number;
    preset: AddEnsemblePreset;
}

export const useAddEnsembleStore = create<AddEnsembleState>()(() => ({ session: 0, preset: {} }));

/** 합주 잡기 Drawer를 연다. 열린 Drawer는 모두 이 Drawer로 바뀐다 (옛 Drawer 위에 쌓으면 옛 Drawer가 위에 그려진다) */
export function openAddEnsemble(preset: AddEnsemblePreset) {
    // 캘린더에서 지난 요일(이번 주 앞쪽)을 보고 열었으면 다음에 오는 그 요일로 (지난 날짜에는 잡을 수 없다)
    let date = preset.date?.startOf('day');
    const today = dayjs().startOf('day');
    while (date && date.isBefore(today)) date = date.add(7, 'day');
    useAddEnsembleStore.setState((state) => ({
        session: state.session + 1,
        preset: { ...preset, date },
    }));
    useDrawerStore.getState().setOpenedDrawers(['addEnsemble']);
}
