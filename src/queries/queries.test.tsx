import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import { act, renderHook, waitFor } from '@testing-library/react';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventIds, url } from '@/constants';
import { createQueryClient } from '@/lib/queryClient';
import theme from '@/styles/theme';
import { ensembles, mockInitialData, notes, notices, teams } from '@/test/fixtures';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';
import { useBoardSchedule } from './ensembles';
import { useNotes, useNotices } from './notes';
import { useTeams } from './teams';

function wrapperWith(queryClient: QueryClient) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

/**
 * 합주판 한 날짜: fixtures의 매주 월요일 반복 합주(11/23부터, 시간칸 2~3)가 보이는 먼 월요일.
 * 실제 오늘과 관계없이 그 합주가 보인다 (다음 날짜 이후의 그 요일은 언제나 "합주")
 */
const MONDAY = [dayjs('2027-03-01')];

/** 화면이 쓰는 조회 훅 전체 */
function useAll() {
    return {
        teams: useTeams(),
        schedule: useBoardSchedule(MONDAY),
        notes: useNotes(),
        notices: useNotices(),
    };
}

/** 각 목록 API가 몇 번 요청됐는지 센다 */
function countRequests() {
    const counts: Record<string, number> = { teams: 0, ensembles: 0, notes: 0, notices: 0 };
    server.events.on('request:start', ({ request }) => {
        const name = new URL(request.url).pathname.slice(1);
        if (name in counts) counts[name]!++;
    });
    return counts;
}

describe('조회 훅 (TanStack Query)', () => {
    afterEach(() => {
        server.events.removeAllListeners();
    });

    it('불러오기 전에는 빈 배열, 불러오면 화면용 데이터로 바꿔 준다 (소모임·회의 제외)', async () => {
        server.use(
            http.get(`${url}/teams`, () =>
                HttpResponse.json([...teams, { ...teams[0]!, _id: eventIds[0]!, name: '보소' }]),
            ),
            http.get(`${url}/ensembles`, () => HttpResponse.json(ensembles)),
            http.get(`${url}/notes`, () => HttpResponse.json(notes)),
            http.get(`${url}/notices`, () => HttpResponse.json(notices)),
        );
        const { result } = renderHook(useAll, { wrapper: wrapperWith(createTestQueryClient()) });

        expect(result.current.teams).toEqual([]);
        expect(result.current.schedule).toEqual([[]]);

        await waitFor(() => expect(result.current.notices).toHaveLength(1));
        await waitFor(() => expect(result.current.schedule[0]).toHaveLength(1));
        expect(result.current.teams.map((t) => t.id)).toEqual(['team-1']);
        expect(result.current.schedule[0]![0]).toMatchObject({
            id: 'ensemble-1',
            color: theme.teamColors[0],
            startTime: 2,
        });
        expect(result.current.notes).toEqual([{ id: 'note-1', text: '메모입니다' }]);
        expect(result.current.notices).toEqual([{ id: 'notice-1', text: '첫 공지\n둘째 줄' }]);
    });

    // P1: 이전 fetchData는 4개 API를 하나씩 순서대로 기다렸다
    it('4개 목록을 병렬로 요청한다', async () => {
        const started: string[] = [];
        let releaseAll!: () => void;
        const allStarted = new Promise<void>((resolve) => (releaseAll = resolve));
        // 4개가 모두 요청될 때까지 응답을 보내지 않는다. 순서대로 요청하면 첫 요청에서 멈춰 시간 초과로 실패한다
        const gated = (name: string, body: JsonBodyType) =>
            http.get(`${url}/${name}`, async () => {
                started.push(name);
                if (started.length === 4) releaseAll();
                await allStarted;
                return HttpResponse.json(body);
            });
        server.use(
            gated('teams', teams),
            gated('ensembles', ensembles),
            gated('notes', notes),
            gated('notices', notices),
        );
        const { result } = renderHook(useAll, { wrapper: wrapperWith(createTestQueryClient()) });

        await waitFor(() => expect(result.current.schedule[0]).toHaveLength(1), { timeout: 3000 });
        expect(started.sort()).toEqual(['ensembles', 'notes', 'notices', 'teams']);
    });

    it('합주표는 팀 목록까지 불러온 뒤에 만든다 (팀 색상이 팀 순서로 정해지므로)', async () => {
        let releaseTeams!: () => void;
        const teamsGate = new Promise<void>((resolve) => (releaseTeams = resolve));
        mockInitialData();
        server.use(
            http.get(`${url}/teams`, async () => {
                await teamsGate;
                return HttpResponse.json(teams);
            }),
        );
        const { result } = renderHook(useAll, { wrapper: wrapperWith(createTestQueryClient()) });

        await waitFor(() => expect(result.current.notes).toHaveLength(1)); // 다른 목록은 이미 도착
        expect(result.current.schedule).toEqual([[]]);

        releaseTeams();
        await waitFor(() => expect(result.current.schedule[0]).toHaveLength(1));
        expect(result.current.schedule[0]![0]!.color).toBe(theme.teamColors[0]);
    });

    describe('앱 기본값 (createQueryClient, 사전 결정 3)', () => {
        it('탭으로 돌아오면 다시 불러온다', async () => {
            mockInitialData();
            const counts = countRequests();
            const { result, unmount } = renderHook(useNotes, {
                wrapper: wrapperWith(createQueryClient()),
            });
            await waitFor(() => expect(result.current).toHaveLength(1));

            act(() => focusManager.setFocused(false));
            act(() => focusManager.setFocused(true));

            await waitFor(() => expect(counts.notes).toBe(2));
            // 포커스 상태를 되돌리기 전에 먼저 언마운트한다. 마운트된 채로 되돌리면 다시 불러오기가 한 번 더 일어나
            // 그 요청이 다음 테스트의 요청 수에 섞인다
            unmount();
            focusManager.setFocused(undefined);
        });

        it('조회가 실패하면 한 번만 다시 시도한다', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const counts = countRequests();
            server.use(http.get(`${url}/notes`, () => new HttpResponse(null, { status: 500 })));
            const queryClient = createQueryClient();
            renderHook(useNotes, { wrapper: wrapperWith(queryClient) });

            await waitFor(
                () => expect(queryClient.getQueryState(['notes'])?.status).toBe('error'),
                { timeout: 5000 },
            );
            expect(counts.notes).toBe(2);
        });
    });
});
