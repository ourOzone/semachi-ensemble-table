import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { url } from '@/constants';
import { mockInitialData } from '@/test/fixtures';
import { findDrawer, findEnabledButton } from '@/test/queries';
import { renderApp } from '@/test/render';
import { server } from '@/test/server';

// 합주표 흐름 테스트: 합주 블록 → 정보 Drawer → 수정 / 미루기 / 삭제.
// fixtures의 합주: 매주 반복, 다음 날짜 2026-11-23(월), 시간칸 2~3 (10:00 - 11:00)

/** 합주 블록을 눌러 합주 정보 Drawer를 연다 */
async function openEnsembleInfo() {
    const user = userEvent.setup();
    renderApp();
    // DOM 순서상 첫 번째는 팀 버튼(Teams), 두 번째가 합주 블록(Board)
    const [, ensembleBlock] = await screen.findAllByText('테스트밴드');
    await user.click(ensembleBlock!);
    await screen.findByText('다음 합주');
    return user;
}

describe('합주표', () => {
    let putBody: Record<string, unknown> | undefined;

    beforeEach(() => {
        // 날짜 계산 고정: 2026-11-20(금) 10:00. Date만 가짜로 바꿔 user-event·MSW 타이머에는 영향 없음
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 10, 20, 10, 0));

        putBody = undefined;
        mockInitialData();
        server.use(
            http.get(`${url}/ensemble/:id`, () => HttpResponse.json(true)),
            http.post(`${url}/check-team-pin`, () => HttpResponse.json(true)),
            http.put(`${url}/ensemble`, async ({ request }) => {
                putBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({
                    message: 'Ensemble updated successfully',
                    id: 'ensemble-1',
                });
            }),
        );
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('합주 블록을 누르면 다음 합주 날짜·시간·반복 여부를 보여준다', async () => {
        await openEnsembleInfo();

        expect(screen.getByText('2026-11-23 (월)')).toBeInTheDocument();
        expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
        expect(screen.getByText('매주 이 시간에 반복')).toBeInTheDocument();
    });

    it('합주를 수정하면 PIN → 반복 여부 → 날짜 → 시간 순으로 고르고 서버에 보낸다', async () => {
        const user = await openEnsembleInfo();

        await user.click(screen.getByRole('button', { name: /합주 수정/ }));
        // PIN이 맞으면 다음 단계로 자동 이동
        await user.type(await screen.findByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await screen.findByText(/매주 같은 타임에 할래요/));

        // 달력에서 2026-11-27(금) 선택
        await screen.findByText(/언제 시작으로 바꾸나요/);
        const cell = document.querySelector<HTMLElement>('td[title="2026-11-27"]');
        expect(cell).not.toBeNull();
        await user.click(cell!);

        // 시간: 12:00부터 13:00까지 → 시간칸 6 ~ 7
        await user.click(await screen.findByRole('button', { name: '12:00' }));
        await user.click(screen.getByRole('button', { name: '13:00' }));
        await user.click(await findEnabledButton('이대로 할래요'));

        expect(await screen.findByText('잘 바꿔놨어요.')).toBeInTheDocument();
        expect(putBody).toMatchObject({
            teamId: 'team-1',
            repeat: true,
            startTime: 6,
            endTime: 7,
            day: 4, // 금요일 (월요일 0 기준)
            type: '무기한',
            due: '2099-12-31',
        });
        expect(dayjs(putBody!.nextDate as string).format('YYYY-MM-DD')).toBe('2026-11-27');
    });

    it('다음 번에 안 해요: PIN이 맞으면 다음 합주를 7일 뒤로 미룬다', async () => {
        const user = await openEnsembleInfo();

        await user.click(screen.getByRole('button', { name: /다음 번에 안 해요/ }));
        const skipDrawer = await findDrawer(/PIN 입력해야 미룰 수 있어요/);
        await user.type(await screen.findByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await findEnabledButton('다음 번에 안 해요', skipDrawer));

        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toMatchObject({ teamId: 'team-1', repeat: true, startTime: 2, endTime: 3 });
        expect(dayjs(putBody!.nextDate as string).format('YYYY-MM-DD')).toBe('2026-11-30');
    });

    it('PIN이 맞으면 합주를 삭제한다', async () => {
        let deletedUrl = '';
        server.use(
            http.delete(`${url}/ensemble`, ({ request }) => {
                deletedUrl = request.url;
                return HttpResponse.json({ id: 'ensemble-1' });
            }),
        );
        const user = await openEnsembleInfo();

        await user.click(screen.getByRole('button', { name: /합주 삭제/ }));
        await user.type(await screen.findByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await findEnabledButton('진짜 삭제해요'));

        expect(await screen.findByText('합주를 삭제했어요.')).toBeInTheDocument();
        expect(new URL(deletedUrl).searchParams.get('id')).toBe('ensemble-1');
    });
});
