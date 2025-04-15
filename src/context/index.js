import React, { createContext, useState, useContext, useCallback } from 'react';
import axios from 'axios';
import { url } from 'constants';

const Context = createContext();

function ContextProvider({ children }) {
    const [teams, setTeams] = useState([]);
    const [ensembles, setEnsembles] = useState([]);
    const [openedDrawers, setOpenedDrawers] = useState([]);

    // API 호출을 중앙에서 관리하는 fetchData 함수 (TODO: 커스텀 훅 또는 react-query 적용 예정)
    const fetchData = useCallback(async (endpoint) => {
        try {
            const { data } = await axios.get(`${url}/${endpoint}`);
            return data;
        } catch (error) {
            console.error(`Failed to fetch ${endpoint}:`, error);
            return [];
        }
    }, []);

    // 팀 목록을 가져오는 함수
    const getTeams = useCallback(async () => {
        const data = await fetchData('teams');
        const teamsData = data.map((team) => ({
            name: team.name,
            id: team._id,
            teamType: team.type
        }));
        setTeams(teamsData);
        return teamsData;
    }, [fetchData]);

    // 앙상블 데이터를 가져오는 함수
    const getEnsembles = useCallback(async (teamsData) => {
        const data = await fetchData('ensembles');
        
        const blocks = Array.from({ length: 7 }, () => Array.from({ length: 30 }, () => []));
        
        data.forEach((ensemble) => {
            for (let hour = ensemble.startTime; hour <= ensemble.endTime; hour++) {
                blocks[ensemble.day][hour].push({
                    id: ensemble._id,
                    teamId: ensemble.teamId,
                    teamName: hour === ensemble.startTime ? ensemble.teamName : '',
                    isExternal: ensemble.room === '외부',
                    isOneTime: ensemble.type === '일회성',
                    due: ensemble.due,
                    teamColorIdx: teamsData.findIndex(team => team.id === ensemble.teamId)
                });
            }
        });

        setEnsembles(blocks);
    }, [fetchData]);

    // Drawer의 open/close 관리 (모든 Drawer는 openedDrawers 배열 내에 자신의 drawId가 있으면 open로 판단)
    const openDrawer = (drawId) => {
        setOpenedDrawers([...openedDrawers, drawId]);
    };
    const onCloseDrawer = () => {
        setOpenedDrawers(openedDrawers.slice(0, -1));
    };

    // 초기화 함수
    const init = useCallback(async () => {
        const teamsData = await getTeams();
        getEnsembles(teamsData);
    }, [getEnsembles, getTeams]);

    return (
        <Context.Provider value={{ teams, setTeams, ensembles, setEnsembles, getTeams, getEnsembles, openedDrawers, openDrawer, onCloseDrawer, init }}>
            {children}
        </Context.Provider>
    );
}

function useCustomContext() {
    return useContext(Context);
}

export { ContextProvider, useCustomContext };
