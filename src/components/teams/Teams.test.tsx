import { screen, waitFor, within } from '@testing-library/react';
import dayjs from 'dayjs';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { url } from '@/constants';
import { mockInitialData, teams } from '@/test/fixtures';
import { useDrawerStore } from '@/stores/drawer';
import { findDialog, findDrawer, findEnabledButton } from '@/test/queries';
import { renderApp } from '@/test/render';
import { countOf, recordRequests } from '@/test/requests';
import { server } from '@/test/server';

// 팀 기능 흐름 테스트: 팀 추가(한 Drawer + PIN 만들기), 팀 정보, 팀 수정(PIN → 팀 수정 Drawer), 팀 삭제, 팀 정보에서 합주 잡기, 소모임 정보.
// 합주 잡기 Drawer 자체(합주판에서 열기, 겹침 등)는 schedule/AddEnsembleDrawer.test.tsx
// Drawer가 스택으로 쌓여 같은 문구의 버튼("확인")이 여러 개 있으므로 Drawer 범위로 찾는다.

/**
 * 팀 추가 Drawer(V-3 10차, 한 Drawer)에서 종류·이름·팀원·셋리스트를 넣고 "다음" → PIN을 두 번 넣는다.
 * 두 번째 PIN을 넣으면 바로 저장한다
 */
async function fillAddTeam(user: ReturnType<typeof userEvent.setup>, confirmPin = '1234') {
    await user.click(await screen.findByRole('button', { name: '팀 추가' }));
    const drawer = within(await findDialog('팀 추가'));
    // 팀 종류는 교내 공연이 골라져 있다 (V-3 11차)
    expect(drawer.getByRole('radio', { name: '교내 공연' })).toHaveAttribute(
        'aria-checked',
        'true',
    );
    expect(drawer.getByText('정기공연, 연말공연, 축제, 버스킹 등')).toBeInTheDocument();
    expect(drawer.getByRole('button', { name: '팀명을 써 주세요' })).toBeDisabled();
    await user.type(drawer.getByRole('textbox', { name: '팀명' }), '새밴드');
    await user.type(drawer.getByRole('textbox', { name: '보컬' }), '홍길동');
    await user.type(drawer.getByRole('textbox', { name: '셋리스트 및 팀 정보' }), '곡1');
    await user.click(drawer.getByRole('button', { name: '다음' }));

    // 같은 Drawer 안에서 PIN 만들기로 바뀐다: 한 번 넣으면 "한 번 더"
    const pinDrawer = within(await findDialog('PIN을 만들어 주세요'));
    await user.type(pinDrawer.getByLabelText('PIN 4자리'), '1234');
    await screen.findByRole('heading', { name: '한 번 더 입력해 주세요' });
    await user.type(screen.getByLabelText('PIN 4자리'), confirmPin);
}

/**
 * 팀 정보 Drawer에서 합주 잡기 Drawer를 열어(팀은 골라져 있음) 한 번만 · 2026-11-27을 고르고 (시간은 기본 12:00부터 2시간)
 * "합주 잡기"를 누른다. 저장 버튼은 빠진 것을 알려 준다
 */
async function fillAddEnsemble(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
        within(await findDialog('테스트밴드')).getByRole('button', { name: '합주 잡기' }),
    );
    const drawer = within(await findDialog('합주 잡기'));
    expect(drawer.getByRole('button', { name: /^테스트밴드\s*바꾸기$/ })).toBeInTheDocument();
    expect(drawer.getByRole('button', { name: '반복 여부를 골라 주세요' })).toBeDisabled();

    await user.click(drawer.getByRole('radio', { name: '한 번만' }));
    expect(drawer.getByRole('button', { name: '날짜를 골라 주세요' })).toBeDisabled();
    expect(drawer.getByRole('button', { name: '날짜 선택' })).toHaveAttribute(
        'aria-expanded',
        'true',
    );
    // 팀 정보에서 열면 달력이 펼쳐져 있다
    await user.click(drawer.getByRole('button', { name: /11월 27일/ }));

    // 시간: 팀 정보에서 열면 12:00부터 2시간 → 시간칸 6 ~ 9 (23차, 막대의 창이 처음부터 보이게)
    expect(drawer.getByRole('radio', { name: '2시간' })).toBeChecked();
    expect(drawer.getByText('11월 27일 금요일 한 번만 · 12:00 – 14:00')).toBeInTheDocument();
    await user.click(drawer.getByRole('button', { name: '합주 잡기' }));
    return drawer;
}

