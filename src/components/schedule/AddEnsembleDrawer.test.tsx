import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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
        // 머리 설명에 반복 여부가 붙는다 (반복 아래 안내 문구는 없앰, 22차)
        expect(drawer.getByText('11월 21일 토요일부터 매주 · 12:00 – 14:00')).toBeInTheDocument();
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
        // "시간" 소제목 옆과 직접 입력 칸 (이전: "23:30에 끝나요")
        expect(drawer.getAllByText('22:00 – 23:30')).toHaveLength(2);

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
        await user.click(drawer.getByRole('radio', { name: '한 번만' }));

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

// jsdom은 배치를 계산하지 않아(위치·크기 0) 소제목 위치와 막대 폭을 정해 둔다
describe('합주 잡기 Drawer: 스크롤·막대 끌기', () => {
    /** 소제목(section aria-label)의 화면 위치. 스크롤 영역 자신은 0 */
    const SECTION_TOP: Record<string, number> = {
        팀: 100,
        반복: 200,
        날짜: 300,
        '시작 날짜': 300,
        시간: 400,
    };
    /** 스크롤 목표 = 소제목 위치 - 위 여백 24px */
    const target = (label: string) => SECTION_TOP[label]! - 24;
    let scrollTo: ReturnType<typeof vi.fn<(options: ScrollToOptions) => void>>;

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 10, 20, 10, 0));
        mockInitialData();
        server.use(http.get(`${url}/team/:id`, () => HttpResponse.json(true)));
        scrollTo = vi.fn<(options: ScrollToOptions) => void>();
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
            configurable: true,
            value: scrollTo,
        });
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
            this: HTMLElement,
        ) {
            const top = SECTION_TOP[this.getAttribute('aria-label') ?? ''] ?? 0;
            // 그날 동방 막대: 폭 300px → 시간칸 하나 10px
            const width = this.hasAttribute('data-day-bar') ? 300 : 0;
            return DOMRect.fromRect({ x: 0, y: top, width, height: 0 });
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo;
    });

    const lastScroll = () => scrollTo.mock.lastCall?.[0];

    it('고른 항목의 소제목을 맨 위로, 직접 입력은 맨 아래로', async () => {
        const user = userEvent.setup();
        renderApp();
        const drawer = await openFromEmptySlot(user, '11월 21일 토 12:00');
        // 합주판에서 열면 처음엔 스크롤하지 않는다 (팀부터 골라야 함)
        expect(scrollTo).not.toHaveBeenCalled();

        await user.click(drawer.getByRole('radio', { name: '테스트밴드' }));
        expect(lastScroll()).toEqual({ top: target('팀'), behavior: 'smooth' });
        await user.click(drawer.getByRole('radio', { name: '한 번만' }));
        expect(lastScroll()).toEqual({ top: target('반복'), behavior: 'smooth' });
        await user.click(drawer.getByRole('button', { name: '11월 21일 토요일' }));
        expect(lastScroll()).toEqual({ top: target('날짜'), behavior: 'smooth' });
        await user.click(drawer.getByRole('radio', { name: '14:00' }));
        expect(lastScroll()).toEqual({ top: target('시간'), behavior: 'smooth' });
        await user.click(drawer.getByRole('radio', { name: '1시간' }));
        expect(lastScroll()).toEqual({ top: target('시간'), behavior: 'smooth' });
        // 직접 입력: 맨 아래 (scrollHeight, jsdom은 0)
        await user.click(drawer.getByRole('radio', { name: '직접 입력' }));
        expect(lastScroll()).toEqual({ top: 0, behavior: 'smooth' });
    });

    it('팀 정보에서 열면 처음부터 "반복"이 맨 위', async () => {
        const user = userEvent.setup();
        renderApp();
        const addTeam = await screen.findByText('팀 추가');
        await user.click(await within(addTeam.parentElement!).findByText('테스트밴드'));
        await user.click(await screen.findByRole('button', { name: /합주 추가/ }));
        await findDialog('합주 잡기');

        expect(scrollTo).toHaveBeenCalledTimes(1);
        expect(lastScroll()).toEqual({ top: target('반복'), behavior: 'auto' });
    });

    it('그날 동방 막대: 창을 끌어 옮기고, 창 밖을 누르면 그 자리를 가운데로 (막대 안에서만)', async () => {
        const user = userEvent.setup();
        renderApp();
        // 12:00부터 2시간 → 창은 시간칸 6~9 (60~100px)
        const drawer = await openFromEmptySlot(user, '11월 21일 토 12:00');
        const bar = document.querySelector<HTMLElement>('[data-day-bar]')!;
        const description = () => drawer.getByText(/^11월 21일 토요일 · /).textContent;

        // 창(75px)을 잡고 오른쪽으로 50px = 5칸
        fireEvent.pointerDown(bar, { pointerId: 1, clientX: 75 });
        fireEvent.pointerMove(bar, { pointerId: 1, clientX: 125 });
        fireEvent.pointerUp(bar, { pointerId: 1, clientX: 125 });
        expect(description()).toBe('11월 21일 토요일 · 14:30 – 16:30');
        // 시작 시간 칩도 따라 바뀐다
        expect(drawer.getByRole('radio', { name: '14:30' })).toBeChecked();

        // 창 밖(255px = 시간칸 25, 21:30)을 누르면 그 자리가 가운데: 시작 23칸(20:30)
        fireEvent.pointerDown(bar, { pointerId: 2, clientX: 255 });
        fireEvent.pointerUp(bar, { pointerId: 2, clientX: 255 });
        expect(description()).toBe('11월 21일 토요일 · 20:30 – 22:30');

        // 끝까지 끌어도 24:00을 넘지 않는다
        fireEvent.pointerDown(bar, { pointerId: 3, clientX: 240 });
        fireEvent.pointerMove(bar, { pointerId: 3, clientX: 400 });
        fireEvent.pointerUp(bar, { pointerId: 3, clientX: 400 });
        expect(description()).toBe('11월 21일 토요일 · 22:00 – 24:00');
        // 막대를 끄는 동안에는 Drawer를 스크롤하지 않는다
        expect(scrollTo).not.toHaveBeenCalled();
    });
});
