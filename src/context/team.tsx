import {
    createContext,
    useState,
    useCallback,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';

export interface TeamContextValue {
    id: string;
    setId: Dispatch<SetStateAction<string>>;
    /** 팀 종류 (TeamType). 초기화 상태는 '' */
    type: string;
    setType: Dispatch<SetStateAction<string>>;
    name: string;
    setName: Dispatch<SetStateAction<string>>;
    /** [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트] */
    desc: string[];
    setDesc: Dispatch<SetStateAction<string[]>>;
    pin: string;
    setPin: Dispatch<SetStateAction<string>>;
    orgType: string;
    orgName: string;
    orgDesc: string[];
    /** 인자를 생략하면 초기값으로 되돌린다 */
    setTeamStates: (
        id?: string,
        type?: string,
        name?: string,
        desc?: string[],
        pin?: string,
    ) => void;
    setTeamOrgStates: (type?: string, name?: string, desc?: string[]) => void;
}

const TeamContext = createContext<TeamContextValue | null>(null);

interface TeamContextProviderProps {
    children: ReactNode;
}

function TeamContextProvider({ children }: TeamContextProviderProps) {
    const [id, setId] = useState('');
    const [type, setType] = useState('');
    const [name, setName] = useState('');
    const [desc, setDesc] = useState<string[]>(['', '', '', '', '', '', '']); // [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트]
    const [pin, setPin] = useState('');

    // 팀 수정시 수정하다 뒤로가기 했을 때 state가 바뀌지 않도록 하기 위함
    const [orgType, setOrgType] = useState('');
    const [orgName, setOrgName] = useState('');
    const [orgDesc, setOrgDesc] = useState<string[]>(['', '', '', '', '', '', '']);

    const setTeamStates = useCallback(
        (
            id = '',
            type = '',
            name = '',
            desc: string[] = ['', '', '', '', '', '', ''],
            pin = '',
        ) => {
            setId(id);
            setType(type);
            setName(name);
            setDesc(desc);
            setPin(pin);
        },
        [],
    );

    const setTeamOrgStates = useCallback(
        (type = '', name = '', desc: string[] = ['', '', '', '', '', '', '']) => {
            setOrgType(type);
            setOrgName(name);
            setOrgDesc(desc);
        },
        [],
    );

    return (
        <TeamContext.Provider
            value={{
                id,
                setId,
                type,
                setType,
                name,
                setName,
                desc,
                setDesc,
                pin,
                setPin,
                orgType,
                orgName,
                orgDesc,
                setTeamStates,
                setTeamOrgStates,
            }}
        >
            {children}
        </TeamContext.Provider>
    );
}

export { TeamContextProvider, TeamContext };
