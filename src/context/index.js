import { useContext } from 'react';
import { FetchContextProvider, FetchContext } from "./fetch";
import { DrawerContextProvider, DrawerContext } from "./drawer";

// 전체 root파일(src/index.js)에 ContextProvider 중첩해서 기입하지 않기 위한 + useContext 함수들 일괄 정의 위한 파일
// Context가 추가되면 여기에도 추가로 작성해야 함

function ContextProvider({ children }) {
    return (
        <FetchContextProvider>
            <DrawerContextProvider>
                {children}
            </DrawerContextProvider>
        </FetchContextProvider>
    );
}

function useFetchContext() {
    return useContext(FetchContext);
}

function useDrawerContext() {
    return useContext(DrawerContext);
}

export { ContextProvider, useFetchContext, useDrawerContext };