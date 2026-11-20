import { createContext, useState, useCallback, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { getTeams } from '@/api/team';
import { getEnsembles } from '@/api/ensemble';
import { getNotes } from '@/api/note';
import { getNotices } from '@/api/notice';
import { toBoard, toTeams } from '@/lib/board';
import { toNotes, toNotices } from '@/lib/notes';
import type { EnsembleBoard, Note, Notice, Team } from '@/types';

export interface FetchContextValue {
    /** 소모임·회의(eventIds)를 제외한 팀 목록 */
    teams: Team[];
    /** 합주표. 첫 fetch 전에는 빈 배열 */
    ensembles: EnsembleBoard;
    notes: Note[];
    notices: Notice[];
    /** 화면 전체 데이터를 다시 불러온다 */
    fetchData: () => Promise<void>;
}

const FetchContext = createContext<FetchContextValue | null>(null);

interface FetchContextProviderProps {
    children: ReactNode;
}

function FetchContextProvider({ children }: FetchContextProviderProps) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [ensembles, setEnsembles] = useState<EnsembleBoard>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [notices, setNotices] = useState<Notice[]>([]);

    // 화면 전체 fetching 하는 함수 (정제 로직은 lib/board·lib/notes)
    const fetchData = useCallback(async () => {
        // teams fetch (소모임 및 회의는 제거)
        const teamsData = toTeams(await getTeams());
        setTeams(teamsData);

        // ensembles fetch → 7 x 30 합주표
        const ensemblesRaw = await getEnsembles();
        setEnsembles(toBoard(teamsData, ensemblesRaw, dayjs()));

        // notes fetch
        setNotes(toNotes(await getNotes()));

        // notices fetch
        setNotices(toNotices(await getNotices()));
    }, []);

    return (
        <FetchContext.Provider value={{ teams, ensembles, notes, notices, fetchData }}>
            {children}
        </FetchContext.Provider>
    );
}

export { FetchContextProvider, FetchContext };
