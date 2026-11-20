import {
    createContext,
    useState,
    useCallback,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';
import type { DrawerId } from '@/types';

// Drawer의 상태는 App.jsx에서도 참조하는 등, 전역으로 관리 필요성 있어 Context로 구현

export interface DrawerContextValue {
    /** 열려 있는 Drawer 스택. 마지막 요소가 맨 위 */
    openedDrawers: DrawerId[];
    openDrawer: (drawId: DrawerId) => void;
    setOpenedDrawers: Dispatch<SetStateAction<DrawerId[]>>;
    closeAllDrawers: () => void;
    /** 맨 위 Drawer 하나를 닫는다 */
    closeDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

interface DrawerContextProviderProps {
    children: ReactNode;
}

function DrawerContextProvider({ children }: DrawerContextProviderProps) {
    const [openedDrawers, setOpenedDrawers] = useState<DrawerId[]>([]);

    // Drawer의 open/close 관리 (모든 Drawer는 openedDrawers 배열 내에 자신의 drawId가 있으면 open로 판단)
    const openDrawer = useCallback((drawId: DrawerId) => {
        setOpenedDrawers((prev) => [...prev, drawId]);
    }, []);

    const closeAllDrawers = useCallback(() => {
        setOpenedDrawers([]);
    }, []);

    const closeDrawer = useCallback(() => {
        setOpenedDrawers((prev) => prev.slice(0, -1));
    }, []);

    return (
        <DrawerContext.Provider
            value={{ openedDrawers, openDrawer, setOpenedDrawers, closeAllDrawers, closeDrawer }}
        >
            {children}
        </DrawerContext.Provider>
    );
}

export { DrawerContextProvider, DrawerContext };
