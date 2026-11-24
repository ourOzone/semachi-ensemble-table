import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { url } from '@/constants';
import { useDrawerStore } from '@/stores/drawer';
import { ensembles, mockInitialData } from '@/test/fixtures';
import { findDialog } from '@/test/queries';
import { renderApp } from '@/test/render';
import { server } from '@/test/server';

// 합주 잡기 Drawer: 빈 시간칸을 누르거나, 이름이 안 보이는 좁은 화면에서 3개 이상 겹친 곳을 누를 때.
// 오늘은 2026-11-20(금) 10:00 → 이번 주는 11/16(월) ~ 11/22(일)

/** 토요일(11/21)에 A 10:00~12:00, B·C 10:30~12:30 (시간칸 2~5, 3~6, 3~6) */
function mockOverlap() {
    const base = { ...ensembles[0]!, day: 5, repeat: false, nextDate: '2026-11-21T00:00:00.000Z' };
    server.use(
        http.get(`${url}/ensembles`, () =>
            HttpResponse.json([
                { ...base, _id: 'a', teamId: 'ta', teamName: 'A팀', startTime: 2, endTime: 5 },
                { ...base, _id: 'b', teamId: 'tb', teamName: 'B팀', startTime: 3, endTime: 6 },
                { ...base, _id: 'c', teamId: 'tc', teamName: 'C팀', startTime: 3, endTime: 6 },
            ]),
        ),
    );
}

/** 넓은 화면(1024px 이상: 겹친 블록에도 이름이 보임)인 것처럼 */
function mockWideScreen() {
    const original = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
        ...original(query),
        matches: query === '(min-width: 64rem)',
    }));
}

describe('합주 잡기 Drawer', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 10, 20, 10, 0));
        mockInitialData();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('빈 시간칸을 누르면 그 시간과 비어 있다는 것, "이 시간에 합주 잡기"를 보여준다', async () => {
        const user = userEvent.setup();
        renderApp();

        await user.click(await screen.findByRole('button', { name: '11월 21일 토 12:00' }));

        const drawer = within(await findDialog(/토 12:00 – 12:30/));
        expect(drawer.getByText('11월 21일')).toBeInTheDocument();
        expect(drawer.getByText('비어 있는 시간이에요')).toBeInTheDocument();
        expect(drawer.getByText('09:00 – 24:00 동안 잡힌 합주가 없어요')).toBeInTheDocument();
        // 누른 날짜·시간을 채운 합주 잡기 Drawer로 바뀐다 (자세한 것은 AddEnsembleDrawer.test.tsx)
        await user.click(drawer.getByRole('button', { name: '이 시간에 합주 잡기' }));
        await findDialog('합주 잡기');
        expect(useDrawerStore.getState().openedDrawers).toEqual(['addEnsemble']);
    });

    it('빈 구간은 앞뒤 합주 사이까지 (월요일 10:00~11:00 합주가 있는 다음 주)', async () => {
        const user = userEvent.setup();
        renderApp();
        await user.click(await screen.findByRole('button', { name: '다음 주' }));

        await user.click(await screen.findByRole('button', { name: '11월 23일 월 09:00' }));

        const drawer = within(await findDialog(/월 09:00 – 09:30/));
        expect(drawer.getByText('09:00 – 10:00 동안 잡힌 합주가 없어요')).toBeInTheDocument();
    });

    it('지난 요일의 시간칸은 누를 수 없다', async () => {
        renderApp();
        await screen.findByRole('button', { name: '11월 20일 금 10:00' });
        expect(
            screen.queryByRole('button', { name: '11월 19일 목 10:00' }),
        ).not.toBeInTheDocument();
    });

    it('좁은 화면에서 3개 겹친 곳을 누르면 겹친 합주 목록, 고르면 그 합주의 정보로 바뀐다', async () => {
        mockOverlap();
        const user = userEvent.setup();
        renderApp();

        // B 블록의 첫 칸(10:30)에는 A·B·C가 모두 걸쳐 있다 (테스트 환경은 누른 위치를 몰라 블록의 첫 칸)
        await user.click(await screen.findByRole('button', { name: 'B팀 10:30–12:30' }));

        const list = await findDialog(/토 10:00 – 12:30/);
        const drawer = within(list);
        expect(drawer.getByText('11월 21일 · 3개가 겹쳐 있어요')).toBeInTheDocument();
        expect(
            drawer.getAllByRole('button', { name: /합주 정보$/ }).map((b) => b.textContent),
        ).toEqual([
            expect.stringContaining('A팀'),
            expect.stringContaining('B팀'),
            expect.stringContaining('C팀'),
        ]);
        expect(
            drawer.getByRole('button', { name: '같은 시간에 다른 팀 합주 잡기' }),
        ).toBeInTheDocument();

        await user.click(drawer.getByRole('button', { name: 'C팀 합주 정보' }));
        const info = await findDialog(/토 10:30 – 12:30/);
        expect(within(info).getByText('C팀')).toBeInTheDocument();
        // 쌓이지 않고 바뀐다
        expect(useDrawerStore.getState().openedDrawers).toEqual(['ensembleInfo']);
    });

    it('좁은 화면에서 겹친 묶음이라도 그 시간에 합주가 하나뿐이면 바로 그 합주의 정보', async () => {
        mockOverlap();
        const user = userEvent.setup();
        renderApp();

        // A 블록의 첫 칸(10:00)에는 A뿐
        await user.click(await screen.findByRole('button', { name: 'A팀 10:00–12:00' }));

        await findDialog(/토 10:00 – 12:00/);
        expect(useDrawerStore.getState().openedDrawers).toEqual(['ensembleInfo']);
    });

    it('넓은 화면에서는 겹친 블록도 누른 합주의 정보를 바로 연다', async () => {
        mockOverlap();
        mockWideScreen();
        const user = userEvent.setup();
        renderApp();

        await user.click(await screen.findByRole('button', { name: 'B팀 10:30–12:30' }));

        const info = await findDialog(/토 10:30 – 12:30/);
        expect(within(info).getByText('B팀')).toBeInTheDocument();
        await waitFor(() =>
            expect(useDrawerStore.getState().openedDrawers).toEqual(['ensembleInfo']),
        );
    });
});
