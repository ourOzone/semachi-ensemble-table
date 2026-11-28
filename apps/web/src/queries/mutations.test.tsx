import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { url } from '@/constants';
import { mockInitialData } from '@/test/fixtures';
import { createTestQueryClient } from '@/test/render';
import { countOf, recordRequests } from '@/test/requests';
import { server } from '@/test/server';
import type { EnsembleUpdateRequest } from '@/types';
import {
    useAddEnsemble,
    useBoardSchedule,
    useDeleteEnsemble,
    useUpdateEnsemble,
} from './ensembles';
import { useNotes } from './notes';
import { useAddTeam, useDeleteTeam, useTeams, useUpdateTeam } from './teams';

/** 합주판 한 날짜 (fixtures의 월요일 반복 합주가 보이는 먼 월요일) */
const MONDAY = [dayjs('2027-03-01')];

// 화면처럼 목록 조회 훅이 마운트된 상태에서 mutation을 실행한다 (다시 불러오기는 활성 query만 대상)
function useScreen() {
    return {
        teams: useTeams(),
        schedule: useBoardSchedule(MONDAY),
        notes: useNotes(),
        addTeam: useAddTeam(),
        updateTeam: useUpdateTeam(),
        deleteTeam: useDeleteTeam(),
        addEnsemble: useAddEnsemble(),
        updateEnsemble: useUpdateEnsemble(),
        deleteEnsemble: useDeleteEnsemble(),
    };
}

async function renderScreen() {
    mockInitialData();
    const requests = recordRequests();
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(useScreen, { wrapper });
    await waitFor(() => expect(result.current.schedule[0]).toHaveLength(1));
    await waitFor(() => expect(result.current.notes).toHaveLength(1));
    return { result, requests };
}

/** 4개 목록 각각을 몇 번 불러왔는지 (처음 불러오기 포함) */
const loads = (requests: string[]) => ({
    teams: countOf(requests, 'GET /teams'),
    ensembles: countOf(requests, 'GET /ensembles'),
    notes: countOf(requests, 'GET /notes'),
});

const ensembleRequest: EnsembleUpdateRequest = {
    teamId: 'team-1',
    repeat: true,
    nextDate: dayjs('2026-11-27'),
    startTime: 2,
    endTime: 3,
    due: '2099-12-31',
};

describe('팀·합주 mutation 훅: 영향을 받는 목록만 다시 불러온다 (이전: 4개 목록 전체)', () => {
    it('팀 추가 → 팀 목록만', async () => {
        server.use(http.post(`${url}/teams`, () => HttpResponse.json({ id: 'team-2' })));
        const { result, requests } = await renderScreen();

        await act(() =>
            result.current.addTeam.mutateAsync({
                type: '기타 등등',
                name: '새밴드',
                desc: ['', '', '', '', '', '', ''],
                pin: '1234',
                publishDate: dayjs(),
                due: '2099-12-31',
            }),
        );

        await waitFor(() => expect(loads(requests).teams).toBe(2));
        expect(loads(requests)).toEqual({ teams: 2, ensembles: 1, notes: 1 });
    });

    it('팀 수정 → 팀·합주 목록 (서버가 합주의 teamName도 바꾼다). PUT /teams/:id', async () => {
        let putUrl = '';
        let body: unknown;
        server.use(
            http.put(`${url}/teams/:id`, async ({ request }) => {
                putUrl = request.url;
                body = await request.json();
                return HttpResponse.json({ id: 'team-1' });
            }),
        );
        const { result, requests } = await renderScreen();

        await act(() =>
            result.current.updateTeam.mutateAsync({
                pin: '1234',
                id: 'team-1',
                type: '기타 등등',
                name: '바뀐밴드',
                desc: ['', '', '', '', '', '', ''],
                due: '2099-12-31',
            }),
        );

        expect(new URL(putUrl).pathname.split('/').pop()).toBe('team-1');
        expect(body).toEqual({
            type: '기타 등등',
            name: '바뀐밴드',
            desc: ['', '', '', '', '', '', ''],
            due: '2099-12-31',
            pin: '1234',
        });
        await waitFor(() => expect(loads(requests)).toEqual({ teams: 2, ensembles: 2, notes: 1 }));
    });

    it('팀 삭제 → 404(이미 삭제됨)여도 팀·합주 목록 (팀 삭제는 합주도 지운다)', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(
            http.delete(`${url}/teams/:id`, () => HttpResponse.json({ id: -1 }, { status: 404 })),
        );
        const { result, requests } = await renderScreen();

        await expect(
            act(() => result.current.deleteTeam.mutateAsync({ id: 'team-1', pin: '1234' })),
        ).rejects.toMatchObject({ response: { status: 404 } });

        await waitFor(() => expect(loads(requests)).toEqual({ teams: 2, ensembles: 2, notes: 1 }));
    });

    it('합주 추가 → 합주 목록만. 실패하면 다시 불러오지 않는다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        let status = 200;
        server.use(
            http.post(`${url}/ensembles`, () =>
                HttpResponse.json({ id: 'ensemble-2' }, { status }),
            ),
        );
        const { result, requests } = await renderScreen();

        await act(() =>
            result.current.addEnsemble.mutateAsync({
                ...ensembleRequest,
                pin: '1234',
            }),
        );
        await waitFor(() => expect(loads(requests).ensembles).toBe(2));

        status = 500;
        await expect(
            act(() =>
                result.current.addEnsemble.mutateAsync({
                    ...ensembleRequest,
                    pin: '1234',
                }),
            ),
        ).rejects.toMatchObject({ response: { status: 500 } });
        // 다시 불러오기는 기다리지 않고 시작되므로, 잠시 뒤에도 요청이 없는지 본다
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(loads(requests)).toEqual({ teams: 1, ensembles: 2, notes: 1 });
    });

    it('합주 수정 → 합주 목록만. PUT /ensembles/:id', async () => {
        let putUrl = '';
        server.use(
            http.put(`${url}/ensembles/:id`, ({ request }) => {
                putUrl = request.url;
                return HttpResponse.json({ id: 'ensemble-1', message: 'ok' });
            }),
        );
        const { result, requests } = await renderScreen();

        await act(() =>
            result.current.updateEnsemble.mutateAsync({
                id: 'ensemble-1',
                pin: '1234',
                ...ensembleRequest,
            }),
        );

        expect(new URL(putUrl).pathname.split('/').pop()).toBe('ensemble-1');
        await waitFor(() => expect(loads(requests).ensembles).toBe(2));
        expect(loads(requests)).toEqual({ teams: 1, ensembles: 2, notes: 1 });
    });

    it('합주 삭제 → 404(이미 삭제됨)여도 합주 목록만', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(
            http.delete(`${url}/ensembles/:id`, () =>
                HttpResponse.json({ id: -1 }, { status: 404 }),
            ),
        );
        const { result, requests } = await renderScreen();

        await expect(
            act(() => result.current.deleteEnsemble.mutateAsync({ id: 'ensemble-1', pin: '1234' })),
        ).rejects.toMatchObject({ response: { status: 404 } });

        await waitFor(() => expect(loads(requests).ensembles).toBe(2));
        expect(loads(requests)).toEqual({ teams: 1, ensembles: 2, notes: 1 });
    });
});
