import { create } from 'zustand';
import type { DrawerId } from '@/types';

// 열린 Drawer 스택. App(본문 밀기)과 모든 Drawer가 참조하는 전역 UI 상태라 Zustand store로 둔다 (3-9, 이전: context/drawer).
// 컴포넌트 밖(이벤트 처리 함수 등)에서도 useDrawerStore.getState()로 읽고 바꿀 수 있다.
// View 개편 때 단일 Drawer 구조에 맞게 줄인다 (docs/VIEW_REDESIGN_PLAN.md).

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
