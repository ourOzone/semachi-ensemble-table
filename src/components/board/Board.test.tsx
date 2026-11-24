import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { url } from '@/constants';
import { useDrawerStore } from '@/stores/drawer';
import { ensembles, mockInitialData } from '@/test/fixtures';
import { findDialog, findDrawer, findEnabledButton } from '@/test/queries';
import { renderApp } from '@/test/render';
import { countOf, recordRequests } from '@/test/requests';
import { server } from '@/test/server';

// 합주표 흐름 테스트: 합주 블록 → 합주 정보 Drawer(아래에서 올라옴) → 수정 / 미루기 / 바로 하기(미루기 취소) / 반복으로 바꾸기 / 삭제.
// fixtures의 합주: 매주 반복, 다음 날짜 2026-11-23(월), 시간칸 2~3 (10:00 - 11:00)
// PIN 단계는 합주 정보 Drawer 안에서 내용이 바뀐다. 수정의 입력 단계(반복 여부·날짜·시간)는 아직 옛 Drawer(antd)다

type User = ReturnType<typeof userEvent.setup>;

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

/** PIN 단계(합주 정보 Drawer 안)에 PIN을 넣는다 */
async function enterPin(user: User, pin = '1234') {
    await user.type(await screen.findByLabelText('PIN 4자리'), pin);
}

