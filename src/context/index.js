import { useContext } from 'react';
import { DataContextProvider, DataContext } from "./data";
import { DrawerContextProvider, DrawerContext } from "./drawer";

function ContextProvider({ children }) {
    return (
        <DataContextProvider>
            <DrawerContextProvider>
                {children}
            </DrawerContextProvider>
        </DataContextProvider>
    );
}

function useDataContext() {
    return useContext(DataContext);
}

function useDrawerContext() {
    return useContext(DrawerContext);
}

export { ContextProvider, useDataContext, useDrawerContext };