import React, { createContext, useState } from 'react';

const DrawerContext = createContext();

function DrawerContextProvider({ children }) {
    const [openedDrawers, setOpenedDrawers] = useState([]);

    // Drawer의 open/close 관리 (모든 Drawer는 openedDrawers 배열 내에 자신의 drawId가 있으면 open로 판단)
    const openDrawer = (drawId) => {
        setOpenedDrawers([...openedDrawers, drawId]);
    };
    const closeAllDrawers = () => {
        setOpenedDrawers([]);
    }
    const onCloseDrawer = () => {
        setOpenedDrawers(openedDrawers.slice(0, -1));
    };

    return (
        <DrawerContext.Provider value={{ openedDrawers, openDrawer, closeAllDrawers, onCloseDrawer }}>
            {children}
        </DrawerContext.Provider>
    );
}

export { DrawerContextProvider, DrawerContext };
