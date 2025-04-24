import React, { createContext, useState, useCallback } from 'react';
import { getTeams } from 'api/teams';
import { getEnsembles } from 'api/ensembles';
import { getNotes } from 'api/notes';
import { eventIds } from 'constants';
import theme from 'styles/theme';

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

        // 소모임 및 회의는 제거
        const filteredTeamsData = teamsData.filter((team) => !eventIds.includes(team.id));
        setTeams(filteredTeamsData);
        
        // teamId → colorIndex 매핑 생성
        const teamColorMap = Object.fromEntries(
            filteredTeamsData.map((team, idx) => [team.id, theme.teamColors[idx % theme.teamColors.length]])
        );
        
        // 소모임 및 회의 추가
        const eventColorMap = Object.fromEntries(
            eventIds.map((id, idx) => [id, theme.eventColors[idx]])
        );
        const colorMap = { ...teamColorMap, ...eventColorMap };

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
                    isOneTime: type === '일회성', // TODO startTime 관련 로직으로 변경. 여기서 바꾸지 말고 컴포넌트에서 추가
                    due,
                    teamColor: colorMap[teamId] ?? -1,
                });
            }
        });
        console.log(blocks)
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