import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { url } from '@/constants';
import { mockInitialData } from '@/test/fixtures';
import { findEnabledButton } from '@/test/queries';
import { renderApp } from '@/test/render';
import { countOf, recordRequests } from '@/test/requests';
import { server } from '@/test/server';

// 한마디(메모) 기능 흐름 테스트: 추가 / 삭제 Drawer, PIN, 서버 요청 내용까지 확인한다.

describe('한마디', () => {
    beforeEach(() => {
        mockInitialData();
    });

    it('내용과 PIN 4자리를 입력하면 등록하고, 서버에 text와 pin을 보낸다', async () => {
        let posted: unknown;
        server.use(
            http.post(`${url}/note`, async ({ request }) => {
                posted = await request.json();
                return HttpResponse.json({ id: 'note-2' });
            }),
        );
        const user = userEvent.setup();
        renderApp();

        await user.click(await screen.findByRole('button', { name: /멋진 한마디 남겨요/ }));
        // Drawer는 열림 애니메이션 뒤 내용 칸으로 포커스를 옮긴다. 그 전에 입력을 시작하면 PIN 입력 도중 포커스가
        // 내용 칸으로 되돌아갈 수 있어(ISSUES V7, 팀 추가 PIN 단계와 같은 구조), 포커스가 옮겨진 뒤 입력한다
        const contentInput = await screen.findByPlaceholderText('내용 여따 써요');
        await waitFor(() => expect(contentInput).toHaveFocus());
        await user.type(contentInput, '새 한마디');
        await user.type(screen.getByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await findEnabledButton('완료 (일주일 후 삭제)'));

        // 알림 기능 삭제로 완료 알림 대신 서버 요청을 기다린다
        await waitFor(() => expect(posted).toBeDefined());
        expect(posted).toEqual({ text: '새 한마디', pin: '1234' });
    });

    it('PIN이 맞으면 한마디를 삭제한다', async () => {
        let pinBody: unknown;
        let deletedUrl = '';
        server.use(
            http.get(`${url}/note/:id`, () => HttpResponse.json(true)),
            http.post(`${url}/check-note-pin`, async ({ request }) => {
                pinBody = await request.json();
                return HttpResponse.json(true);
            }),
            http.delete(`${url}/note`, ({ request }) => {
                deletedUrl = request.url;
                return HttpResponse.json({ id: 'note-1' });
            }),
        );
        const requests = recordRequests();
        const user = userEvent.setup();
        renderApp();

        const card = (await screen.findByText('메모입니다')).parentElement!;
        await user.click(within(card).getByRole('img', { name: 'close' }));
        await user.type(await screen.findByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await findEnabledButton('진짜 삭제해요'));

        // 알림 기능 삭제로 완료 알림 대신 서버 요청을 기다린다
        await waitFor(() => expect(deletedUrl).not.toBe(''));
        expect(pinBody).toEqual({ noteId: 'note-1', pin: '1234' });
        expect(new URL(deletedUrl).searchParams.get('id')).toBe('note-1');
        // 존재 확인은 PIN Drawer에서 한 번만 (이전: X 클릭·PIN 입력·삭제 직전 3회, 사전 결정 5)
        expect(countOf(requests, 'GET /note/note-1')).toBe(1);
        // 삭제 후에는 한마디 목록만 다시 불러온다 (이전: 4개 목록 전체)
        await waitFor(() => expect(countOf(requests, 'GET /notes')).toBe(2));
        expect(countOf(requests, 'GET /teams')).toBe(1);
    });
});
