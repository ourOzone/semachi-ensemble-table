import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { url } from '@/constants';
import { mockInitialData } from '@/test/fixtures';
import { findDialog } from '@/test/queries';
import { renderApp } from '@/test/render';
import { countOf, recordRequests } from '@/test/requests';
import { server } from '@/test/server';
import { useDrawerStore } from '@/stores/drawer';

// 한마디 흐름 테스트 (View 개편 V-4): 남기기 / 삭제 Drawer, PIN, 알림, 서버 요청 내용까지 확인한다.

/** 한마디 카드 (삭제 버튼이 있는 li) */
const findCard = async (text: string) => (await screen.findByText(text)).closest('li')!;

async function writeNote(user: ReturnType<typeof userEvent.setup>, text: string) {
    await user.click(await screen.findByRole('button', { name: '한마디 남기기' }));
    const drawer = within(await findDialog('한마디 남기기'));
    await user.type(drawer.getByLabelText('한마디'), text);
    return drawer;
}

describe('한마디', () => {
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

        const drawer = await writeNote(user, '  새 한마디 ');
        await user.click(drawer.getByRole('button', { name: '다음' }));
        const pinDrawer = within(await findDialog('PIN을 정해 주세요'));
        const submit = pinDrawer.getByRole('button', { name: '남기기' });
        expect(submit).toBeDisabled();
        await user.type(pinDrawer.getByLabelText('PIN 4자리'), '1234');
        await user.click(submit);

        expect(await screen.findByText('한마디를 남겼어요.')).toBeInTheDocument();
        expect(posted).toEqual({ text: '새 한마디', pin: '1234' });
        expect(useDrawerStore.getState().openedDrawers).toEqual([]);
    });

    it('공백·줄바꿈만 있으면 다음으로 갈 수 없다', async () => {
        const user = userEvent.setup();
        renderApp();

        const drawer = await writeNote(user, '   {Enter}  ');
        expect(drawer.getByRole('button', { name: '내용을 써 주세요' })).toBeDisabled();
    });

    it('한마디가 가득 차면(400 Note limit exceeded) 전용 알림, 그 밖의 실패는 저장 실패 알림. PIN 단계에 머문다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        let full = true;
        server.use(
            http.post(`${url}/note`, () =>
                full
                    ? new HttpResponse('Note limit exceeded', { status: 400 })
                    : new HttpResponse(null, { status: 500 }),
            ),
        );
        const user = userEvent.setup();
        renderApp();

        const drawer = await writeNote(user, '새 한마디');
        await user.click(drawer.getByRole('button', { name: '다음' }));
        const pinDrawer = within(await findDialog('PIN을 정해 주세요'));
        await user.type(pinDrawer.getByLabelText('PIN 4자리'), '1234');
        await user.click(pinDrawer.getByRole('button', { name: '남기기' }));
        expect(
            await screen.findByText('한마디가 가득 찼어요. 며칠 뒤 다시 남겨 주세요.'),
        ).toBeInTheDocument();
        expect(useDrawerStore.getState().openedDrawers).toEqual(['addNote']);

        full = false;
        await user.type(pinDrawer.getByLabelText('PIN 4자리'), '1234');
        await user.click(pinDrawer.getByRole('button', { name: '남기기' }));
        expect(
            await screen.findByText('저장하지 못했어요. 잠시 후 다시 시도해 주세요.'),
        ).toBeInTheDocument();
        expect(useDrawerStore.getState().openedDrawers).toEqual(['addNote']);
    });

    it('X → PIN이 맞으면 삭제하기: 서버에 삭제를 보내고 알린다', async () => {
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

        await user.click(
            within(await findCard('메모입니다')).getByRole('button', { name: '한마디 삭제' }),
        );
        const drawer = within(await findDialog('한마디를 삭제할까요?'));
        await user.type(drawer.getByLabelText('PIN 4자리'), '1234');
        await waitFor(() => expect(drawer.getByRole('button', { name: '삭제하기' })).toBeEnabled());
        await user.click(drawer.getByRole('button', { name: '삭제하기' }));

        expect(await screen.findByText('삭제했어요.')).toBeInTheDocument();
        expect(pinBody).toEqual({ noteId: 'note-1', pin: '1234' });
        expect(new URL(deletedUrl).searchParams.get('id')).toBe('note-1');
        // 존재 확인은 X를 누를 때 한 번
        expect(countOf(requests, 'GET /note/note-1')).toBe(1);
        // 삭제 후에는 한마디 목록만 다시 불러온다
        await waitFor(() => expect(countOf(requests, 'GET /notes')).toBe(2));
        expect(countOf(requests, 'GET /teams')).toBe(1);
    });

    it('X를 눌렀는데 이미 삭제됐으면 알리고 Drawer를 열지 않는다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(http.get(`${url}/note/:id`, () => new HttpResponse(null, { status: 404 })));
        const user = userEvent.setup();
        renderApp();

        await user.click(
            within(await findCard('메모입니다')).getByRole('button', { name: '한마디 삭제' }),
        );

        expect(await screen.findByText('이미 삭제된 한마디예요.')).toBeInTheDocument();
        expect(useDrawerStore.getState().openedDrawers).toEqual([]);
    });

    it('작성 시각(초까지)·링크를 보여 주고, 6개가 넘으면 "전체 보기"로 펼친다', async () => {
        // 0x69270000 = 2025-11-26 22:26:24 (서울)
        const many = Array.from({ length: 8 }, (_, idx) => ({
            _id: `6927000${idx}aaaaaaaaaaaaaaaa`,
            text: idx === 0 ? '자료는 https://example.com/a. 여기' : `한마디 ${idx}`,
        }));
        server.use(http.get(`${url}/notes`, () => HttpResponse.json(many)));
        const user = userEvent.setup();
        renderApp();

        const link = await screen.findByRole('link', { name: 'https://example.com/a' });
        expect(link).toHaveAttribute('href', 'https://example.com/a');
        expect(link).toHaveAttribute('target', '_blank');
        expect(within(link.closest('li')!).getByText('2025.11.26 22:26:24')).toBeInTheDocument();

        expect(screen.queryByText('한마디 6')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '전체 보기 (8개)' }));
        expect(screen.getByText('한마디 7')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '접기' }));
        expect(screen.queryByText('한마디 6')).not.toBeInTheDocument();
    });
});
