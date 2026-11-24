import { create } from 'zustand';
import type { DrawerId } from '@/types';

// 열린 Drawer 스택. App(본문 밀기)과 모든 Drawer가 참조하는 전역 UI 상태라 Zustand store로 둔다 (3-9, 이전: context/drawer).
// 컴포넌트 밖(이벤트 처리 함수 등)에서도 useDrawerStore.getState()로 읽고 바꿀 수 있다.
// View 개편 때 단일 Drawer 구조에 맞게 줄인다 (docs/VIEW_REDESIGN_PLAN.md).

/**
 * 아래에서 올라오는 새 Drawer(View 개편, vaul). 옛 Drawer(antd, 오른쪽에서 열림)와 달리 본문을 밀지 않고,
 * 스택의 맨 위일 때만 열린다 (위에 옛 Drawer가 쌓이면 잠시 내려갔다가, 그 Drawer가 닫히면 다시 올라온다)
 */
export const BOTTOM_DRAWERS: readonly DrawerId[] = ['ensembleInfo', 'slotInfo', 'addEnsemble'];

/** 스택에서 옛 Drawer(오른쪽에서 열림)만 */
export function sideDrawers(openedDrawers: readonly DrawerId[]): DrawerId[] {
    return openedDrawers.filter((id) => !BOTTOM_DRAWERS.includes(id));
}

export interface DrawerState {
    /** 열려 있는 Drawer 스택. 마지막 요소가 맨 위. 모든 Drawer는 자신의 drawerId가 있으면 열린 것으로 판단 */
    openedDrawers: DrawerId[];
    openDrawer: (drawerId: DrawerId) => void;
    /** 스택을 통째로 바꾼다 (예: 수정 완료 후 정보 Drawer 하나만 남기기) */
    setOpenedDrawers: (drawers: DrawerId[]) => void;
    closeAllDrawers: () => void;
    /** 맨 위 Drawer 하나를 닫는다 */
    closeDrawer: () => void;
}

export const useDrawerStore = create<DrawerState>()((set) => ({
    openedDrawers: [],
    openDrawer: (drawerId) =>
        set((state) => ({ openedDrawers: [...state.openedDrawers, drawerId] })),
    setOpenedDrawers: (drawers) => set({ openedDrawers: drawers }),
    closeAllDrawers: () => set({ openedDrawers: [] }),
    closeDrawer: () => set((state) => ({ openedDrawers: state.openedDrawers.slice(0, -1) })),
}));
