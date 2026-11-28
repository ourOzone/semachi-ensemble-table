import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { url } from '@/constants/index';
import { useDrawerStore } from '@/stores/drawer';
import { ensembles, mockInitialData } from '@/test/fixtures';
import { findDialog } from '@/test/queries';
import { renderApp } from '@/test/render';
import { countOf, recordRequests } from '@/test/requests';
import { server } from '@/test/server';
import { teamsQueryOptions } from '@/queries/teams';

// 합주표 흐름 테스트: 합주 블록 → 합주 정보 Drawer(아래에서 올라옴) → 수정 / 미루기 / 바로 하기(미루기 취소) / 반복으로 바꾸기 / 삭제.
// fixtures의 합주: 매주 반복, 다음 날짜 2026-11-23(월), 시간칸 2~3 (10:00 - 11:00)
// PIN 단계는 합주 정보 Drawer 안에서 내용이 바뀐다. 수정은 PIN이 맞으면 합주 수정 Drawer(합주 잡기 Drawer의 수정 모드, 31차)

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
    const { queryClient } = renderApp();
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
    return { user, dialog, queryClient };
}

/** PIN 단계(합주 정보 Drawer 안)에 PIN을 넣는다 */
async function enterPin(user: User, pin = '1234') {
    await user.type(await screen.findByLabelText('PIN 4자리'), pin);
}

