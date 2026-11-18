import React, { createContext, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { getTeams } from 'api/team';
import { getEnsembles } from 'api/ensemble';
import { getNotes } from 'api/note';
import { getNotices } from 'api/notice';
import { eventIds } from 'constants';
import theme from 'styles/theme';
import { idx2hour } from "constants";

const FetchContext = createContext();

function FetchContextProvider({ children }) {
    const [teams, setTeams] = useState([]);
    const [ensembles, setEnsembles] = useState([]);
    const [notes, setNotes] = useState([]);
    const [notices, setNotices] = useState([]);

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
        console.log(teamsData)

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

        // day, startTime, endTime에 따라 block 형식으로 정제
        ensemblesRaw.forEach(({ _id, day, startTime, endTime, teamId, teamName, repeat, nextDate, due }) => {
            for (let hour = startTime; hour <= endTime; hour++) {
                blocks[day][hour].push({
                    id: _id,
                    day,
                    startTime,
                    endTime,
                    teamId,
                    name: teamName,
                    repeat,
                    nextDate: !repeat || dayjs().isBefore(dayjs(nextDate), 'day') // 일회성 합주거나 nextDate가 오늘 이후인 경우
                                ? dayjs(nextDate) // 그대로 둠, 그렇지 않은 경우
                                : dayjs(nextDate).day() === dayjs().day() // nextDate가 오늘과 같은 요일인 경우
                                ? dayjs().hour(parseInt(idx2hour[endTime + 1].split(':')[0])).minute(parseInt(idx2hour[endTime + 1].split(':')[1])).isAfter(dayjs()) // endTime이 현재 시간 이후라면 오늘로 설정
                                    ? dayjs() 
                                    : dayjs().add(7, 'day') // 아니라면 다음주 같은 요일로 설정
                                : dayjs().add((7 + dayjs(nextDate).day() - dayjs().day()) % 7, 'day'), // (오늘과 다른 요일인 경우) 다음 가장 가까운 해당 요일로 설정

                    due,
                    displayName: hour === startTime ? teamName : '', // 맨 처음 블록에만 팀명 표시
                    teamColor: colorMap[teamId] ?? -1,
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

        // notices fetch
        const noticesRaw = await getNotices();
        const noticesData = noticesRaw.map(({ _id, content }) => ({
            id: _id,
            text: content,
        }));
        setNotices(noticesData);

    }, []);

    return (
        <FetchContext.Provider value={{ teams, ensembles, notes, notices, fetchData }}>
            {children}
        </FetchContext.Provider>
    );
}

export { FetchContextProvider, FetchContext };