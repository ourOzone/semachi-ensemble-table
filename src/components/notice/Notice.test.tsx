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

// 공지 기능 흐름 테스트: 목록 Drawer → 추가 / 삭제 Drawer, PIN 확인, 서버 요청 내용까지 확인한다.

async function openNoticeDrawer() {
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByText('첫 공지'));
    const addButton = await screen.findByRole('button', { name: /공지를 추가해요/ });
    return { user, addButton };
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
        // Drawer는 열림 애니메이션 뒤 내용 칸으로 포커스를 옮긴다. 그 전에 입력을 시작하면 PIN 입력 도중 포커스가
        // 내용 칸으로 되돌아갈 수 있어(ISSUES V7, 팀 추가 PIN 단계와 같은 구조), 포커스가 옮겨진 뒤 입력한다
        const contentInput = await screen.findByPlaceholderText('내용 여따 써요');
        await waitFor(() => expect(contentInput).toHaveFocus());
        await user.type(contentInput, '새 공지');
        await user.type(screen.getByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await findEnabledButton('완료'));

        // 알림 기능 삭제로 완료 알림 대신 서버 요청을 기다린다
        await waitFor(() => expect(posted).toBeDefined());
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
        // Drawer는 열림 애니메이션 뒤 내용 칸으로 포커스를 옮긴다. 그 전에 입력을 시작하면 PIN 입력 도중 포커스가
        // 내용 칸으로 되돌아갈 수 있어(ISSUES V7, 팀 추가 PIN 단계와 같은 구조), 포커스가 옮겨진 뒤 입력한다
        const contentInput = await screen.findByPlaceholderText('내용 여따 써요');
        await waitFor(() => expect(contentInput).toHaveFocus());
        await user.type(contentInput, '새 공지');
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
        const requests = recordRequests();
        const { user } = await openNoticeDrawer();

        // 목록 Drawer 안의 공지 카드에서 삭제(X) 아이콘 클릭
        const card = (await screen.findByText(/둘째 줄/)).parentElement!;
        await user.click(within(card).getByRole('img', { name: 'close' }));
        await user.type(await screen.findByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await findEnabledButton('진짜 삭제해요'));

        // 알림 기능 삭제로 완료 알림 대신 서버 요청을 기다린다
        await waitFor(() => expect(deletedUrl).not.toBe(''));
        expect(new URL(deletedUrl).searchParams.get('id')).toBe('notice-1');
        // 존재 확인은 PIN Drawer에서 한 번만 (이전: X 클릭·PIN 입력·삭제 직전 3회, 사전 결정 5)
        expect(countOf(requests, 'GET /notice/notice-1')).toBe(1);
        // 삭제 후에는 공지 목록만 다시 불러온다 (이전: 4개 목록 전체)
        await waitFor(() => expect(countOf(requests, 'GET /notices')).toBe(2));
        expect(countOf(requests, 'GET /teams')).toBe(1);
    });
});