/** 이미 열린 합주 잡기 Drawer(팀 정보에서 엶)에서 한 번만 · 11/27을 고르고(시간은 기본) 저장을 누른다 */
async function fillAddEnsembleAfterOpen(user: ReturnType<typeof userEvent.setup>) {
    const drawer = within(await findDialog('합주 잡기'));
    await user.click(drawer.getByRole('radio', { name: '한 번만' }));
    await user.click(drawer.getByRole('button', { name: /11월 27일/ }));
    await user.click(drawer.getByRole('button', { name: '합주 잡기' }));
}

/** 팀 버튼('테스트밴드')을 눌러 팀 정보 Drawer를 연다 */
async function openTeamInfo() {
    const user = userEvent.setup();
    renderApp();
    // '테스트밴드'는 팀 버튼과 합주표 블록 두 곳에 있다. 문서 순서상 첫 번째를 고르면 가끔 합주 블록이 잡혀
    // (합주 존재 확인 요청 → 모킹 없음 → 이미 삭제된 합주로 처리되어 Drawer를 모두 닫음) 실패했다.
    // → "팀 목록" 묶음 안에서 찾는다
    const teamList = await screen.findByRole('group', { name: '팀 목록' });
    const teamButton = await within(teamList).findByText('테스트밴드');
    await user.click(teamButton);
    await screen.findByText('보컬A');
    return user;
}

