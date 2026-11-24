import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { url } from '@/constants';
import { useDrawerStore } from '@/stores/drawer';
import { ensembles, mockInitialData } from '@/test/fixtures';
import { findDialog, findDrawer, findEnabledButton } from '@/test/queries';
import { renderApp } from '@/test/render';
import { countOf, recordRequests } from '@/test/requests';
import { server } from '@/test/server';

// 합주표 흐름 테스트: 합주 블록 → 합주 정보 Drawer(아래에서 올라옴) → 수정 / 미루기 / 미루기 취소 / 반복으로 바꾸기 / 삭제.
// fixtures의 합주: 매주 반복, 다음 날짜 2026-11-23(월), 시간칸 2~3 (10:00 - 11:00)
// 미루기 등의 PIN·입력 단계는 아직 옛 Drawer(antd)다

/** 합주 목록을 바꾼다 (fixtures의 합주 하나를 고쳐서) */
function mockEnsemble(patch: Partial<(typeof ensembles)[number]>) {
    server.use(
        http.get(`${url}/ensembles`, () => HttpResponse.json([{ ...ensembles[0]!, ...patch }])),
    );
}

/** 합주 블록을 눌러 합주 정보 Drawer를 연다. nextWeek면 다음 주로 넘긴 뒤 누른다 */
async function openEnsembleInfo({ nextWeek = false } = {}) {
    const user = userEvent.setup();
    renderApp();
    if (nextWeek) {
        await user.click(await screen.findByRole('button', { name: '다음 주' }));
    }
    // DOM 순서상 첫 번째는 팀 버튼(Teams), 두 번째가 합주 블록(Board).
    // 합주표는 팀·합주를 모두 불러온 뒤에 그려지므로 팀 버튼만 먼저 보일 수 있다 → 두 개가 다 보일 때까지 기다린다
    // (findAllByText는 하나만 찾아도 끝나, 합주 블록이 undefined인 채로 클릭해 Drawer가 열리지 않는 경우가 있었다)
    await waitFor(() => expect(screen.getAllByText('테스트밴드')).toHaveLength(2));
    const [, ensembleBlock] = screen.getAllByText('테스트밴드');
    await user.click(ensembleBlock!);
    const dialog = await findDialog(/10:00 – 11:00/);
    return { user, dialog };
}

/** 옛 PIN Drawer에 PIN을 넣고 확인 버튼을 누른다 */
async function confirmPin(user: ReturnType<typeof userEvent.setup>, title: RegExp, label: string) {
    const pinDrawer = await findDrawer(title);
    await user.type(await within(pinDrawer).findByPlaceholderText('숫자 4자리'), '1234');
    await user.click(await findEnabledButton(label, pinDrawer));
    return pinDrawer;
}

