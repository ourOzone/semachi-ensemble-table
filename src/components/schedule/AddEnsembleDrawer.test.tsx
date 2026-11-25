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
        // 시작 시간은 그날 동방 막대(슬라이더)의 창 (23차, 이전: 시작 시간 칩)
        expect(drawer.getByRole('slider', { name: '시작 시간' })).toHaveAttribute(
            'aria-valuetext',
            '12:00 – 14:00',
        );
        expect(drawer.queryByRole('radiogroup', { name: '시작 시간' })).not.toBeInTheDocument();
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
        // 반복 종료는 고르지 않아도 된다: "계속 반복"이 처음부터 골라져 있다
        expect(drawer.getByRole('radio', { name: '계속 반복' })).toBeChecked();
        expect(drawer.queryByText('이 날짜 이후에 자동으로 삭제돼요')).not.toBeInTheDocument();

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

        // 막대의 창을 옮겨도 길이는 그대로, 24:00을 넘지 않는다 (키보드: → 30분)
        drawer.getByRole('slider', { name: '시작 시간' }).focus();
        await user.keyboard('{ArrowRight}{ArrowRight}');
        expect(drawer.getByText('11월 21일 토요일 · 22:30 – 24:00')).toBeInTheDocument();
        expect(drawer.getByRole('radio', { name: '2시간' })).toBeDisabled();
        await user.keyboard('{Home}');
        expect(drawer.getByText('11월 21일 토요일 · 09:00 – 10:30')).toBeInTheDocument();
        await user.keyboard('{PageUp}');
        expect(drawer.getByText('11월 21일 토요일 · 10:00 – 11:30')).toBeInTheDocument();
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
        // 알림 자리는 늘 있고(배치가 움직이지 않게) 비어 있다
        expect(drawer.getByRole('status')).toBeEmptyDOMElement();
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
        // 12:30부터는 겹치지 않는다 (10:00에서 30분씩 5번)
        drawer.getByRole('slider', { name: '시작 시간' }).focus();
        await user.keyboard('{ArrowRight>5/}');
        expect(drawer.getByText('11월 21일 토요일 · 12:30 – 13:00')).toBeInTheDocument();
        expect(drawer.getByRole('status')).toBeEmptyDOMElement();
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

        expect(drawer.getByRole('status')).toHaveTextContent('이 시간엔 이미 4개가 겹쳐 있어요');
        expect(drawer.getByRole('button', { name: '최대 4개까지만 가능해요' })).toBeDisabled();

        // 10:00~10:30(A만)으로 줄이면 잡을 수 있다
        await user.click(drawer.getByRole('radio', { name: '30분' }));
        expect(drawer.getByRole('status')).toHaveTextContent('A팀 일정과 겹쳐요');
        expect(drawer.getByRole('button', { name: '합주 잡기' })).toBeEnabled();
    });

    it('그 시간에 이미 4개가 겹쳐 있으면 "같은 시간에 다른 팀 합주 잡기"를 누를 수 없다 (목록·합주 정보)', async () => {
        // 10:00(시간칸 2)에 4개
        mockSaturday([
            ['A팀', 2, 5],
            ['B팀', 2, 6],
            ['C팀', 2, 6],
            ['D팀', 2, 3],
        ]);
        const user = userEvent.setup();
        renderApp();

        await user.click(await screen.findByRole('button', { name: 'B팀 10:00–12:30' }));
        const list = within(await findDialog(/^토 /));
        const full = list.getByRole('button', { name: '4개가 겹쳐 있어 더 잡을 수 없어요' });
        expect(full).toBeDisabled();

        await user.click(list.getByRole('button', { name: 'A팀 합주 정보' }));
        const info = within(await findDialog(/토 10:00 – 12:00/));
        expect(
            info.getByRole('button', { name: '4개가 겹쳐 있어 더 잡을 수 없어요' }),
        ).toBeDisabled();
        expect(useDrawerStore.getState().openedDrawers).toEqual(['ensembleInfo']);
    });

    it('저장 직전에 합주 목록을 다시 불러와, 그새 4개가 됐으면 저장하지 않는다', async () => {
        let posted = false;
        mockSaturday([
            ['A팀', 6, 9],
            ['B팀', 6, 9],
            ['C팀', 6, 9],
        ]);
        server.use(
            http.post(`${url}/ensemble`, () => {
                posted = true;
                return HttpResponse.json({ id: 'new' });
            }),
        );
        const user = userEvent.setup();
        renderApp();
        // 빈 13:00 칸에서 열고 12:00으로 옮김 (3개와 겹침: 아직 잡을 수 있음)
        const drawer = await openFromEmptySlot(user, '11월 21일 토 14:00');
        await user.click(drawer.getByRole('radio', { name: '테스트밴드' }));
        await user.click(drawer.getByRole('radio', { name: '한 번만' }));
        drawer.getByRole('slider', { name: '시작 시간' }).focus();
        await user.keyboard('{PageDown}{PageDown}');
        expect(drawer.getByRole('status')).toHaveTextContent('A팀 일정 외 2개와 겹쳐요');
        const save = drawer.getByRole('button', { name: '합주 잡기' });
        expect(save).toBeEnabled();

        // 그새 다른 사람이 D팀을 잡았다
        mockSaturday([
            ['A팀', 6, 9],
            ['B팀', 6, 9],
            ['C팀', 6, 9],
            ['D팀', 6, 9],
        ]);
        await user.click(save);

        expect(
            await screen.findByText(
                '그사이 이 시간에 합주가 4개 잡혔어요. 다른 시간을 골라 주세요.',
            ),
        ).toBeInTheDocument();
        expect(posted).toBe(false);
        // 다시 불러온 목록으로 Drawer에도 막힘이 보인다
        await waitFor(() =>
            expect(drawer.getByRole('status')).toHaveTextContent(
                '이 시간엔 이미 4개가 겹쳐 있어요',
            ),
        );
        expect(useDrawerStore.getState().openedDrawers).toEqual(['addEnsemble']);
    });

    it('"같은 시간에 다른 팀 합주 잡기"의 날짜는 캘린더에서 보던 날 (합주의 다음 날짜가 아님)', async () => {
        // 토요일 합주, 12/5부터 (이번 주 11/21·다음 주 11/28에는 점선)
        server.use(
            http.get(`${url}/ensembles`, () =>
                HttpResponse.json([
                    {
                        ...ensembles[0]!,
                        day: 5,
                        startTime: 2,
                        endTime: 3,
                        nextDate: '2026-12-05T00:00:00',
                    },
                ]),
            ),
        );
        const user = userEvent.setup();
        renderApp();

        await user.click(await screen.findByRole('button', { name: /^테스트밴드 / }));
        let info = within(await findDialog(/토 10:00 – 11:00/));
        await user.click(info.getByRole('button', { name: '같은 시간에 다른 팀 합주 잡기' }));
        let drawer = within(await findDialog('합주 잡기'));
        // 이전: 12/5
        expect(drawer.getByText('11월 21일 토요일 · 10:00 – 12:00')).toBeInTheDocument();
        await user.click(drawer.getByRole('button', { name: '닫기' }));

        await user.click(screen.getByRole('button', { name: '다음 주' }));
        await user.click(await screen.findByRole('button', { name: /^테스트밴드 / }));
        info = within(await findDialog(/토 10:00 – 11:00/));
        await user.click(info.getByRole('button', { name: '같은 시간에 다른 팀 합주 잡기' }));
        drawer = within(await findDialog('합주 잡기'));
        expect(drawer.getByText('11월 28일 토요일 · 10:00 – 12:00')).toBeInTheDocument();
    });

    it('캘린더에서 지난 요일의 합주로 열면 다음에 오는 그 요일로', async () => {
        // 월요일 합주 (오늘은 금 11/20 → 이번 주 월 11/16은 지남)
        server.use(
            http.get(`${url}/ensembles`, () =>
                HttpResponse.json([{ ...ensembles[0]!, nextDate: '2026-11-16T00:00:00' }]),
            ),
        );
        const user = userEvent.setup();
        renderApp();
        await user.click(await screen.findByRole('button', { name: '테스트밴드 10:00–11:00' }));
        const info = within(await findDialog(/월 10:00 – 11:00/));
        await user.click(info.getByRole('button', { name: '같은 시간에 다른 팀 합주 잡기' }));
        const drawer = within(await findDialog('합주 잡기'));
        expect(drawer.getByText('11월 23일 월요일 · 10:00 – 12:00')).toBeInTheDocument();
    });

    it('반복 종료 날짜: 매주 반복일 때만, 지정하면 그 날짜를 due로 보낸다', async () => {
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
        await user.click(drawer.getByRole('radio', { name: '테스트밴드' }));

        // 한 번만이면 반복 종료가 없다
        await user.click(drawer.getByRole('radio', { name: '한 번만' }));
        expect(drawer.queryByRole('radiogroup', { name: '반복 종료' })).not.toBeInTheDocument();

        await user.click(drawer.getByRole('radio', { name: '매주 반복' }));
        await user.click(drawer.getByRole('radio', { name: '종료 날짜 지정' }));
        // 바로 달력이 열리고, 고르기 전에는 저장할 수 없다
        expect(drawer.getByRole('button', { name: '종료 날짜 선택' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        expect(drawer.getByText('이 날짜 이후에 자동으로 삭제돼요')).toBeInTheDocument();
        expect(drawer.getByRole('button', { name: '종료 날짜를 골라 주세요' })).toBeDisabled();
        // 달력은 일요일부터 (25차)
        expect(
            drawer
                .getAllByRole('columnheader', { hidden: true })
                .map((header) => header.textContent),
        ).toEqual(['일', '월', '화', '수', '목', '금', '토']);
        // 시작 날짜(11/21)보다 앞은 고를 수 없다
        expect(drawer.getByRole('button', { name: /11월 20일/ })).toBeDisabled();
        await user.click(drawer.getByRole('button', { name: /11월 28일/ }));
        expect(drawer.getByRole('button', { name: '11월 28일 토요일까지' })).toBeInTheDocument();

        await user.click(drawer.getByRole('button', { name: '합주 잡기' }));
        expect(await screen.findByText(/\(11\/28\(토\)까지\)/)).toBeInTheDocument();
        expect(posted).toMatchObject({ repeat: true, type: '무기한', due: '2026-11-28' });
    });

    it('시작 날짜를 종료 날짜 뒤로 옮기면 종료 날짜를 다시 고르게 한다', async () => {
        const user = userEvent.setup();
        renderApp();
        const drawer = await openFromEmptySlot(user, '11월 21일 토 12:00');
        await user.click(drawer.getByRole('radio', { name: '테스트밴드' }));
        await user.click(drawer.getByRole('radio', { name: '매주 반복' }));
        await user.click(drawer.getByRole('radio', { name: '종료 날짜 지정' }));
        await user.click(drawer.getByRole('button', { name: /11월 23일/ }));
        expect(drawer.getByRole('button', { name: '11월 23일 월요일까지' })).toBeInTheDocument();

        await user.click(drawer.getByRole('button', { name: '11월 21일 토요일' }));
        await user.click(drawer.getByRole('button', { name: /11월 28일/ }));
        expect(drawer.getByRole('button', { name: '종료 날짜 선택' })).toBeInTheDocument();
        expect(drawer.getByRole('button', { name: '종료 날짜를 골라 주세요' })).toBeDisabled();
    });

    it('반복 종료를 지정했다가 "계속 반복"으로 돌리면 2099-12-31', async () => {
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
        await user.click(drawer.getByRole('radio', { name: '테스트밴드' }));
        await user.click(drawer.getByRole('radio', { name: '매주 반복' }));
        await user.click(drawer.getByRole('radio', { name: '종료 날짜 지정' }));
        await user.click(drawer.getByRole('button', { name: /11월 28일/ }));
        await user.click(drawer.getByRole('radio', { name: '계속 반복' }));

        await user.click(drawer.getByRole('button', { name: '합주 잡기' }));
        await waitFor(() => expect(posted).toMatchObject({ due: '2099-12-31' }));
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
        '반복 종료': 500,
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
        await user.click(drawer.getByRole('radio', { name: '매주 반복' }));
        expect(lastScroll()).toEqual({ top: target('반복'), behavior: 'smooth' });
        await user.click(drawer.getByRole('button', { name: '11월 21일 토요일' }));
        expect(lastScroll()).toEqual({ top: target('시작 날짜'), behavior: 'smooth' });
        await user.click(drawer.getByRole('radio', { name: '1시간' }));
        expect(lastScroll()).toEqual({ top: target('시간'), behavior: 'smooth' });
        await user.click(drawer.getByRole('radio', { name: '종료 날짜 지정' }));
        expect(lastScroll()).toEqual({ top: target('반복 종료'), behavior: 'smooth' });
        // 직접 입력: 맨 아래 (scrollHeight, jsdom은 0)
        await user.click(drawer.getByRole('radio', { name: '직접 입력' }));
        expect(lastScroll()).toEqual({ top: 0, behavior: 'smooth' });
    });

    it('팀 정보에서 열면 처음부터 "반복"이 맨 위', async () => {
        const user = userEvent.setup();
        renderApp();
        const teamList = await screen.findByRole('group', { name: '팀 목록' });
        await user.click(await within(teamList).findByText('테스트밴드'));
        await user.click(await screen.findByRole('button', { name: '합주 잡기' }));
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
        // 슬라이더 값도 따라 바뀐다
        expect(drawer.getByRole('slider', { name: '시작 시간' })).toHaveAttribute(
            'aria-valuetext',
            '14:30 – 16:30',
        );

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