describe('팀', () => {
    let requests: string[];

    beforeEach(() => {
        requests = recordRequests();
        mockInitialData();
        server.use(http.get(`${url}/team/:id`, () => HttpResponse.json(true)));
    });

    it('팀 추가: 한 Drawer에서 종류·이름·팀원·셋리스트 → PIN 두 번 → 서버에 보내고 닫으며 알린다', async () => {
        let posted: Record<string, unknown> | undefined;
        server.use(
            http.post(`${url}/team`, async ({ request }) => {
                posted = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ id: 'team-2' });
            }),
        );
        const user = userEvent.setup();
        renderApp();

        await fillAddTeam(user);

        // 완료 화면 Drawer 대신 알림 (이전: "락앤롤!")
        expect(await screen.findByText('팀을 만들었어요.')).toBeInTheDocument();
        expect(posted).toMatchObject({
            type: '교내 공연', // V-3 10차: 새 팀 종류 문자열 그대로
            name: '새밴드',
            desc: ['홍길동', '', '', '', '', '', '곡1'],
            pin: '1234',
        });
        expect(typeof posted!.publishDate).toBe('string'); // Dayjs → ISO 문자열로 직렬화
        // 팀 자동 삭제는 적용 예정 (TEAM_DUE_ENABLED): 아직 보내지 않는다
        expect(posted).not.toHaveProperty('due');
        expect(useDrawerStore.getState().openedDrawers).toEqual([]);
    });

    it('팀 추가: 팀원·셋리스트는 안 써도 되지만, 비어 있으면 "다음 (… 나중에 적기)"로 알린다', async () => {
        const user = userEvent.setup();
        renderApp();
        await user.click(await screen.findByRole('button', { name: '팀 추가' }));
        const drawer = within(await findDialog('팀 추가'));
        await user.type(drawer.getByRole('textbox', { name: '팀명' }), '새밴드');

        expect(
            drawer.getByRole('button', { name: '다음 (팀원 및 셋리스트 나중에 적기)' }),
        ).toBeEnabled();

        await user.type(drawer.getByRole('textbox', { name: '보컬' }), '홍길동');
        expect(drawer.getByRole('button', { name: '다음 (셋리스트 나중에 적기)' })).toBeEnabled();

        await user.clear(drawer.getByRole('textbox', { name: '보컬' }));
        await user.type(drawer.getByRole('textbox', { name: '셋리스트 및 팀 정보' }), '곡1');
        expect(drawer.getByRole('button', { name: '다음 (팀원 나중에 적기)' })).toBeEnabled();
    });

    it('팀 고정: 팀 정보의 핀을 켜면 팀 목록 맨 앞(먼저 고정한 팀이 앞), 이 브라우저에 기억, 다시 누르면 풀림', async () => {
        server.use(
            http.get(`${url}/teams`, () =>
                HttpResponse.json([
                    teams[0]!,
                    { ...teams[0]!, _id: 'team-2', name: '둘째밴드' },
                    { ...teams[0]!, _id: 'team-3', name: '셋째밴드' },
                ]),
            ),
        );
        const user = userEvent.setup();
        renderApp();
        const teamList = await screen.findByRole('group', { name: '팀 목록' });
        const order = () =>
            within(teamList)
                .getAllByRole('button', { hidden: true }) // Drawer가 닫히는 동안 바깥이 aria-hidden
                .map((button) => button.textContent)
                .filter((text) => text?.includes('밴드'));
        await within(teamList).findByText('셋째밴드');
        expect(order()).toEqual(['테스트밴드', '둘째밴드', '셋째밴드']);

        const pin = async (name: string) => {
            await user.click(within(teamList).getByText(name));
            const info = within(await findDialog(name));
            await user.click(info.getByRole('button', { name: '팀 목록 맨 앞에 고정' }));
            expect(info.getByRole('button', { name: '팀 목록 맨 앞에 고정' })).toHaveAttribute(
                'aria-pressed',
                'true',
            );
            await user.click(info.getByRole('button', { name: '닫기' }));
            await waitFor(() => expect(useDrawerStore.getState().openedDrawers).toEqual([]));
        };
        await pin('셋째밴드');
        await pin('둘째밴드');
        expect(order()).toEqual(['셋째밴드', '둘째밴드', '테스트밴드']);
        expect(JSON.parse(localStorage.getItem('semachi.pinnedTeams')!)).toEqual([
            'team-3',
            'team-2',
        ]);

        // 다시 누르면 풀린다
        await user.click(within(teamList).getByText('셋째밴드'));
        const info = within(await findDialog('셋째밴드'));
        await user.click(info.getByRole('button', { name: '팀 목록 맨 앞에 고정' }));
        expect(info.getByRole('button', { name: '팀 목록 맨 앞에 고정' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
        expect(order()).toEqual(['둘째밴드', '테스트밴드', '셋째밴드']);
    });

    it('팀 추가: 확인 PIN이 다르면 흔든 뒤 처음부터, 저장하지 않는다', async () => {
        let attempted = false;
        server.use(
            http.post(`${url}/team`, () => {
                attempted = true;
                return HttpResponse.json({ id: 'x' });
            }),
        );
        const user = userEvent.setup();
        renderApp();

        await fillAddTeam(user, '4321');

        expect(
            await screen.findByText('PIN이 서로 달라요. 처음부터 다시 입력해 주세요'),
        ).toBeInTheDocument();
        expect(
            await screen.findByRole('heading', { name: 'PIN을 만들어 주세요' }),
        ).toBeInTheDocument();
        expect(attempted).toBe(false);
    });

    // F3: 이전에는 저장 결과와 관계없이 완료 화면을 열었다
    it('팀 추가: 저장에 실패하면 알리고 PIN 만들기에 머문다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        let attempted = false;
        server.use(
            http.post(`${url}/team`, () => {
                attempted = true;
                return new HttpResponse(null, { status: 500 });
            }),
        );
        const user = userEvent.setup();
        renderApp();

        await fillAddTeam(user);

        await waitFor(() => expect(attempted).toBe(true));
        expect(
            await screen.findByText('저장하지 못했어요. 잠시 후 다시 시도해 주세요.'),
        ).toBeInTheDocument();
        expect(
            await screen.findByRole('heading', { name: 'PIN을 만들어 주세요' }),
        ).toBeInTheDocument();
        expect(useDrawerStore.getState().openedDrawers).toEqual(['addTeam']);
    });

    it('팀 정보: 종류·팀원·셋리스트를 한 화면에 보여준다', async () => {
        await openTeamInfo();
        const drawer = within(await findDialog('테스트밴드'));

        // 이전: 팀원·셋리를 탭으로 전환 (V-3)
        expect(drawer.getByText('세마치공연 · 정기/연말')).toBeInTheDocument();
        expect(drawer.getByText('보컬A')).toBeInTheDocument();
        expect(drawer.getByText('매니저F')).toBeInTheDocument();
        expect(drawer.getByText('셋리스트', { selector: 'div' })).toBeInTheDocument();
        // 팀 클릭 시점의 존재 확인 요청은 없다 (이전: 1회, 사전 결정 5)
        expect(countOf(requests, 'GET /team/team-1')).toBe(0);
    });

    it('팀 삭제: 팀 정보 Drawer 안의 PIN 단계에서 PIN이 맞으면 삭제하고 모두 닫으며 알린다', async () => {
        let pinBody: unknown;
        let deletedUrl = '';
        server.use(
            http.post(`${url}/check-team-pin`, async ({ request }) => {
                pinBody = await request.json();
                return HttpResponse.json(true);
            }),
            http.delete(`${url}/team`, ({ request }) => {
                deletedUrl = request.url;
                return HttpResponse.json({ id: 'team-1' });
            }),
        );
        const user = await openTeamInfo();

        await user.click(screen.getByRole('button', { name: /팀 삭제/ }));
        // 같은 Drawer 안에서 PIN 단계로 바뀐다 (V-3 9차, 이전: 옛 Drawer "PIN 입력해야 삭제돼요")
        const drawer = within(await findDialog('팀을 삭제할까요?'));
        await user.type(drawer.getByLabelText('PIN 4자리'), '1234');
        const button = drawer.getByRole('button', { name: '삭제하기' });
        await waitFor(() => expect(button).toBeEnabled());
        await user.click(button);

        expect(await screen.findByText('삭제했어요.')).toBeInTheDocument();
        expect(pinBody).toEqual({ teamId: 'team-1', pin: '1234' });
        expect(new URL(deletedUrl).searchParams.get('id')).toBe('team-1');
        expect(useDrawerStore.getState().openedDrawers).toEqual([]);
    });

    /** 팀 정보 → "팀 수정" → 같은 Drawer 안의 PIN 단계 → (맞으면) 팀 수정 Drawer (V-3 13차) */
    async function openTeamEdit() {
        server.use(http.post(`${url}/check-team-pin`, () => HttpResponse.json(true)));
        const user = await openTeamInfo();
        await user.click(screen.getByRole('button', { name: /팀 수정/ }));
        const pinStep = within(await findDialog('팀을 수정할까요?'));
        await user.type(pinStep.getByLabelText('PIN 4자리'), '1234');
        const drawer = within(await findDialog('팀 수정'));
        return { user, drawer };
    }

    it('팀 수정: PIN이 맞으면 지금 값을 채운 팀 수정 Drawer, 바꿔 저장하면 팀 정보로 돌아오며 알린다', async () => {
        let putBody: unknown;
        let putUrl = '';
        server.use(
            http.put(`${url}/team`, async ({ request }) => {
                putUrl = request.url;
                putBody = await request.json();
                return HttpResponse.json({ id: 'team-1' });
            }),
        );
        const { user, drawer } = await openTeamEdit();

        // 지금 값 (옛 종류 "세마치공연(정기/연말)"는 새 종류 "교내 공연"으로 채운다)
        expect(drawer.getByRole('radio', { name: '교내 공연' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
        expect(drawer.getByRole('textbox', { name: '팀명' })).toHaveValue('테스트밴드');
        expect(drawer.getByRole('textbox', { name: '보컬' })).toHaveValue('보컬A');
        expect(drawer.getByRole('textbox', { name: '셋리스트 및 팀 정보' })).toHaveValue(
            '셋리스트',
        );
        expect(drawer.getByRole('button', { name: '바뀐 내용이 없어요' })).toBeDisabled();

        await user.click(drawer.getByRole('radio', { name: '외부 공연' }));
        await user.clear(drawer.getByRole('textbox', { name: '팀명' }));
        await user.type(drawer.getByRole('textbox', { name: '팀명' }), '새이름');
        await user.click(drawer.getByRole('button', { name: '수정하기' }));

        expect(await screen.findByText('팀을 수정했어요.')).toBeInTheDocument();
        expect(new URL(putUrl).searchParams.get('id')).toBe('team-1');
        expect(putBody).toEqual({
            type: '외부 공연',
            name: '새이름',
            desc: ['보컬A', '기타B', '베이스C', '드럼D', '키보드E', '매니저F', '셋리스트'],
        });
        // 팀 정보로 돌아오고, 고친 값이 보인다
        expect(useDrawerStore.getState().openedDrawers).toEqual(['teamInfo']);
        expect(await findDialog('새이름')).toBeInTheDocument();
    });

    // V-3 17차: 존재 확인 요청 자체가 실패하면(서버 오류) 알리고 팀 정보에 머문다 (이전: 알림 없이 모두 닫음)
    it('팀 수정: 누를 때 확인 요청이 실패하면(서버 오류) 알리고 팀 정보에 머문다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const user = await openTeamInfo();
        server.use(http.get(`${url}/team/:id`, () => new HttpResponse(null, { status: 500 })));

        await user.click(screen.getByRole('button', { name: /팀 수정/ }));

        expect(
            await screen.findByText('확인하지 못했어요. 잠시 후 다시 시도해 주세요.'),
        ).toBeInTheDocument();
        expect(useDrawerStore.getState().openedDrawers).toEqual(['teamInfo']);
    });

    it('팀 수정: 저장하지 않고 닫으면 팀 정보(정보 단계)로 돌아온다', async () => {
        const { user, drawer } = await openTeamEdit();

        await user.click(drawer.getByRole('button', { name: '닫기' }));

        await waitFor(() => expect(useDrawerStore.getState().openedDrawers).toEqual(['teamInfo']));
        // PIN 단계가 아니라 정보 단계
        expect(await findDialog('테스트밴드')).toBeInTheDocument();
    });

    it('팀 수정: 저장할 때 서버가 404(이미 삭제됨)를 주면 Drawer를 모두 닫고 팀·합주 목록을 다시 불러오며 알린다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(http.put(`${url}/team`, () => new HttpResponse(null, { status: 404 })));
        const { user, drawer } = await openTeamEdit();
        await user.type(drawer.getByRole('textbox', { name: '팀명' }), '2');
        requests.length = 0;

        await user.click(drawer.getByRole('button', { name: '수정하기' }));

        expect(await screen.findByText('이미 삭제된 팀이에요.')).toBeInTheDocument();
        expect(useDrawerStore.getState().openedDrawers).toEqual([]);
        await waitFor(() => {
            expect(countOf(requests, 'GET /teams')).toBe(1);
            expect(countOf(requests, 'GET /ensembles')).toBe(1);
        });
    });

    describe('합주 잡기 (팀 정보에서)', () => {
        beforeEach(() => {
            // 달력 날짜 고정: 2026-11-20(금). Date만 가짜로 바꿔 user-event·MSW 타이머에는 영향 없음
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(new Date(2026, 10, 20, 10, 0));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('팀이 골라져 있고, 반복 여부 → 날짜 → 시간을 고르면 서버에 보내고 닫으며 알린다', async () => {
            let posted: Record<string, unknown> | undefined;
            server.use(
                http.post(`${url}/ensemble`, async ({ request }) => {
                    posted = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json({ id: 'ensemble-2' });
                }),
            );
            const user = await openTeamInfo();

            await fillAddEnsemble(user);

            // 완료 화면 Drawer 대신 알림 (이전: "락앤롤!")
            expect(await screen.findByText('합주를 잡았어요.')).toBeInTheDocument();
            expect(useDrawerStore.getState().openedDrawers).toEqual([]);
            expect(posted).toMatchObject({
                teamId: 'team-1',
                teamName: '테스트밴드',
                repeat: false,
                startTime: 6,
                endTime: 9,
                day: 4, // 금요일 (월요일 0 기준)
                type: '일회성',
                due: '2026-11-27',
            });
            // 날짜에 시작 시각을 붙여 보낸다 (서버가 지난 일회성 합주를 날짜로 걸러 냄)
            expect(dayjs(posted!.nextDate as string).format('YYYY-MM-DD HH:mm')).toBe(
                '2026-11-27 12:00',
            );
            // 서버가 팀 존재를 검사하지 않아(ISSUES B4) 저장 직전 확인은 유지: 팀 정보 Drawer의 합주 추가 버튼 + 저장 직전 = 2회
            expect(countOf(requests, 'GET /team/team-1')).toBe(2);
        });

        it('저장하지 않고 닫으면 팀 정보로 돌아간다', async () => {
            const user = await openTeamInfo();
            await user.click(
                within(await findDialog('테스트밴드')).getByRole('button', { name: '합주 잡기' }),
            );
            const drawer = within(await findDialog('합주 잡기'));

            await user.click(drawer.getByRole('button', { name: '닫기' }));

            await waitFor(() =>
                expect(useDrawerStore.getState().openedDrawers).toEqual(['teamInfo']),
            );
        });

        // V-3 10차: 팀 자동 삭제 날짜(서버 팀 due, 백엔드에 생기면)가 있으면 팀 정보에 적고, 매주 반복은 그 날짜까지만
        it('팀에 삭제 날짜가 있으면 팀 정보에 적고, 매주 반복은 "종료 날짜 지정"만 (그 날짜까지)', async () => {
            server.use(
                http.get(`${url}/teams`, () =>
                    HttpResponse.json([{ ...teams[0]!, due: '2026-12-10T00:00:00.000Z' }]),
                ),
            );
            const user = await openTeamInfo();
            const info = within(await findDialog('테스트밴드'));
            expect(info.getByText('세마치공연 · 정기/연말 · 12/10(목)까지')).toBeInTheDocument();

            await user.click(info.getByRole('button', { name: '합주 잡기' }));
            const drawer = within(await findDialog('합주 잡기'));
            await user.click(drawer.getByRole('radio', { name: '매주 반복' }));
            expect(drawer.getByRole('radio', { name: '계속 반복' })).toBeDisabled();
            expect(drawer.getByRole('radio', { name: '종료 날짜 지정' })).toHaveAttribute(
                'aria-checked',
                'true',
            );
            expect(
                drawer.getByText(/팀이 12월 10일 목요일 이후에 자동으로 삭제돼서/),
            ).toBeInTheDocument();
        });

        it('팀에 삭제 날짜가 없으면(계속 유지) 팀 정보에 적지 않고, 계속 반복을 고를 수 있다', async () => {
            const user = await openTeamInfo();
            const info = within(await findDialog('테스트밴드'));
            expect(info.getByText('세마치공연 · 정기/연말')).toBeInTheDocument();

            await user.click(info.getByRole('button', { name: '합주 잡기' }));
            const drawer = within(await findDialog('합주 잡기'));
            await user.click(drawer.getByRole('radio', { name: '매주 반복' }));
            expect(drawer.getByRole('radio', { name: '계속 반복' })).toBeEnabled();
            expect(drawer.getByRole('radio', { name: '계속 반복' })).toHaveAttribute(
                'aria-checked',
                'true',
            );
        });

        it('팀이 그새 삭제됐으면 저장하지 않고 모두 닫으며 알린다', async () => {
            let attempted = false;
            server.use(
                http.post(`${url}/ensemble`, () => {
                    attempted = true;
                    return HttpResponse.json({ id: 'x' });
                }),
            );
            const user = await openTeamInfo();
            await user.click(
                within(await findDialog('테스트밴드')).getByRole('button', { name: '합주 잡기' }),
            );
            await findDialog('합주 잡기');
            server.use(http.get(`${url}/team/:id`, () => new HttpResponse(null, { status: 404 })));
            await fillAddEnsembleAfterOpen(user);

            expect(await screen.findByText('이미 삭제된 팀이에요.')).toBeInTheDocument();
            expect(useDrawerStore.getState().openedDrawers).toEqual([]);
            expect(attempted).toBe(false);
        });

        // F3: 이전에는 저장 결과와 관계없이 완료 화면을 열었다
        it('저장에 실패하면 알리고 Drawer에 머물러 다시 누를 수 있다', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            let attempted = false;
            server.use(
                http.post(`${url}/ensemble`, () => {
                    attempted = true;
                    return new HttpResponse(null, { status: 500 });
                }),
            );
            const user = await openTeamInfo();

            const drawer = await fillAddEnsemble(user);

            await waitFor(() => expect(attempted).toBe(true));
            expect(
                await screen.findByText('저장하지 못했어요. 잠시 후 다시 시도해 주세요.'),
            ).toBeInTheDocument();
            expect(useDrawerStore.getState().openedDrawers).toEqual(['addEnsemble']);
            expect(drawer.getByRole('button', { name: '합주 잡기' })).toBeEnabled();
        });
    });

    it('소모임 버튼을 누르면 전체 이름으로 보여준다', async () => {
        const user = userEvent.setup();
        renderApp();

        await user.click(await screen.findByText('보소'));
        const drawer = within(await findDialog('보컬 소모임'));
        expect(drawer.getByRole('button', { name: '일정 잡기' })).toBeInTheDocument();
    });
});
