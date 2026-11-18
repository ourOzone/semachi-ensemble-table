import { useContext } from 'react';
import { FetchContextProvider, FetchContext } from "./fetch";
import { TeamContextProvider, TeamContext } from "./team";
import { EnsembleContextProvider, EnsembleContext } from "./ensemble";
import { DrawerContextProvider, DrawerContext } from "./drawer";

// 전체 root파일(src/index.js)에 ContextProvider 중첩해서 기입하지 않기 위한 + useContext 함수들 일괄 정의 위한 파일
// Context가 추가되면 여기에도 추가로 작성해야 함

export function ContextProvider({ children }) {
    return (
        <FetchContextProvider>
            <TeamContextProvider>
                <EnsembleContextProvider>
                    <DrawerContextProvider>
                        {children}
                    </DrawerContextProvider>
                </EnsembleContextProvider>
            </TeamContextProvider>
        </FetchContextProvider>
    );
}

export function useFetchContext() {
    return useContext(FetchContext);
}

export function useTeamContext() {
    return useContext(TeamContext);
}

export function useEnsembleContext() {
    return useContext(EnsembleContext);
}

export function useDrawerContext() {
    return useContext(DrawerContext);
}