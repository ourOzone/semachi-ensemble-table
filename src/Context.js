import React, { createContext, useState, useContext } from 'react';
import axios from 'axios';

const Context = createContext();

const getBlocks = () => {
    const blocks = [];
    for (let day = 0; day < 7; day++) {
        const col = [];
        for (let time = 0; time < 30; time++) {
            col.push([]);
        }
        blocks.push(col);
    }

    return blocks;
}

function ContextProvider({ children }) {
    const [teams, setTeams] = useState([]);
    const [ensembles, setEnsembles] = useState([]);

    const getTeamList = async () => {
        const { data } = await axios.get('https://us-central1-semachi.cloudfunctions.net/teams');
		const teamsData = data.map((team) => ({
            name: team.data.name,
            id: team.id
        }))
        setTeams(teamsData);
		return teamsData;
    }

    const getEnsembles = async (teamsData) => {
        const { data } = await axios.get('https://us-central1-semachi.cloudfunctions.net/ensembles');
        const blocks = getBlocks();

        data.forEach((ensemble) => {
            for (let hour = ensemble.data.startTime; hour <= ensemble.data.endTime; hour++) {
                blocks[ensemble.data.day][hour].push({
                    id: ensemble.id,
                    teamId: ensemble.data.teamId,
                    teamName: hour === ensemble.data.startTime ? ensemble.data.teamName : '',
                    isExternal: ensemble.data.room === '외부',
                    teamcoloridx: teamsData.map(team => team.id).indexOf(ensemble.data.teamId)
                });
            }
        });
        console.log(blocks)
        setEnsembles(blocks);
    };

	const init = async () => {
        const teamsData = await getTeamList();
		getEnsembles(teamsData);
	}

    return (
        <Context.Provider value={{ teams, setTeams, ensembles, setEnsembles, getTeamList, getEnsembles, init }}>
            {children}
        </Context.Provider>
    )
}

function useCustomContext() {
    return useContext(Context);
}

export { ContextProvider, useCustomContext };