import React, { createContext, useState, useCallback } from 'react';
import { checkTeamPin } from 'api/team';

const TeamContext = createContext();

function TeamContextProvider({ children }) {

    const [id, setId] = useState('');
    const [type, setType] = useState('');
    const [name, setName] = useState('');
    const [desc, setDesc] = useState(['', '', '', '', '', '', '']); // [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트]
    const [pin, setPin] = useState('');

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

    return (
        <TeamContext.Provider value={{ 
            id, setId,
            type, setType,
            name, setName,
            desc, setDesc,
            pin, setPin,
            setTeamStates,
         }}>
            {children}
        </TeamContext.Provider>
    );
}

export { TeamContextProvider, TeamContext };
