import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { url } from '@/constants';
import { mockInitialData } from '@/test/fixtures';
import { renderApp } from '@/test/render';
import { server } from '@/test/server';

// 공지 기능 흐름 테스트: 목록 Drawer → 추가 / 삭제 Drawer, PIN 확인, 서버 요청 내용까지 확인한다.

async function openNoticeDrawer() {
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByText('첫 공지'));
    const addButton = await screen.findByRole('button', { name: /공지를 추가해요/ });
    return { user, addButton };
}

// OkButton은 비활성일 때 visibility: hidden이라 접근성 이름이 비어 role로 찾을 수 없다.
// 문구로 찾고, PIN 서버 확인이 끝나 활성화될 때까지 기다린다.
async function findEnabledButton(label: string) {
    let button: HTMLButtonElement | null = null;
    await waitFor(() => {
        button = screen.getByText(label).closest('button');
        expect(button).toBeEnabled();
    });
    return button!;
}

describe('공지', () => {
    beforeEach(() => {
        mockInitialData();
    });

    it('PIN이 맞으면 공지를 등록하고, 서버에는 내용(content)만 보낸다', async () => {
        let posted: unknown;
        server.use(
            http.post(`${url}/check-notice-pin`, () => HttpResponse.json(true)),
            http.post(`${url}/notice`, async ({ request }) => {
                posted = await request.json();
                return HttpResponse.json({ message: 'Notice created', id: 'notice-2' });
            }),
        );
        const { user, addButton } = await openNoticeDrawer();

        await user.click(addButton);
        await user.type(await screen.findByPlaceholderText('내용 여따 써요'), '새 공지');
        await user.type(screen.getByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await findEnabledButton('완료'));

        expect(await screen.findByText('잘 등록했어요.')).toBeInTheDocument();
        expect(posted).toEqual({ content: '새 공지' });
    });

    it('PIN이 틀리면 완료 버튼이 비활성화된다', async () => {
        let pinChecked = false;
        server.use(
            http.post(`${url}/check-notice-pin`, () => {
                pinChecked = true;
                return HttpResponse.json(false);
            }),
        );
        const { user, addButton } = await openNoticeDrawer();

        await user.click(addButton);
        await user.type(await screen.findByPlaceholderText('내용 여따 써요'), '새 공지');
        await user.type(screen.getByPlaceholderText('숫자 4자리'), '0000');

        // PIN 입력 중에도 버튼은 비활성이므로, 서버 확인이 끝난 뒤의 상태를 본다
        await waitFor(() => expect(pinChecked).toBe(true));
        await new Promise((resolve) => setTimeout(resolve, 50));
        // 비활성화된 OkButton은 visibility: hidden이라 접근성 이름이 비므로 문구로 찾는다
        expect(screen.getByText('완료').closest('button')).toBeDisabled();
    });

    it('PIN이 맞으면 공지를 삭제한다', async () => {
        let deletedUrl = '';
        server.use(
            http.get(`${url}/notice/:id`, () => HttpResponse.json(true)),
            http.post(`${url}/check-notice-pin`, () => HttpResponse.json(true)),
            http.delete(`${url}/notice`, ({ request }) => {
                deletedUrl = request.url;
                return HttpResponse.json({ message: 'Notice deleted successfully' });
            }),
        );
        const { user } = await openNoticeDrawer();

        // 목록 Drawer 안의 공지 카드에서 삭제(X) 아이콘 클릭
        const card = (await screen.findByText(/둘째 줄/)).parentElement!;
        await user.click(within(card).getByRole('img', { name: 'close' }));
        await user.type(await screen.findByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await findEnabledButton('진짜 삭제해요'));

        expect(await screen.findByText('공지를 삭제했어요.')).toBeInTheDocument();
        expect(new URL(deletedUrl).searchParams.get('id')).toBe('notice-1');
    });
});
