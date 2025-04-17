import React, { createContext, useState, useCallback } from 'react';
import { getTeams } from 'api/teams';
import { getEnsembles } from 'api/ensembles';
import { getNotes } from 'api/notes';

const FetchContext = createContext();

function FetchContextProvider({ children }) {
    const [teams, setTeams] = useState([]);
    const [ensembles, setEnsembles] = useState([]);
    const [notes, setNotes] = useState([]);

    // 화면 전체 fetching 하는 함수
    const fetchData = useCallback(async () => {
        // teams fetch
        const teamsRaw = await getTeams();
        const teamsData = teamsRaw.map(({ _id, type, name, desc }) => ({
            id: _id,
            type,
            name,
            desc
        }));
        setTeams(teamsData);
        
        // ensembles fetch
        const ensemblesRaw = await getEnsembles();
        const blocks = Array.from({ length: 7 }, () => Array.from({ length: 30 }, () => [])); // 직관적으로 blocks로 표기 (7 x 30 사이즈 2차원 배열)
        
        ensemblesRaw.forEach(({ _id, teamId, teamName, startTime, endTime, day, room, type, due }) => {
            for (let hour = startTime; hour <= endTime; hour++) {
                blocks[day][hour].push({
                    id: _id,
                    teamId,
                    teamName: hour === startTime ? teamName : '', // 맨 처음 블록에만 팀명 표시
                    isExternal: room === '외부', // TODO 삭제
                    isOneTime: type === '일회성',
                    due,
                    teamColorIdx: teamsData.findIndex(team => team.id === teamId)
                });
            }
        });
        setEnsembles(blocks);

        // notes fetch
        const notesRaw = await getNotes();
        const notesData = notesRaw.map(({ _id, text }) => ({
            id: _id,
            text,
        }));
        setNotes(notesData);

        // TODO 공지 추가

    }, []);

    return (
        <FetchContext.Provider value={{ teams, ensembles, notes, fetchData }}>
            {children}
        </FetchContext.Provider>
    );
}

export { FetchContextProvider, FetchContext };