describe('합주표', () => {
    let putBody: Record<string, unknown> | undefined;
    let requests: string[];

    beforeEach(() => {
        // 날짜 계산 고정: 2026-11-20(금) 10:00. Date만 가짜로 바꿔 user-event·MSW 타이머에는 영향 없음
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 10, 20, 10, 0));

        putBody = undefined;
        requests = recordRequests();
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

    it('합주 블록을 누르면 요일·시간·반복 여부와 다음 합주를 보여준다', async () => {
        const { dialog } = await openEnsembleInfo();
        const drawer = within(dialog);

        expect(drawer.getByRole('heading', { name: '월 10:00 – 11:00' })).toBeInTheDocument();
        expect(drawer.getByText('매주 반복')).toBeInTheDocument();
        expect(drawer.getByText('다음 합주')).toBeInTheDocument();
        expect(drawer.getByText('11/23(월)')).toBeInTheDocument();
        expect(drawer.getByText('10:00 – 11:00 · 1시간')).toBeInTheDocument();
        expect(drawer.getByText('3일 뒤')).toBeInTheDocument();
        expect(drawer.getByRole('button', { name: '11/30(월)로 미루기' })).toBeInTheDocument();
        // 미루지 않았으면 쉬는 날·미루기 취소가 없다
        expect(drawer.queryByText(/쉬어요/)).not.toBeInTheDocument();
        expect(drawer.queryByRole('button', { name: /미루기 취소/ })).not.toBeInTheDocument();
        expect(useDrawerStore.getState().openedDrawers).toEqual(['ensembleInfo']);
        // 블록 클릭 시점의 존재 확인 요청은 없다 (이전: 1회, 사전 결정 5)
        expect(countOf(requests, 'GET /ensemble/ensemble-1')).toBe(0);
    });

    it('닫기 버튼을 누르면 닫힌다', async () => {
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '닫기' }));

        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: /10:00 – 11:00/ })).not.toBeInTheDocument(),
        );
        expect(useDrawerStore.getState().openedDrawers).toEqual([]);
    });

    it('팀 이름을 누르면 팀 정보 Drawer로 바뀐다', async () => {
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '테스트밴드 팀 정보' }));

        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: /10:00 – 11:00/ })).not.toBeInTheDocument(),
        );
        // 쌓이지 않고 바뀐다 (이전: 합주 정보 위에 쌓임)
        expect(useDrawerStore.getState().openedDrawers).toEqual(['teamInfo']);
        expect(await screen.findByText('보컬A')).toBeInTheDocument();
    });

    it('합주를 수정하면 PIN → 반복 여부 → 날짜 → 시간 순으로 고르고 서버에 보낸다', async () => {
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '수정' }));
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

        // 알림 기능 삭제로 완료 알림 대신 서버 요청을 기다린다
        await waitFor(() => expect(putBody).toBeDefined());
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
        // 저장하면 합주 정보 Drawer로 돌아와 바뀐 값을 보여준다
        const updated = await findDialog(/12:00 – 13:00/);
        expect(
            within(updated).getByRole('heading', { name: '금 12:00 – 13:00' }),
        ).toBeInTheDocument();
    });

    it('미루기: PIN이 맞으면 다음 합주를 7일 뒤로 미루고, 쉬는 날과 미루기 취소를 보여준다', async () => {
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '11/30(월)로 미루기' }));
        // PIN 단계(옛 Drawer, 역시 role=dialog)가 쌓이면 합주 정보 Drawer는 내려간다
        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: /10:00 – 11:00/ })).not.toBeInTheDocument(),
        );
        await confirmPin(user, /PIN 입력해야 미룰 수 있어요/, '일주일 미뤄요');

        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toMatchObject({ teamId: 'team-1', repeat: true, startTime: 2, endTime: 3 });
        expect(dayjs(putBody!.nextDate as string).format('YYYY-MM-DD')).toBe('2026-11-30');
        // 저장에 성공하면 합주 정보 Drawer가 다시 올라와 바뀐 날짜를 보여준다
        const reopened = within(await findDialog(/10:00 – 11:00/));
        expect(reopened.getByText('11/30(월)')).toBeInTheDocument();
        expect(reopened.getByText('11/23(월) 쉬어요')).toBeInTheDocument();
        expect(reopened.getByRole('button', { name: '12/7(월)로 더 미루기' })).toBeInTheDocument();
        expect(
            reopened.getByRole('button', { name: '미루기 취소 (11/23(월))' }),
        ).toBeInTheDocument();
        // 존재 확인은 정보 Drawer의 미루기 버튼·PIN Drawer 2회 (이전: 블록 클릭·미루기 처리·수정 처리까지 5회, 사전 결정 5)
        expect(countOf(requests, 'GET /ensemble/ensemble-1')).toBe(2);
    });

    // F4: 이전에는 저장을 기다리지 않고 화면의 날짜를 먼저 바꿔, 저장이 실패해도 바뀐 날짜가 보였다
    it('미루기: 저장에 실패하면 다음 날짜를 바꾸지 않는다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        let attempted = false;
        server.use(
            http.put(`${url}/ensemble`, () => {
                attempted = true;
                return new HttpResponse(null, { status: 500 });
            }),
        );
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '11/30(월)로 미루기' }));
        const pinDrawer = await confirmPin(user, /PIN 입력해야 미룰 수 있어요/, '일주일 미뤄요');
        await waitFor(() => expect(attempted).toBe(true));
        await new Promise((resolve) => setTimeout(resolve, 100));

        // PIN 단계에 머문다. 뒤로 가면 합주 정보가 그대로
        expect(useDrawerStore.getState().openedDrawers).toEqual(['ensembleInfo', 'skipEnsemble']);
        await user.click(pinDrawer.querySelector<HTMLElement>('.ant-drawer-close')!);
        const reopened = within(await findDialog(/10:00 – 11:00/));
        expect(reopened.getByText('11/23(월)')).toBeInTheDocument();
        expect(reopened.queryByText(/쉬어요/)).not.toBeInTheDocument();
    });

    it('미루기 취소: 여러 번 미뤘어도 한 번에 원래 날짜로 되돌린다', async () => {
        mockEnsemble({ nextDate: '2026-12-07T00:00:00.000Z' }); // 11/23·11/30 두 번 미룸
        const { user, dialog } = await openEnsembleInfo({ nextWeek: true });
        const drawer = within(dialog);
        expect(drawer.getByText('11/23(월)부터 2주 쉬어요')).toBeInTheDocument();
        expect(drawer.getByText('12/7(월)')).toBeInTheDocument();
        expect(drawer.getByText('17일 뒤')).toBeInTheDocument();

        await user.click(drawer.getByRole('button', { name: '미루기 취소 (11/23(월))' }));
        await confirmPin(user, /PIN 입력해야 미루기를 취소할 수 있어요/, '미루기 취소해요');

        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toMatchObject({
            teamId: 'team-1',
            repeat: true,
            startTime: 2,
            endTime: 3,
            day: 0,
        });
        expect(dayjs(putBody!.nextDate as string).format('YYYY-MM-DD')).toBe('2026-11-23');
        const reopened = within(await findDialog(/10:00 – 11:00/));
        expect(reopened.getByText('11/23(월)')).toBeInTheDocument();
        expect(reopened.queryByText(/쉬어요/)).not.toBeInTheDocument();
    });

    it('일회성 합주: 합주 날짜를 보여주고, 매주 반복으로 바꿀 수 있다', async () => {
        mockEnsemble({ repeat: false, due: '2026-11-23T00:00:00.000Z' });
        const { user, dialog } = await openEnsembleInfo({ nextWeek: true });
        const drawer = within(dialog);
        expect(drawer.getByText('이번 한 번')).toBeInTheDocument();
        expect(drawer.getByText('합주 날짜')).toBeInTheDocument();
        expect(drawer.getByText('합주가 끝나면 합주판에서 자동으로 사라져요')).toBeInTheDocument();
        expect(drawer.queryByRole('button', { name: /미루기/ })).not.toBeInTheDocument();

        await user.click(drawer.getByRole('button', { name: '매주 반복으로 바꾸기' }));
        await confirmPin(user, /PIN 입력해야 반복으로 바꿀 수 있어요/, '매주 반복해요');

        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toMatchObject({
            repeat: true,
            type: '무기한',
            due: '2099-12-31',
            startTime: 2,
        });
        expect(dayjs(putBody!.nextDate as string).format('YYYY-MM-DD')).toBe('2026-11-23');
        const reopened = within(await findDialog(/10:00 – 11:00/));
        expect(reopened.getByText('매주 반복')).toBeInTheDocument();
    });

    it('PIN이 맞으면 합주를 삭제한다', async () => {
        let deletedUrl = '';
        server.use(
            http.delete(`${url}/ensemble`, ({ request }) => {
                deletedUrl = request.url;
                return HttpResponse.json({ id: 'ensemble-1' });
            }),
        );
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '삭제' }));
        await confirmPin(user, /PIN 입력해야 삭제돼요/, '진짜 삭제해요');

        // 알림 기능 삭제로 완료 알림 대신 서버 요청을 기다린다
        await waitFor(() => expect(deletedUrl).not.toBe(''));
        expect(new URL(deletedUrl).searchParams.get('id')).toBe('ensemble-1');
        await waitFor(() => expect(useDrawerStore.getState().openedDrawers).toEqual([]));
    });
});
