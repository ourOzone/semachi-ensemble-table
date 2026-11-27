import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { url } from '@/constants';
import { mockInitialData } from '@/test/fixtures';
import { createTestQueryClient } from '@/test/render';
import { countOf, recordRequests } from '@/test/requests';
import { server } from '@/test/server';
import { useTeams } from './teams';
import {
    useAddNote,
    useAddNotice,
    useDeleteNote,
    useDeleteNotice,
    useNotes,
    useNotices,
} from './notes';

// 화면처럼 목록 조회 훅이 마운트된 상태에서 mutation을 실행한다 (다시 불러오기는 활성 query만 대상)
function useScreen() {
    return {
        notes: useNotes(),
        notices: useNotices(),
        teams: useTeams(),
        addNote: useAddNote(),
        deleteNote: useDeleteNote(),
        addNotice: useAddNotice(),
        deleteNotice: useDeleteNotice(),
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
    await waitFor(() => expect(result.current.notices).toHaveLength(1));
    await waitFor(() => expect(result.current.notes).toHaveLength(1));
    return { result, requests };
}

describe('한마디·공지 mutation 훅', () => {
    it('한마디 추가: POST /note 후 한마디 목록만 다시 불러온다', async () => {
        let body: unknown;
        server.use(
            http.post(`${url}/note`, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json({ id: 'note-2' });
            }),
        );
        const { result, requests } = await renderScreen();

        await act(() => result.current.addNote.mutateAsync({ text: '새 한마디', pin: '1234' }));

        expect(body).toEqual({ text: '새 한마디', pin: '1234' });
        await waitFor(() => expect(countOf(requests, 'GET /notes')).toBe(2));
        expect(countOf(requests, 'GET /notices')).toBe(1);
        expect(countOf(requests, 'GET /teams')).toBe(1);
    });

    it('한마디 추가 실패: 에러를 그대로 던지고 목록은 다시 불러오지 않는다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(http.post(`${url}/note`, () => new HttpResponse(null, { status: 400 })));
        const { result, requests } = await renderScreen();

        await expect(
            act(() => result.current.addNote.mutateAsync({ text: 'x', pin: '1234' })),
        ).rejects.toMatchObject({ response: { status: 400 } });

        // 다시 불러오기는 기다리지 않고 시작되므로, 잠시 뒤에도 요청이 없는지 본다
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(countOf(requests, 'GET /notes')).toBe(1);
    });

    it('한마디 삭제: 이미 삭제돼 404여도 목록을 다시 불러온다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(
            http.delete(`${url}/note`, () => HttpResponse.json({ id: -1 }, { status: 404 })),
        );
        const { result, requests } = await renderScreen();

        await expect(
            act(() => result.current.deleteNote.mutateAsync({ id: 'note-1', pin: '1234' })),
        ).rejects.toMatchObject({ response: { status: 404 } });

        await waitFor(() => expect(countOf(requests, 'GET /notes')).toBe(2));
        expect(countOf(requests, 'GET /teams')).toBe(1);
    });

    it('공지 추가: POST /notice({ content, pin }) 후 공지 목록만 다시 불러온다', async () => {
        let body: unknown;
        server.use(
            http.post(`${url}/notice`, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json({ message: 'Notice created', id: 'notice-2' });
            }),
        );
        const { result, requests } = await renderScreen();

        await act(() => result.current.addNotice.mutateAsync({ text: '새 공지', pin: '9999' }));

        expect(body).toEqual({ content: '새 공지', pin: '9999' });
        await waitFor(() => expect(countOf(requests, 'GET /notices')).toBe(2));
        expect(countOf(requests, 'GET /notes')).toBe(1);
    });

    it('공지 삭제: 성공하면 공지 목록만 다시 불러오고, 404여도 다시 불러온다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        let status = 200;
        server.use(
            http.delete(`${url}/notice`, () => HttpResponse.json({ message: 'ok' }, { status })),
        );
        const { result, requests } = await renderScreen();

        await act(() => result.current.deleteNotice.mutateAsync({ id: 'notice-1', pin: '9999' }));
        await waitFor(() => expect(countOf(requests, 'GET /notices')).toBe(2));

        status = 404;
        await expect(
            act(() => result.current.deleteNotice.mutateAsync({ id: 'notice-1', pin: '9999' })),
        ).rejects.toMatchObject({ response: { status: 404 } });
        await waitFor(() => expect(countOf(requests, 'GET /notices')).toBe(3));
        expect(countOf(requests, 'GET /notes')).toBe(1);
    });
});
