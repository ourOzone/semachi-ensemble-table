import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { url } from '@/constants/index';
import { useDrawerStore } from '@/stores/drawer';
import { mockInitialData } from '@/test/fixtures';
import { findDialog } from '@/test/queries';
import { renderApp } from '@/test/render';
import { countOf, recordRequests } from '@/test/requests';
import { server } from '@/test/server';

// 공지 흐름 테스트 (View 개편 V-5): 공지 Drawer 하나에서 목록 → 올리기(관리자 PIN → 글) / 삭제(PIN), 알림, 서버 요청

async function openNoticeDrawer() {
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole('button', { name: /첫 공지/ }));
    const drawer = within(await findDialog('공지'));
    return { user, drawer };
}

describe('공지', () => {
    beforeEach(() => {
        mockInitialData();
    });

    it('목록에 공지 전체(여러 줄)를 보여 준다', async () => {
        const { drawer } = await openNoticeDrawer();
        expect(drawer.getByText(/첫 공지\s+둘째 줄/)).toBeInTheDocument();
    });

    it('올리기: 관리자 PIN이 맞으면 글쓰기로, 올리면 서버에 내용(content)만 보내고 알린 뒤 목록으로', async () => {
        let posted: unknown;
        let pinBody: unknown;
        server.use(
            http.post(`${url}/check-notice-pin`, async ({ request }) => {
                pinBody = await request.json();
                return HttpResponse.json(true);
            }),
            http.post(`${url}/notice`, async ({ request }) => {
                posted = await request.json();
                return HttpResponse.json({ message: 'Notice created', id: 'notice-2' });
            }),
        );
        const { user, drawer } = await openNoticeDrawer();

        await user.click(drawer.getByRole('button', { name: '공지 올리기 (관리자)' }));
        const pinDrawer = within(await findDialog('공지를 올릴까요?'));
        await user.type(pinDrawer.getByLabelText('PIN 4자리'), '1234');
        const writeDrawer = within(await findDialog('공지 올리기'));
        expect(writeDrawer.getByRole('button', { name: '내용을 써 주세요' })).toBeDisabled();
        await user.type(writeDrawer.getByLabelText('공지 내용'), ' 새 공지 ');
        await user.click(writeDrawer.getByRole('button', { name: '올리기' }));

        expect(await screen.findByText('공지를 올렸어요.')).toBeInTheDocument();
        expect(pinBody).toEqual({ pin: '1234' });
        expect(posted).toEqual({ content: '새 공지' });
        expect(await findDialog('공지')).toBeInTheDocument();
    });

    it('관리자 PIN이 틀리면 글쓰기로 넘어가지 않는다', async () => {
        server.use(http.post(`${url}/check-notice-pin`, () => HttpResponse.json(false)));
        const { user, drawer } = await openNoticeDrawer();

        await user.click(drawer.getByRole('button', { name: '공지 올리기 (관리자)' }));
        const pinDrawer = within(await findDialog('공지를 올릴까요?'));
        await user.type(pinDrawer.getByLabelText('PIN 4자리'), '0000');

        expect(
            await pinDrawer.findByText('PIN이 맞지 않아요. 다시 입력해 주세요'),
        ).toBeInTheDocument();
        expect(screen.queryByLabelText('공지 내용')).not.toBeInTheDocument();
    });

    it('올리기에 실패하면 알리고 글쓰기에 머문다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(
            http.post(`${url}/check-notice-pin`, () => HttpResponse.json(true)),
            http.post(`${url}/notice`, () => new HttpResponse(null, { status: 500 })),
        );
        const { user, drawer } = await openNoticeDrawer();

        await user.click(drawer.getByRole('button', { name: '공지 올리기 (관리자)' }));
        await user.type(
            within(await findDialog('공지를 올릴까요?')).getByLabelText('PIN 4자리'),
            '1234',
        );
        const writeDrawer = within(await findDialog('공지 올리기'));
        await user.type(writeDrawer.getByLabelText('공지 내용'), '새 공지');
        await user.click(writeDrawer.getByRole('button', { name: '올리기' }));

        expect(
            await screen.findByText('저장하지 못했어요. 잠시 후 다시 시도해 주세요.'),
        ).toBeInTheDocument();
        expect(writeDrawer.getByLabelText('공지 내용')).toHaveValue('새 공지');
    });

    it('삭제: X → 관리자 PIN → 삭제하기, 알리고 목록으로. 공지 목록만 다시 불러온다', async () => {
        let deletedUrl = '';
        server.use(
            http.get(`${url}/notice/:id`, () => HttpResponse.json(true)),
            http.post(`${url}/check-notice-pin`, () => HttpResponse.json(true)),
            http.delete(`${url}/notice`, ({ request }) => {
                deletedUrl = request.url;
                return HttpResponse.json({ message: 'Notice deleted successfully' });
            }),
        );
        const requests = recordRequests();
        const { user, drawer } = await openNoticeDrawer();

        await user.click(drawer.getByRole('button', { name: '공지 삭제' }));
        const pinDrawer = within(await findDialog('공지를 삭제할까요?'));
        await user.type(pinDrawer.getByLabelText('PIN 4자리'), '1234');
        await waitFor(() =>
            expect(pinDrawer.getByRole('button', { name: '삭제하기' })).toBeEnabled(),
        );
        await user.click(pinDrawer.getByRole('button', { name: '삭제하기' }));

        expect(await screen.findByText('삭제했어요.')).toBeInTheDocument();
        expect(new URL(deletedUrl).searchParams.get('id')).toBe('notice-1');
        expect(await findDialog('공지')).toBeInTheDocument();
        // 존재 확인은 X를 누를 때 한 번
        expect(countOf(requests, 'GET /notice/notice-1')).toBe(1);
        await waitFor(() => expect(countOf(requests, 'GET /notices')).toBe(2));
        expect(countOf(requests, 'GET /teams')).toBe(1);
    });

    it('X를 눌렀는데 이미 삭제됐으면 알리고 목록에 머문다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(http.get(`${url}/notice/:id`, () => new HttpResponse(null, { status: 404 })));
        const { user, drawer } = await openNoticeDrawer();

        await user.click(drawer.getByRole('button', { name: '공지 삭제' }));

        expect(await screen.findByText('이미 삭제된 공지예요.')).toBeInTheDocument();
        expect(useDrawerStore.getState().openedDrawers).toEqual(['notice']);
        expect(screen.queryByText('공지를 삭제할까요?')).not.toBeInTheDocument();
    });
});
