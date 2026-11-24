import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { url } from '@/constants';
import { useDrawerStore } from '@/stores/drawer';
import type { EnsembleResponse } from '@/types';
import { ensembles, mockInitialData } from '@/test/fixtures';
import { findDialog } from '@/test/queries';
import { renderApp } from '@/test/render';
import { countOf, recordRequests } from '@/test/requests';
import { server } from '@/test/server';

// 합주 잡기 Drawer를 합주판에서 열 때: 날짜·시작 시간이 채워져 있고 팀을 골라야 한다. 소요 시간은 2시간으로 시작.
// 팀 정보에서 여는 흐름은 teams/Teams.test.tsx.
// 오늘은 2026-11-20(금) 10:00 → 이번 주는 11/16(월) ~ 11/22(일)

/** 토요일(11/21)에 일회성 합주들 (시간칸 범위) */
function mockSaturday(list: [name: string, startTime: number, endTime: number][]) {
    const base = { ...ensembles[0]!, day: 5, repeat: false, nextDate: '2026-11-21T00:00:00.000Z' };
    const saturday: EnsembleResponse[] = list.map(([name, startTime, endTime]) => ({
        ...base,
        _id: name,
        teamId: `t-${name}`,
        teamName: name,
        startTime,
        endTime,
    }));
    server.use(http.get(`${url}/ensembles`, () => HttpResponse.json(saturday)));
}

/** 빈 시간칸을 눌러 합주 잡기 Drawer까지 연다 */
async function openFromEmptySlot(user: ReturnType<typeof userEvent.setup>, slotName: string) {
    await user.click(await screen.findByRole('button', { name: slotName }));
    const slot = within(await findDialog(/^토 /));
    await user.click(slot.getByRole('button', { name: '이 시간에 합주 잡기' }));
    return within(await findDialog('합주 잡기'));
}

