import { useContext, type Context, type ReactNode } from 'react';
import { TeamContextProvider, TeamContext } from './team';
import { EnsembleContextProvider, EnsembleContext } from './ensemble';
import { DrawerContextProvider, DrawerContext } from './drawer';

// 전체 root파일(src/index.js)에 ContextProvider 중첩해서 기입하지 않기 위한 + useContext 함수들 일괄 정의 위한 파일
// Context가 추가되면 여기에도 추가로 작성해야 함

interface ContextProviderProps {
    children: ReactNode;
}

export function ContextProvider({ children }: ContextProviderProps) {
    return (
        <TeamContextProvider>
            <EnsembleContextProvider>
                <DrawerContextProvider>{children}</DrawerContextProvider>
            </EnsembleContextProvider>
        </TeamContextProvider>
    );
}

// Provider 밖에서 호출하면 바로 에러를 낸다. (이전에는 undefined를 구조분해하다 TypeError가 났다)
function useRequiredContext<T>(context: Context<T | null>, name: string): T {
    const value = useContext(context);
    if (value === null) {
        throw new Error(`${name}는 ContextProvider 안에서만 사용할 수 있어요.`);
    }
    return value;
}

export function useTeamContext() {
    return useRequiredContext(TeamContext, 'useTeamContext');
}

export function useEnsembleContext() {
    return useRequiredContext(EnsembleContext, 'useEnsembleContext');
}

export function useDrawerContext() {
    return useRequiredContext(DrawerContext, 'useDrawerContext');
}
