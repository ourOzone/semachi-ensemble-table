import React, { createContext, useState, useCallback } from 'react';
import axios from 'axios';
import { url } from 'constants';

const DataContext = createContext();

function DataContextProvider({ children }) {
    const [teams, setTeams] = useState([]);
    const [ensembles, setEnsembles] = useState([]);
    const [notes, setNotes] = useState([]);

    // API 호출 (TODO: 커스텀 훅 또는 react-query 적용 예정)
    const getData = useCallback(async (endpoint) => {
        try {
            const { data } = await axios.get(`${url}/${endpoint}`);
            return data;
        } catch (error) {
            console.error(`Failed to fetch ${endpoint}:`, error);
            return [];
        }
    }, []);

    // 화면 전체 fetching 하는 함수
    const fetchData = useCallback(async () => {
        // teams fetch
        const teamsRaw = await getData('teams');
        const teamsData = teamsRaw.map(({ _id, type, name, desc }) => ({
            id: _id,
            type,
            name,
            desc
        }));
        setTeams(teamsData);
        
        // ensembles fetch
        const ensemblesRaw = await getData('ensembles');
        const blocks = Array.from({ length: 7 }, () => Array.from({ length: 30 }, () => [])); // 직관적으로 blocks로 표기
        
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
        const notesRaw = await getData('notes');
        const notesData = notesRaw.map(({ _id, text }) => ({
            id: _id,
            text,
        }));
        setNotes(notesData);

        // TODO 공지 추가

    }, [getData]);

    return (
        <DataContext.Provider value={{ teams, ensembles, notes, fetchData }}>
            {children}
        </DataContext.Provider>
    );
}

export { DataContextProvider, DataContext };