/** PIN을 넣고, 확인되면 확인 버튼을 누른다 */
async function confirmPin(user: User, label: string) {
    await enterPin(user);
    const button = await screen.findByRole('button', { name: label });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
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
        // 미루지 않았으면 합주 없는 날·바로 하기가 없다
        expect(drawer.queryByText(/없어요/)).not.toBeInTheDocument();
        expect(drawer.queryByRole('button', { name: /바로 하기/ })).not.toBeInTheDocument();
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
        await findDialog('합주를 수정할까요?');
        // PIN이 맞으면 다음 단계로 자동 이동
        await enterPin(user);
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

    it('수정을 시작했다가 뒤로 가면 원래 값으로 돌아와, 다른 동작도 원래 값으로 한다', async () => {
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '수정' }));
        await enterPin(user);
        const step2 = await findDrawer(/매주 할 건가요/);
        await user.click(step2.querySelector<HTMLElement>('.ant-drawer-close')!);

        // 정보 단계로 돌아와 미루기: 원래 시간으로 저장된다 (되돌리지 않으면 시간이 비어 있다)
        const info = await findDialog('월 10:00 – 11:00');
        await user.click(within(info).getByRole('button', { name: '11/30(월)로 미루기' }));
        await confirmPin(user, '미루기');
        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toMatchObject({ startTime: 2, endTime: 3, repeat: true });
    });

    it('미루기: PIN이 맞으면 다음 합주를 7일 뒤로 미루고, 합주 없는 날과 바로 하기를 보여준다', async () => {
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '11/30(월)로 미루기' }));
        // PIN 단계는 같은 Drawer 안에서 바뀐다 (Drawer를 쌓지 않음)
        await findDialog('11/30(월)로 미룰까요?');
        expect(useDrawerStore.getState().openedDrawers).toEqual(['ensembleInfo']);
        await confirmPin(user, '미루기');

        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toMatchObject({ teamId: 'team-1', repeat: true, startTime: 2, endTime: 3 });
        expect(dayjs(putBody!.nextDate as string).format('YYYY-MM-DD')).toBe('2026-11-30');
        // 저장에 성공하면 정보 단계로 돌아와 바뀐 날짜를 보여준다
        const reopened = within(await findDialog('월 10:00 – 11:00'));
        expect(reopened.getByText('11/30(월)')).toBeInTheDocument();
        expect(reopened.getByText('11/23(월)엔 합주가 없어요')).toBeInTheDocument();
        expect(reopened.getByRole('button', { name: '12/7(월)로 미루기' })).toBeInTheDocument();
        expect(
            reopened.getByRole('button', { name: '11/23(월)부터 바로 하기' }),
        ).toBeInTheDocument();
        // 존재 확인은 미루기 버튼을 누를 때 1회 (이전: PIN을 넣을 때 한 번 더, 그 전에는 5회: 사전 결정 5)
        expect(countOf(requests, 'GET /ensemble/ensemble-1')).toBe(1);
    });

    // F4: 이전에는 저장을 기다리지 않고 화면의 날짜를 먼저 바꿔, 저장이 실패해도 바뀐 날짜가 보였다
    it('미루기: 저장에 실패하면 알림을 띄우고 PIN 단계에 머문다. 뒤로 가면 날짜는 그대로', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(http.put(`${url}/ensemble`, () => new HttpResponse(null, { status: 500 })));
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '11/30(월)로 미루기' }));
        await confirmPin(user, '미루기');

        expect(
            await screen.findByText('저장하지 못했어요. 잠시 후 다시 시도해 주세요.'),
        ).toBeInTheDocument();
        const pinStep = await findDialog('11/30(월)로 미룰까요?');
        // 다시 누를 수 있다
        await waitFor(() =>
            expect(within(pinStep).getByRole('button', { name: '미루기' })).toBeEnabled(),
        );
        await user.click(within(pinStep).getByRole('button', { name: '뒤로' }));
        const info = within(await findDialog('월 10:00 – 11:00'));
        expect(info.getByText('11/23(월)')).toBeInTheDocument();
        expect(info.queryByText(/없어요/)).not.toBeInTheDocument();
    });

    it('PIN: 확인하는 동안은 틀림으로 표시하지 않고, 틀리면 확인 버튼을 누를 수 없다', async () => {
        let respond: (ok: boolean) => void = () => {};
        server.use(
            http.post(`${url}/check-team-pin`, async () => {
                const ok = await new Promise<boolean>((resolve) => (respond = resolve));
                return HttpResponse.json(ok);
            }),
        );
        const { user, dialog } = await openEnsembleInfo();
        await user.click(within(dialog).getByRole('button', { name: '삭제' }));
        await enterPin(user, '9999');

        // 응답 전 (이전: 4자리를 넣는 즉시 빨간색 → 맞는 PIN도 잠깐 빨갛게 보였다)
        expect(await screen.findByText('확인하는 중…')).toBeInTheDocument();
        expect(screen.queryByText('PIN이 맞지 않아요')).not.toBeInTheDocument();
        expect(screen.getByLabelText('PIN 4자리')).not.toHaveAttribute('aria-invalid', 'true');

        respond(false);
        expect(await screen.findByText('PIN이 맞지 않아요')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '삭제하기' })).toBeDisabled();
    });

    it('PIN: 응답이 오기 전에 PIN을 고치면 이전 응답은 버린다', async () => {
        const pending: ((ok: boolean) => void)[] = [];
        server.use(
            http.post(`${url}/check-team-pin`, async ({ request }) => {
                const { pin } = (await request.json()) as { pin: string };
                // 처음 PIN(틀림)은 늦게, 고친 PIN(맞음)은 바로
                if (pin === '1111') {
                    const ok = await new Promise<boolean>((resolve) => pending.push(resolve));
                    return HttpResponse.json(ok);
                }
                return HttpResponse.json(true);
            }),
        );
        const { user, dialog } = await openEnsembleInfo();
        await user.click(within(dialog).getByRole('button', { name: '삭제' }));
        await enterPin(user, '1111');
        await waitFor(() => expect(pending).toHaveLength(1));
        await user.type(screen.getByLabelText('PIN 4자리'), '{Backspace}2');

        const button = await screen.findByRole('button', { name: '삭제하기' });
        await waitFor(() => expect(button).toBeEnabled());
        pending[0]!(false); // 늦게 온 "틀림"
        await delay(50);
        expect(button).toBeEnabled();
        expect(screen.queryByText('PIN이 맞지 않아요')).not.toBeInTheDocument();
    });

    it('바로 하기(미루기 취소): 여러 번 미뤘어도 한 번에 원래 날짜로 되돌린다', async () => {
        mockEnsemble({ nextDate: '2026-12-07T00:00:00.000Z' }); // 11/23·11/30 두 번 미룸
        const { user, dialog } = await openEnsembleInfo({ nextWeek: true });
        const drawer = within(dialog);
        expect(drawer.getByText('11/23(월) ~ 11/30(월)엔 합주가 없어요')).toBeInTheDocument();
        expect(drawer.getByText('12/7(월)')).toBeInTheDocument();
        expect(drawer.getByText('17일 뒤')).toBeInTheDocument();

        await user.click(drawer.getByRole('button', { name: '11/23(월)부터 바로 하기' }));
        await findDialog('11/23(월)부터 바로 할까요?');
        await confirmPin(user, '바로 하기');

        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toMatchObject({
            teamId: 'team-1',
            repeat: true,
            startTime: 2,
            endTime: 3,
            day: 0,
        });
        expect(dayjs(putBody!.nextDate as string).format('YYYY-MM-DD')).toBe('2026-11-23');
        const reopened = within(await findDialog('월 10:00 – 11:00'));
        expect(reopened.getByText('11/23(월)')).toBeInTheDocument();
        expect(reopened.queryByText(/없어요/)).not.toBeInTheDocument();
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
        await findDialog('매주 반복으로 바꿀까요?');
        await confirmPin(user, '매주 반복으로 바꾸기');

        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toMatchObject({
            repeat: true,
            type: '무기한',
            due: '2099-12-31',
            startTime: 2,
        });
        expect(dayjs(putBody!.nextDate as string).format('YYYY-MM-DD')).toBe('2026-11-23');
        const reopened = within(await findDialog('월 10:00 – 11:00'));
        expect(reopened.getByText('매주 반복')).toBeInTheDocument();
    });

    it('PIN이 맞으면 합주를 삭제하고 알림을 띄운다', async () => {
        let deletedUrl = '';
        server.use(
            http.delete(`${url}/ensemble`, ({ request }) => {
                deletedUrl = request.url;
                return HttpResponse.json({ id: 'ensemble-1' });
            }),
        );
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '삭제' }));
        await findDialog('합주를 삭제할까요?');
        await confirmPin(user, '삭제하기');

        await waitFor(() => expect(deletedUrl).not.toBe(''));
        expect(new URL(deletedUrl).searchParams.get('id')).toBe('ensemble-1');
        expect(await screen.findByText('삭제했어요.')).toBeInTheDocument();
        await waitFor(() => expect(useDrawerStore.getState().openedDrawers).toEqual([]));
    });

    it('PIN 단계에서 뒤로 가면 정보로 돌아간다', async () => {
        const { user, dialog } = await openEnsembleInfo();
        await user.click(within(dialog).getByRole('button', { name: '삭제' }));
        const pinStep = await findDialog('합주를 삭제할까요?');

        await user.click(within(pinStep).getByRole('button', { name: '뒤로' }));

        expect(await findDialog('월 10:00 – 11:00')).toBeInTheDocument();
    });
});
