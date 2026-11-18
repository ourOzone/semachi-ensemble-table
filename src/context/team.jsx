import React, { createContext, useState, useCallback } from 'react';
import { checkTeamPin } from 'api/team';

const TeamContext = createContext();

function TeamContextProvider({ children }) {

    const [id, setId] = useState('');
    const [type, setType] = useState('');
    const [name, setName] = useState('');
    const [desc, setDesc] = useState(['', '', '', '', '', '', '']); // [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트]
    const [pin, setPin] = useState('');

    // 팀 수정시 수정하다 뒤로가기 했을 때 state가 바뀌지 않도록 하기 위함
    const [orgType, setOrgType] = useState('');
    const [orgName, setOrgName] = useState('');
    const [orgDesc, setOrgDesc] = useState(['', '', '', '', '', '', '']);

    const setTeamStates = useCallback((
        id = '',
        type = '',
        name = '',
        desc = ['', '', '', '', '', '', ''],
        pin = ''
    ) => {
        setId(id);
        setType(type);
        setName(name);
        setDesc(desc);
        setPin(pin);
    }, []);

    const setTeamOrgStates = useCallback((
        type = '',
        name = '',
        desc = ['', '', '', '', '', '', '']
    ) => {
        setOrgType(type);
        setOrgName(name);
        setOrgDesc(desc);
    }, []);

    return (
        <TeamContext.Provider value={{ 
            id, setId,
            type, setType,
            name, setName,
            desc, setDesc,
            pin, setPin,
            orgType,
            orgName,
            orgDesc,
            setTeamStates,
            setTeamOrgStates,
         }}>
            {children}
        </TeamContext.Provider>
    );
}

export { TeamContextProvider, TeamContext };
