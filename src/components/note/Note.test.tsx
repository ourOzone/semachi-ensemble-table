import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { url } from '@/constants';
import { mockInitialData } from '@/test/fixtures';
import { findEnabledButton } from '@/test/queries';
import { renderApp } from '@/test/render';
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
        await user.type(await screen.findByPlaceholderText('내용 여따 써요'), '새 한마디');
        await user.type(screen.getByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await findEnabledButton('완료 (일주일 후 삭제)'));

        expect(await screen.findByText('잘 등록했어요.')).toBeInTheDocument();
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
        const user = userEvent.setup();
        renderApp();

        const card = (await screen.findByText('메모입니다')).parentElement!;
        await user.click(within(card).getByRole('img', { name: 'close' }));
        await user.type(await screen.findByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await findEnabledButton('진짜 삭제해요'));

        expect(await screen.findByText('한마디를 삭제했어요.')).toBeInTheDocument();
        expect(pinBody).toEqual({ noteId: 'note-1', pin: '1234' });
        expect(new URL(deletedUrl).searchParams.get('id')).toBe('note-1');
    });
});