/** PIN을 넣고, 확인되면 확인 버튼을 누른다 (확인 버튼은 삭제만. 나머지는 PIN이 맞으면 바로 실행) */
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

    // V-3 17차: 존재 확인에서 404(이미 삭제됨)와 서버 오류를 나눠 알린다 (이전: 알림 없이 모두 닫음)
    it('미루기를 누를 때 합주가 이미 삭제됐으면 알리고 모두 닫는다', async () => {
        server.use(http.get(`${url}/ensemble/:id`, () => new HttpResponse(null, { status: 404 })));
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '11/30(월)로 미루기' }));

        expect(await screen.findByText('이미 삭제된 합주예요.')).toBeInTheDocument();
        expect(useDrawerStore.getState().openedDrawers).toEqual([]);
    });

    it('미루기를 누를 때 확인 요청이 실패하면(서버 오류) 알리고 합주 정보에 머문다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(http.get(`${url}/ensemble/:id`, () => new HttpResponse(null, { status: 500 })));
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '11/30(월)로 미루기' }));

        expect(
            await screen.findByText('확인하지 못했어요. 잠시 후 다시 시도해 주세요.'),
        ).toBeInTheDocument();
        expect(useDrawerStore.getState().openedDrawers).toEqual(['ensembleInfo']);
        expect(
            within(dialog).getByRole('button', { name: '11/30(월)로 미루기' }),
        ).toBeInTheDocument();
    });

    it('팀 이름을 눌렀는데 그 팀이 이미 삭제됐으면(목록에 없으면) 알리고 모두 닫는다', async () => {
        const { user, dialog, queryClient } = await openEnsembleInfo();
        // 합주 정보를 연 뒤 팀이 삭제되어 다시 불러온 팀 목록에 없다
        server.use(http.get(`${url}/teams`, () => HttpResponse.json([])));
        await queryClient.refetchQueries({ queryKey: teamsQueryOptions.queryKey });

        await user.click(within(dialog).getByRole('button', { name: '테스트밴드 팀 정보' }));

        expect(await screen.findByText('이미 삭제된 팀이에요.')).toBeInTheDocument();
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

    /** 수정 → PIN → 합주 수정 Drawer (31차, 합주 잡기 Drawer의 수정 모드) */
    async function openEdit(user: User, dialog: HTMLElement) {
        await user.click(within(dialog).getByRole('button', { name: '합주 수정' }));
        await findDialog('합주를 수정할까요?');
        await enterPin(user);
        return within(await findDialog('합주 수정'));
    }

    it('수정: PIN이 맞으면 지금 값을 채운 합주 수정 Drawer, 바꾸고 저장하면 합주 정보로 돌아와 바뀐 값을 보여준다', async () => {
        const { user, dialog } = await openEnsembleInfo();
        const drawer = await openEdit(user, dialog);

        expect(useDrawerStore.getState().openedDrawers).toEqual(['updateEnsemble']);
        // 팀은 바꿀 수 없다 (PIN이 이 팀의 PIN)
        expect(drawer.getByText('팀은 바꿀 수 없어요')).toBeInTheDocument();
        expect(drawer.queryByRole('radiogroup', { name: '팀' })).not.toBeInTheDocument();
        expect(drawer.getByRole('radio', { name: '매주 반복' })).toBeChecked();
        expect(drawer.getByRole('button', { name: '11월 23일 월요일' })).toBeInTheDocument();
        expect(drawer.getByRole('slider', { name: '시작 시간' })).toHaveAttribute(
            'aria-valuetext',
            '10:00 – 11:00',
        );
        expect(drawer.getByRole('radio', { name: '1시간' })).toBeChecked();
        expect(drawer.getByRole('radio', { name: '계속 반복' })).toBeChecked();
        // 수정하는 합주 자신과는 겹치지 않는다
        expect(drawer.queryByText(/겹쳐요/)).not.toBeInTheDocument();
        // 바뀐 것이 없으면 저장할 수 없다
        expect(drawer.getByRole('button', { name: '바뀐 내용이 없어요' })).toBeDisabled();

        await user.click(drawer.getByRole('button', { name: '11월 23일 월요일' }));
        await user.click(drawer.getByRole('button', { name: /11월 27일/ }));
        await user.click(drawer.getByRole('radio', { name: '2시간' }));
        await user.click(drawer.getByRole('button', { name: '수정하기' }));

        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toMatchObject({
            teamId: 'team-1',
            repeat: true,
            startTime: 2,
            endTime: 5,
            due: '2099-12-31',
        });
        // 팀 이름·요일·type은 보내지 않는다: 서버가 채운다 (백엔드 개편 B-8 D3)
        for (const key of ['teamName', 'day', 'type']) expect(putBody).not.toHaveProperty(key);
        // 날짜에 시작 시각을 붙여 보낸다 (합주 잡기와 같음)
        expect(dayjs(putBody!.nextDate as string).format('YYYY-MM-DD HH:mm')).toBe(
            '2026-11-27 10:00',
        );
        expect(await screen.findByText('합주를 수정했어요.')).toBeInTheDocument();
        const updated = within(await findDialog('금 10:00 – 12:00'));
        expect(updated.getByText('11/27(금)')).toBeInTheDocument();
        expect(useDrawerStore.getState().openedDrawers).toEqual(['ensembleInfo']);
    });

    it('수정 Drawer를 저장하지 않고 닫으면 합주 정보로 돌아오고, 다른 동작도 원래 값으로 한다', async () => {
        const { user, dialog } = await openEnsembleInfo();
        const drawer = await openEdit(user, dialog);
        await user.click(drawer.getByRole('radio', { name: '2시간' }));
        await user.click(drawer.getByRole('button', { name: '닫기' }));

        const info = await findDialog('월 10:00 – 11:00');
        expect(useDrawerStore.getState().openedDrawers).toEqual(['ensembleInfo']);
        expect(putBody).toBeUndefined();
        await user.click(within(info).getByRole('button', { name: '11/30(월)로 미루기' }));
        await enterPin(user);
        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toMatchObject({ startTime: 2, endTime: 3, repeat: true });
    });

    it('수정: 반복 종료 날짜가 채워져 있고, 계속 반복으로 바꿀 수 있다', async () => {
        mockEnsemble({ due: '2026-12-21T00:00:00.000Z' });
        const { user, dialog } = await openEnsembleInfo();
        const drawer = await openEdit(user, dialog);

        expect(drawer.getByRole('radio', { name: '종료 날짜 지정' })).toBeChecked();
        expect(drawer.getByRole('button', { name: '12월 21일 월요일까지' })).toBeInTheDocument();
        expect(drawer.getByRole('button', { name: '바뀐 내용이 없어요' })).toBeDisabled();
        await user.click(drawer.getByRole('radio', { name: '계속 반복' }));
        await user.click(drawer.getByRole('button', { name: '수정하기' }));

        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toMatchObject({ repeat: true, due: '2099-12-31' });
    });

    it('수정: 한 번만으로 바꾸면 그 날짜만 (due는 그 날짜)', async () => {
        const { user, dialog } = await openEnsembleInfo();
        const drawer = await openEdit(user, dialog);

        await user.click(drawer.getByRole('radio', { name: '한 번만' }));
        expect(drawer.queryByRole('radiogroup', { name: '반복 종료' })).not.toBeInTheDocument();
        await user.click(drawer.getByRole('button', { name: '수정하기' }));

        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toMatchObject({ repeat: false, due: '2026-11-23' });
        const info = within(await findDialog('월 10:00 – 11:00'));
        expect(info.getByText('이번 한 번')).toBeInTheDocument();
    });

    it('수정: 겹침은 자신을 빼고 센다 (다른 합주 3개와 같은 시간이어도 저장할 수 있다)', async () => {
        const others = ['A', 'B', 'C'].map((name) => ({
            ...ensembles[0]!,
            _id: `other-${name}`,
            teamId: `t-${name}`,
            teamName: name,
            repeat: false,
            nextDate: '2026-11-23T00:00:00.000Z',
        }));
        server.use(
            http.get(`${url}/ensembles`, () => HttpResponse.json([ensembles[0]!, ...others])),
        );
        // 좁은 화면이라 겹친 합주 목록이 먼저 열린다 → 테스트밴드를 고른다
        const { user, dialog: list } = await openEnsembleInfo();
        await user.click(within(list).getByRole('button', { name: '테스트밴드 합주 정보' }));
        const drawer = await openEdit(user, await findDialog('월 10:00 – 11:00'));

        expect(drawer.getByText(/외 2개와/)).toBeInTheDocument();
        expect(drawer.queryByText(/4개가 겹쳐 있어요/)).not.toBeInTheDocument();
        await user.click(drawer.getByRole('radio', { name: '2시간' }));
        await user.click(drawer.getByRole('button', { name: '수정하기' }));
        await waitFor(() => expect(putBody).toMatchObject({ startTime: 2, endTime: 5 }));
    });

    it('수정: 저장에 실패하면 알리고 수정 Drawer에 머문다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(http.put(`${url}/ensemble`, () => new HttpResponse(null, { status: 500 })));
        const { user, dialog } = await openEnsembleInfo();
        const drawer = await openEdit(user, dialog);

        await user.click(drawer.getByRole('radio', { name: '2시간' }));
        await user.click(drawer.getByRole('button', { name: '수정하기' }));

        expect(
            await screen.findByText('저장하지 못했어요. 잠시 후 다시 시도해 주세요.'),
        ).toBeInTheDocument();
        expect(useDrawerStore.getState().openedDrawers).toEqual(['updateEnsemble']);
        await waitFor(() => expect(drawer.getByRole('button', { name: '수정하기' })).toBeEnabled());
    });

    it('미루기: PIN이 맞으면 다음 합주를 7일 뒤로 미루고, 합주 없는 날과 바로 하기를 보여준다', async () => {
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '11/30(월)로 미루기' }));
        // PIN 단계는 같은 Drawer 안에서 바뀐다 (Drawer를 쌓지 않음)
        await findDialog('11/30(월)로 미룰까요?');
        expect(useDrawerStore.getState().openedDrawers).toEqual(['ensembleInfo']);
        // PIN이 맞으면 확인 버튼 없이 바로 저장한다
        await enterPin(user);
        expect(screen.queryByRole('button', { name: '미루기' })).not.toBeInTheDocument();

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

    it('반복 종료 날짜가 있으면 머리에 "…까지"를 보여주고, 미뤄도 그대로 둔다', async () => {
        mockEnsemble({ due: '2026-12-21T00:00:00.000Z' });
        const { user, dialog } = await openEnsembleInfo();
        expect(within(dialog).getByText('매주 반복 · 12/21(월)까지')).toBeInTheDocument();

        await user.click(within(dialog).getByRole('button', { name: '11/30(월)로 미루기' }));
        await findDialog('11/30(월)로 미룰까요?');
        await enterPin(user);

        await waitFor(() => expect(putBody).toBeDefined());
        // 이전: 수정·미루기 때마다 2099-12-31로 덮어썼다
        expect(putBody).toMatchObject({ repeat: true, due: '2026-12-21' });
    });

    it('반복 종료 날짜가 이미 지난 합주(옛 데이터)는 합주판에 보이지 않는다 (32차 V13)', async () => {
        // 비교용: 같은 시간의 계속 반복 합주 (이것이 보이면 목록을 다 불러온 것)
        server.use(
            http.get(`${url}/ensembles`, () =>
                HttpResponse.json([
                    { ...ensembles[0]!, due: '2026-01-01T00:00:00.000Z' },
                    { ...ensembles[0]!, _id: 'other', teamName: '다른밴드' },
                ]),
            ),
        );
        renderApp();

        expect(
            await screen.findByRole('button', { name: '다른밴드 10:00–11:00' }),
        ).toBeInTheDocument();
        // 이전: 지난 종료 날짜는 계속 반복으로 보고 매주 보였다
        expect(screen.queryByRole('button', { name: /^테스트밴드 10:00/ })).not.toBeInTheDocument();
    });

    it('미루기: 저장에 실패하면 알림을 띄우고 PIN 단계에 머물러 다시 넣게 한다. 뒤로 가면 날짜는 그대로', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(http.put(`${url}/ensemble`, () => new HttpResponse(null, { status: 500 })));
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '11/30(월)로 미루기' }));
        await enterPin(user);

        expect(
            await screen.findByText('저장하지 못했어요. 잠시 후 다시 시도해 주세요.'),
        ).toBeInTheDocument();
        const pinStep = await findDialog('11/30(월)로 미룰까요?');
        // PIN 칸을 비워 다시 넣게 한다
        await waitFor(() => expect(screen.getByLabelText('PIN 4자리')).toHaveValue(''));
        await user.click(within(pinStep).getByRole('button', { name: '뒤로' }));
        const info = within(await findDialog('월 10:00 – 11:00'));
        expect(info.getByText('11/23(월)')).toBeInTheDocument();
        expect(info.queryByText(/없어요/)).not.toBeInTheDocument();
    });

    it('PIN: 확인하는 동안은 틀림으로 표시하지 않고, 틀리면 확인 버튼을 누를 수 없고 칸을 비운다', async () => {
        let respond: (ok: boolean) => void = () => {};
        server.use(
            http.post(`${url}/check-team-pin`, async () => {
                const ok = await new Promise<boolean>((resolve) => (respond = resolve));
                return HttpResponse.json(ok);
            }),
        );
        const { user, dialog } = await openEnsembleInfo();
        await user.click(within(dialog).getByRole('button', { name: '합주 삭제' }));
        await enterPin(user, '9999');

        // 응답 전 (이전: 4자리를 넣는 즉시 빨간색 → 맞는 PIN도 잠깐 빨갛게 보였다)
        expect(await screen.findByText('확인하는 중…')).toBeInTheDocument();
        expect(screen.queryByText(/PIN이 맞지 않아요/)).not.toBeInTheDocument();
        expect(screen.getByLabelText('PIN 4자리')).not.toHaveAttribute('aria-invalid', 'true');

        respond(false);
        expect(
            await screen.findByText('PIN이 맞지 않아요. 다시 입력해 주세요'),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '삭제하기' })).toBeDisabled();
        // 흔들기가 끝나면 칸을 비운다 (안내 문구는 다시 넣기 시작할 때까지 남는다)
        await waitFor(() => expect(screen.getByLabelText('PIN 4자리')).toHaveValue(''));
        expect(screen.getByText('PIN이 맞지 않아요. 다시 입력해 주세요')).toBeInTheDocument();
        await user.type(screen.getByLabelText('PIN 4자리'), '1');
        expect(screen.queryByText(/PIN이 맞지 않아요/)).not.toBeInTheDocument();
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
        await user.click(within(dialog).getByRole('button', { name: '합주 삭제' }));
        await enterPin(user, '1111');
        await waitFor(() => expect(pending).toHaveLength(1));
        await user.type(screen.getByLabelText('PIN 4자리'), '{Backspace}2');

        const button = await screen.findByRole('button', { name: '삭제하기' });
        await waitFor(() => expect(button).toBeEnabled());
        pending[0]!(false); // 늦게 온 "틀림"
        await delay(50);
        expect(button).toBeEnabled();
        expect(screen.queryByText(/PIN이 맞지 않아요/)).not.toBeInTheDocument();
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
        await enterPin(user);

        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toMatchObject({
            teamId: 'team-1',
            repeat: true,
            startTime: 2,
            endTime: 3,
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
        await enterPin(user);

        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toMatchObject({
            repeat: true,
            due: '2099-12-31',
            startTime: 2,
        });
        expect(dayjs(putBody!.nextDate as string).format('YYYY-MM-DD')).toBe('2026-11-23');
        const reopened = within(await findDialog('월 10:00 – 11:00'));
        expect(reopened.getByText('매주 반복')).toBeInTheDocument();
    });

    it('PIN이 맞으면 합주를 삭제하고 알림을 띄운다', async () => {
        let deletedUrl = '';
        let deletedBody: unknown;
        server.use(
            http.delete(`${url}/ensemble`, async ({ request }) => {
                deletedUrl = request.url;
                deletedBody = await request.json();
                return HttpResponse.json({ id: 'ensemble-1' });
            }),
        );
        const { user, dialog } = await openEnsembleInfo();

        await user.click(within(dialog).getByRole('button', { name: '합주 삭제' }));
        await findDialog('합주를 삭제할까요?');
        await confirmPin(user, '삭제하기');

        await waitFor(() => expect(deletedUrl).not.toBe(''));
        expect(new URL(deletedUrl).searchParams.get('id')).toBe('ensemble-1');
        // PIN 단계에서 맞은 PIN을 삭제 요청에도 담는다 (서버가 다시 확인, 백엔드 개편 B-6)
        expect(deletedBody).toEqual({ pin: '1234' });
        expect(await screen.findByText('삭제했어요.')).toBeInTheDocument();
        await waitFor(() => expect(useDrawerStore.getState().openedDrawers).toEqual([]));
    });

    it('삭제: PIN이 맞으면 Enter로도 삭제한다 (PC)', async () => {
        let deleted = false;
        server.use(
            http.delete(`${url}/ensemble`, () => {
                deleted = true;
                return HttpResponse.json({ id: 'ensemble-1' });
            }),
        );
        const { user, dialog } = await openEnsembleInfo();
        await user.click(within(dialog).getByRole('button', { name: '합주 삭제' }));
        await findDialog('합주를 삭제할까요?');
        await enterPin(user);
        await waitFor(() => expect(screen.getByRole('button', { name: '삭제하기' })).toBeEnabled());

        await user.keyboard('{Enter}');
        await waitFor(() => expect(deleted).toBe(true));
    });

    it('삭제: PIN 확인 전에는 Enter를 눌러도 삭제하지 않는다', async () => {
        let deleted = false;
        server.use(
            http.post(`${url}/check-team-pin`, async () => {
                await new Promise((resolve) => setTimeout(resolve, 300));
                return HttpResponse.json(true);
            }),
            http.delete(`${url}/ensemble`, () => {
                deleted = true;
                return HttpResponse.json({ id: 'ensemble-1' });
            }),
        );
        const { user, dialog } = await openEnsembleInfo();
        await user.click(within(dialog).getByRole('button', { name: '합주 삭제' }));
        await findDialog('합주를 삭제할까요?');
        await enterPin(user);
        await user.keyboard('{Enter}'); // 확인 중
        await waitFor(() => expect(screen.getByRole('button', { name: '삭제하기' })).toBeEnabled());
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(deleted).toBe(false);
    });

    it('반복 종료 날짜 뒤로는 미룰 수 없다', async () => {
        // 다음 합주 11/23, 미루면 11/30인데 11/29에 끝남
        mockEnsemble({ due: '2026-11-29T00:00:00.000Z' });
        const { dialog } = await openEnsembleInfo();
        expect(within(dialog).getByRole('button', { name: '11/30(월)로 미루기' })).toBeDisabled();
        expect(
            within(dialog).getByText('반복 종료(11/29(일)) 뒤로는 미룰 수 없어요'),
        ).toBeInTheDocument();
    });

    it('반복 종료 날짜 당일까지는 미룰 수 있다', async () => {
        mockEnsemble({ due: '2026-11-30T00:00:00.000Z' });
        const { dialog } = await openEnsembleInfo();
        expect(within(dialog).getByRole('button', { name: '11/30(월)로 미루기' })).toBeEnabled();
        expect(within(dialog).queryByText(/뒤로는 미룰 수 없어요/)).not.toBeInTheDocument();
    });

    it('PIN 단계에서 뒤로 가면 정보로 돌아간다', async () => {
        const { user, dialog } = await openEnsembleInfo();
        await user.click(within(dialog).getByRole('button', { name: '합주 삭제' }));
        const pinStep = await findDialog('합주를 삭제할까요?');

        await user.click(within(pinStep).getByRole('button', { name: '뒤로' }));

        expect(await findDialog('월 10:00 – 11:00')).toBeInTheDocument();
    });

    it('화면 키보드가 열리면 내용을 키보드 위로 올리고 Drawer 흰 바탕으로 키보드 뒤까지 덮는다, 닫히면 원래대로', async () => {
        // 키보드 330px, 사파리가 보이는 영역을 120px 스크롤 → 가려진 아래쪽 210px, 보이는 높이 514px
        const viewport = Object.assign(new EventTarget(), {
            height: 844,
            offsetTop: 0,
            pageTop: 0,
        });
        Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
        try {
            const { dialog } = await openEnsembleInfo();
            expect(dialog.style.paddingBottom).toBe('');
            expect(dialog.style.maxHeight).toBe('min(92dvh, 832px)');

            Object.assign(viewport, { height: 514, offsetTop: 120, pageTop: 120 });
            viewport.dispatchEvent(new Event('resize'));
            // Drawer는 맨 아래에 둔 채(올리지 않음) 아래 여백 = 가려진 높이, 최대 높이 = 보이는 높이 - 12 + 여백
            await waitFor(() => expect(dialog.style.paddingBottom).toBe('210px'));
            expect(dialog.style.bottom).toBe('');
            expect(dialog.style.maxHeight).toBe('712px');

            Object.assign(viewport, { height: 844, offsetTop: 0, pageTop: 0 });
            viewport.dispatchEvent(new Event('resize'));
            await waitFor(() => expect(dialog.style.paddingBottom).toBe(''));
            // 높이를 고정해 두지 않는다 (vaul은 키보드를 닫을 때 처음 높이로 고정해, 내용이 바뀌면 스크롤이 생겼다)
            expect(dialog.style.height).toBe('');
        } finally {
            Object.defineProperty(window, 'visualViewport', {
                configurable: true,
                value: undefined,
            });
        }
    });

    it('PIN 단계에서는 키보드 쪽에 비치는 페이지를 문서 안의 흰 판으로 덮는다 (아이폰 사파리 26)', async () => {
        // 보이는 영역: 문서 기준 120 ~ 634 (아래 끝 634) → 흰 판은 634 - 240 = 394부터
        const viewport = Object.assign(new EventTarget(), {
            height: 514,
            offsetTop: 120,
            pageTop: 120,
        });
        Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
        try {
            const { user, dialog } = await openEnsembleInfo();
            // 정보 단계(입력칸 없음)에서는 없다
            expect(document.querySelector('[data-keyboard-cover]')).toBeNull();

            await user.click(within(dialog).getByRole('button', { name: '합주 삭제' }));
            await findDialog('합주를 삭제할까요?');
            const cover = document.querySelector<HTMLElement>('[data-keyboard-cover]');
            // 고정(fixed) 요소가 아니라 문서 안(body의 자식, absolute)이어야 키보드 쪽에 비친다
            expect(cover?.parentElement).toBe(document.body);
            // body가 고정되면 body 기준이라 고정할 때의 스크롤(--locked-scroll-y)을 더한다
            expect(cover?.style.top).toBe('calc(var(--locked-scroll-y, 0px) + 394px)');

            await user.click(screen.getByRole('button', { name: '뒤로' }));
            await findDialog('월 10:00 – 11:00');
            expect(document.querySelector('[data-keyboard-cover]')).toBeNull();
        } finally {
            Object.defineProperty(window, 'visualViewport', {
                configurable: true,
                value: undefined,
            });
        }
    });

    it('PIN 단계 동안 뒤 페이지를 스크롤할 수 없게 고정하고, 나오면 원래 위치로', async () => {
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 200 });
        try {
            const { user, dialog } = await openEnsembleInfo();
            expect(document.body.style.position).toBe('');

            await user.click(within(dialog).getByRole('button', { name: '합주 삭제' }));
            await findDialog('합주를 삭제할까요?');
            // body를 고정(화면은 그대로: top = -스크롤 위치)해 사파리가 입력칸을 보이려고 페이지를 스크롤할 공간이 없다
            // (19차: 스크롤된 뒤 되돌려 깜빡였다)
            expect(document.body.style.getPropertyValue('position')).toBe('fixed');
            expect(document.body.style.getPropertyPriority('position')).toBe('important');
            expect(document.body.style.top).toBe('-200px');
            // 흰 판은 body 기준이 되므로 고정할 때의 스크롤만큼 더한다
            expect(document.body.style.getPropertyValue('--locked-scroll-y')).toBe('200px');

            await user.click(screen.getByRole('button', { name: '뒤로' }));
            await findDialog('월 10:00 – 11:00');
            expect(document.body.style.getPropertyValue('position')).toBe('');
            expect(document.body.style.top).toBe('');
            expect(scrollTo).toHaveBeenLastCalledWith(0, 200);
        } finally {
            Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
        }
    });
});
