import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { url } from '@/constants/index';
import { mockInitialData } from '@/test/fixtures';
import { findDialog } from '@/test/queries';
import { renderApp } from '@/test/render';
import { countOf, recordRequests } from '@/test/requests';
import { server } from '@/test/server';
import { useDrawerStore } from '@/stores/drawer';

// 날적이 흐름 테스트 (View 개편 V-4): 남기기 / 삭제 Drawer, PIN, 알림, 서버 요청 내용까지 확인한다.

/** 날적이 카드 (삭제 버튼이 있는 li) */
const findCard = async (text: string) => (await screen.findByText(text)).closest('li')!;

async function writeNote(user: ReturnType<typeof userEvent.setup>, text: string) {
    await user.click(await screen.findByRole('button', { name: '날적이 남기기' }));
    const drawer = within(await findDialog('날적이 남기기'));
    await user.type(drawer.getByLabelText('날적이'), text);
    return drawer;
}

describe('날적이', () => {
    beforeEach(() => {
        mockInitialData();
    });

    it('글 → 다음 → PIN → 남기기: 서버에 앞뒤 공백을 뺀 text와 pin을 보내고, 닫고 알린다', async () => {
        let posted: unknown;
        server.use(
            http.post(`${url}/note`, async ({ request }) => {
                posted = await request.json();
                return HttpResponse.json({ id: 'note-2' });
            }),
        );
        const user = userEvent.setup();
        renderApp();

        const drawer = await writeNote(user, '  새 날적이 ');
        await user.click(drawer.getByRole('button', { name: '다음' }));
        const pinDrawer = within(await findDialog('PIN을 정해 주세요'));
        const submit = pinDrawer.getByRole('button', { name: '남기기' });
        expect(submit).toBeDisabled();
        await user.type(pinDrawer.getByLabelText('PIN 4자리'), '1234');
        await user.click(submit);

        expect(await screen.findByText('날적이를 남겼어요.')).toBeInTheDocument();
        expect(posted).toEqual({ text: '새 날적이', pin: '1234' });
        expect(useDrawerStore.getState().openedDrawers).toEqual([]);
    });

    it('공백·줄바꿈만 있으면 다음으로 갈 수 없다', async () => {
        const user = userEvent.setup();
        renderApp();

        const drawer = await writeNote(user, '   {Enter}  ');
        expect(drawer.getByRole('button', { name: '내용을 써 주세요' })).toBeDisabled();
    });

    it('저장에 실패하면 알리고 PIN 단계에 머문다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(http.post(`${url}/note`, () => new HttpResponse(null, { status: 500 })));
        const user = userEvent.setup();
        renderApp();

        const drawer = await writeNote(user, '새 날적이');
        await user.click(drawer.getByRole('button', { name: '다음' }));
        const pinDrawer = within(await findDialog('PIN을 정해 주세요'));
        await user.type(pinDrawer.getByLabelText('PIN 4자리'), '1234');
        await user.click(pinDrawer.getByRole('button', { name: '남기기' }));
        expect(
            await screen.findByText('저장하지 못했어요. 잠시 후 다시 시도해 주세요.'),
        ).toBeInTheDocument();
        expect(useDrawerStore.getState().openedDrawers).toEqual(['addNote']);
    });

    it('제목 옆 물음표를 누르면 날적이 설명 말풍선', async () => {
        const user = userEvent.setup();
        renderApp();

        await user.click(await screen.findByRole('button', { name: '날적이란?' }));
        expect(
            await screen.findByText(/날적이\(날마다 적는 이야기\)는 매년 초 동방에/),
        ).toBeInTheDocument();
    });

    it('X → PIN이 맞으면 삭제하기: 서버에 삭제를 보내고 알린다', async () => {
        let pinBody: unknown;
        let deletedUrl = '';
        let deletedBody: unknown;
        server.use(
            http.get(`${url}/note/:id`, () => HttpResponse.json(true)),
            http.post(`${url}/check-note-pin`, async ({ request }) => {
                pinBody = await request.json();
                return HttpResponse.json(true);
            }),
            http.delete(`${url}/note`, async ({ request }) => {
                deletedUrl = request.url;
                deletedBody = await request.json();
                return HttpResponse.json({ id: 'note-1' });
            }),
        );
        const requests = recordRequests();
        const user = userEvent.setup();
        renderApp();

        await user.click(
            within(await findCard('메모입니다')).getByRole('button', { name: '날적이 삭제' }),
        );
        const drawer = within(await findDialog('날적이를 삭제할까요?'));
        await user.type(drawer.getByLabelText('PIN 4자리'), '1234');
        await waitFor(() => expect(drawer.getByRole('button', { name: '삭제하기' })).toBeEnabled());
        await user.click(drawer.getByRole('button', { name: '삭제하기' }));

        expect(await screen.findByText('삭제했어요.')).toBeInTheDocument();
        expect(pinBody).toEqual({ noteId: 'note-1', pin: '1234' });
        expect(new URL(deletedUrl).searchParams.get('id')).toBe('note-1');
        // PIN 단계에서 맞은 PIN을 삭제 요청에도 담는다 (서버가 다시 확인, 백엔드 개편 B-6)
        expect(deletedBody).toEqual({ pin: '1234' });
        // 존재 확인은 X를 누를 때 한 번
        expect(countOf(requests, 'GET /note/note-1')).toBe(1);
        // 삭제 후에는 날적이 목록만 다시 불러온다
        await waitFor(() => expect(countOf(requests, 'GET /notes')).toBe(2));
        expect(countOf(requests, 'GET /teams')).toBe(1);
    });

    it('X를 눌렀는데 이미 삭제됐으면 알리고 Drawer를 열지 않는다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(http.get(`${url}/note/:id`, () => new HttpResponse(null, { status: 404 })));
        const user = userEvent.setup();
        renderApp();

        await user.click(
            within(await findCard('메모입니다')).getByRole('button', { name: '날적이 삭제' }),
        );

        expect(await screen.findByText('이미 삭제된 날적이예요.')).toBeInTheDocument();
        expect(useDrawerStore.getState().openedDrawers).toEqual([]);
    });

    it('작성 시각(초까지)·링크를 보여 주고, 6개가 넘으면 "전체 보기"로 펼친다', async () => {
        // 0x69270000 = 2025-11-26 22:26:24 (서울)
        const many = Array.from({ length: 8 }, (_, idx) => ({
            _id: `6927000${idx}aaaaaaaaaaaaaaaa`,
            text: idx === 0 ? '자료는 https://example.com/a. 여기' : `날적이 ${idx}`,
        }));
        server.use(http.get(`${url}/notes`, () => HttpResponse.json(many)));
        const user = userEvent.setup();
        renderApp();

        const link = await screen.findByRole('link', { name: 'https://example.com/a' });
        expect(link).toHaveAttribute('href', 'https://example.com/a');
        expect(link).toHaveAttribute('target', '_blank');
        expect(within(link.closest('li')!).getByText('2025.11.26 22:26:24')).toBeInTheDocument();

        expect(screen.queryByText('날적이 6')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '전체 보기 (8개)' }));
        expect(screen.getByText('날적이 7')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '접기' }));
        expect(screen.queryByText('날적이 6')).not.toBeInTheDocument();
    });
});
