import { createContext, useState, useCallback, type ReactNode } from 'react';

// 지금 보고 있는 팀 (팀 정보·소모임 정보 Drawer, 합주 정보의 팀). View 개편 V-3 13차에 옛 팀 추가·수정 Drawer가 모두 새 Drawer
// (입력은 Drawer 안의 로컬 상태)로 바뀌어, 그 단계들이 쓰던 setter·PIN·수정 전 값(org*)을 뺐다

export interface TeamContextValue {
    id: string;
    /** 팀 종류. 초기화 상태는 '' */
    type: string;
    name: string;
    /** [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트] */
    desc: string[];
    /** 인자를 생략하면 초기값으로 되돌린다 */
    setTeamStates: (id?: string, type?: string, name?: string, desc?: string[]) => void;
}

const TeamContext = createContext<TeamContextValue | null>(null);

interface TeamContextProviderProps {
    children: ReactNode;
}

const EMPTY_DESC = ['', '', '', '', '', '', ''];

function TeamContextProvider({ children }: TeamContextProviderProps) {
    const [id, setId] = useState('');
    const [type, setType] = useState('');
    const [name, setName] = useState('');
    const [desc, setDesc] = useState<string[]>(EMPTY_DESC); // [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트]

    const setTeamStates = useCallback(
        (id = '', type = '', name = '', desc: string[] = EMPTY_DESC) => {
            setId(id);
            setType(type);
            setName(name);
            setDesc(desc);
        },
        [],
    );

    return (
        <TeamContext.Provider value={{ id, type, name, desc, setTeamStates }}>
            {children}
        </TeamContext.Provider>
    );
}

export { TeamContextProvider, TeamContext };