describe('합주 잡기 Drawer (합주판에서)', () => {
    let requests: string[];

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 10, 20, 10, 0));
        requests = recordRequests();
        mockInitialData();
        server.use(http.get(`${url}/team/:id`, () => HttpResponse.json(true)));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('빈 칸에서 열면 날짜·시작 시간이 채워져 있고(2시간), 팀·반복 여부를 고르면 저장한다', async () => {
        let posted: Record<string, unknown> | undefined;
        server.use(
            http.post(`${url}/ensemble`, async ({ request }) => {
                posted = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ id: 'new' });
            }),
        );
        const user = userEvent.setup();
        renderApp();

        const drawer = await openFromEmptySlot(user, '11월 21일 토 12:00');
        expect(useDrawerStore.getState().openedDrawers).toEqual(['addEnsemble']);
        expect(drawer.getByText('11월 21일 토요일 · 12:00 – 14:00')).toBeInTheDocument();
        expect(drawer.getByRole('radio', { name: '12:00' })).toBeChecked();
        expect(drawer.getByRole('radio', { name: '2시간' })).toBeChecked();
        expect(drawer.getByText('이날 동방 · 11/21(토)')).toBeInTheDocument();
        // 합주판에서 열면 팀은 골라야 한다 (팀 목록이 펼쳐져 있음)
        const save = drawer.getByRole('button', { name: '팀을 골라 주세요' });
        expect(save).toBeDisabled();

        await user.click(drawer.getByRole('radio', { name: '테스트밴드' }));
        // 고르면 접히고 팀 색으로 보인다
        expect(drawer.getByRole('button', { name: /^테스트밴드\s*바꾸기$/ })).toBeInTheDocument();
        expect(save).toHaveAccessibleName('반복 여부를 골라 주세요');
        await user.click(drawer.getByRole('radio', { name: '매주 반복' }));
        expect(drawer.getByText('11/21(토)부터 매주 토요일에 해요')).toBeInTheDocument();
        expect(drawer.getByRole('heading', { name: '시작 날짜' })).toBeInTheDocument();

        await user.click(drawer.getByRole('button', { name: '합주 잡기' }));

        expect(await screen.findByText('합주를 잡았어요.')).toBeInTheDocument();
        expect(posted).toMatchObject({
            teamId: 'team-1',
            teamName: '테스트밴드',
            repeat: true,
            startTime: 6,
            endTime: 9,
            day: 5,
            type: '무기한',
            due: '2099-12-31',
        });
        expect(dayjs(posted!.nextDate as string).format('YYYY-MM-DD HH:mm')).toBe(
            '2026-11-21 12:00',
        );
        expect(countOf(requests, 'GET /team/team-1')).toBe(1);
        expect(useDrawerStore.getState().openedDrawers).toEqual([]);
    });

    it('소요 시간: 칩, 직접 입력(30분 단위 ±), 24시를 넘지 않게', async () => {
        const user = userEvent.setup();
        renderApp();

        const drawer = await openFromEmptySlot(user, '11월 21일 토 22:00');
        // 22:00부터 2시간 = 24:00까지 → 2시간 그대로
        expect(drawer.getByRole('radio', { name: '2시간' })).toBeChecked();

        await user.click(drawer.getByRole('radio', { name: '직접 입력' }));
        expect(drawer.getByRole('button', { name: '30분 늘리기' })).toBeDisabled();
        await user.click(drawer.getByRole('button', { name: '30분 줄이기' }));
        expect(drawer.getByText('1시간 30분')).toBeInTheDocument();
        expect(drawer.getByText('23:30에 끝나요')).toBeInTheDocument();

        // 23:00으로 옮기면 1시간으로 줄고, 2시간 칩은 고를 수 없다
        await user.click(drawer.getByRole('radio', { name: '23:00' }));
        expect(drawer.getByText('11월 21일 토요일 · 23:00 – 24:00')).toBeInTheDocument();
        await user.click(drawer.getByRole('radio', { name: '30분' }));
        expect(drawer.getByRole('radio', { name: '2시간' })).toBeDisabled();
        expect(drawer.getByText('11월 21일 토요일 · 23:00 – 23:30')).toBeInTheDocument();
    });

    it('23:00 칸에서 열면 24:00까지 1시간으로 시작한다', async () => {
        const user = userEvent.setup();
        renderApp();

        const drawer = await openFromEmptySlot(user, '11월 21일 토 23:00');
        expect(drawer.getByRole('radio', { name: '1시간' })).toBeChecked();
        expect(drawer.getByRole('radio', { name: '2시간' })).toBeDisabled();
    });

    it('그날 쉬는(미룬) 합주와는 겹친다고 하지 않는다', async () => {
        // 토요일 10:00~12:00 반복 합주를 다음 주로 미룸 (이번 주는 점선)
        server.use(
            http.get(`${url}/ensembles`, () =>
                HttpResponse.json([
                    {
                        ...ensembles[0]!,
                        day: 5,
                        startTime: 2,
                        endTime: 5,
                        nextDate: '2026-11-28T00:00:00',
                    },
                ]),
            ),
        );
        const user = userEvent.setup();
        renderApp();

        const drawer = await openFromEmptySlot(user, '11월 21일 토 09:00');
        // 09:00~11:00은 미룬 합주(10:00~12:00)와 시간이 겹친다
        expect(drawer.getByText('11월 21일 토요일 · 09:00 – 11:00')).toBeInTheDocument();
        expect(drawer.queryByRole('status')).not.toBeInTheDocument();
    });

    it('겹친 합주 목록에서 열면 위에 보이던 시간의 시작부터, 겹치면 알린다', async () => {
        // 10:00~12:00 A, 10:30~12:30 B·C
        mockSaturday([
            ['A팀', 2, 5],
            ['B팀', 3, 6],
            ['C팀', 3, 6],
        ]);
        const user = userEvent.setup();
        renderApp();

        await user.click(await screen.findByRole('button', { name: 'B팀 10:30–12:30' }));
        const list = within(await findDialog(/토 10:00 – 12:30/));
        await user.click(list.getByRole('button', { name: '같은 시간에 다른 팀 합주 잡기' }));

        const drawer = within(await findDialog('합주 잡기'));
        expect(drawer.getByText('11월 21일 토요일 · 10:00 – 12:00')).toBeInTheDocument();
        expect(drawer.getByRole('status')).toHaveTextContent('A팀 일정 외 2개와 겹쳐요');

        // 10:00~10:30은 A만
        await user.click(drawer.getByRole('radio', { name: '30분' }));
        expect(drawer.getByRole('status')).toHaveTextContent('A팀 일정과 겹쳐요');
        // 12:30부터는 겹치지 않는다
        await user.click(drawer.getByRole('radio', { name: '12:30' }));
        expect(drawer.queryByRole('status')).not.toBeInTheDocument();
    });

    it('이미 4개가 겹친 시간에는 잡을 수 없다', async () => {
        mockSaturday([
            ['A팀', 2, 5],
            ['B팀', 3, 6],
            ['C팀', 3, 6],
            ['D팀', 3, 4],
        ]);
        const user = userEvent.setup();
        renderApp();

        await user.click(await screen.findByRole('button', { name: 'B팀 10:30–12:30' }));
        const list = within(await findDialog(/토 10:00 – 12:30/));
        await user.click(list.getByRole('button', { name: '같은 시간에 다른 팀 합주 잡기' }));
        const drawer = within(await findDialog('합주 잡기'));
        await user.click(drawer.getByRole('radio', { name: '테스트밴드' }));
        await user.click(drawer.getByRole('radio', { name: '이번 한 번' }));

        expect(drawer.getByRole('status')).toHaveTextContent('최대 4개까지만 가능해요');
        expect(drawer.getByRole('status')).toHaveTextContent('이 시간엔 이미 4개가 겹쳐 있어요');
        expect(drawer.getByRole('button', { name: '최대 4개까지만 가능해요' })).toBeDisabled();

        // 10:00~10:30(A만)으로 줄이면 잡을 수 있다
        await user.click(drawer.getByRole('radio', { name: '30분' }));
        expect(drawer.getByRole('status')).toHaveTextContent('A팀 일정과 겹쳐요');
        expect(drawer.getByRole('button', { name: '합주 잡기' })).toBeEnabled();
    });

    it('합주 정보의 "같은 시간에 다른 팀 합주 잡기": 다음 합주 날짜·시작 시간, 닫으면 모두 닫힌다', async () => {
        const user = userEvent.setup();
        renderApp();
        await user.click(await screen.findByRole('button', { name: '다음 주' }));
        // 월요일 10:00~11:00 테스트밴드 (11/23부터 매주)
        await user.click(await screen.findByRole('button', { name: '테스트밴드 10:00–11:00' }));
        const info = within(await findDialog(/월 10:00 – 11:00/));
        await user.click(info.getByRole('button', { name: '같은 시간에 다른 팀 합주 잡기' }));

        const drawer = within(await findDialog('합주 잡기'));
        expect(drawer.getByText('11월 23일 월요일 · 10:00 – 12:00')).toBeInTheDocument();
        expect(drawer.getByRole('status')).toHaveTextContent('테스트밴드 일정과 겹쳐요');

        await user.click(drawer.getByRole('button', { name: '닫기' }));
        await waitFor(() => expect(useDrawerStore.getState().openedDrawers).toEqual([]));
    });
});
