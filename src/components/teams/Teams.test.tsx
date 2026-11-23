import { screen, waitFor, within } from '@testing-library/react';
import dayjs from 'dayjs';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { url } from '@/constants';
import { mockInitialData } from '@/test/fixtures';
import { findDrawer, findEnabledButton } from '@/test/queries';
import { renderApp } from '@/test/render';
import { countOf, recordRequests } from '@/test/requests';
import { server } from '@/test/server';

// 팀 기능 흐름 테스트: 팀 추가 6단계, 팀 정보, 팀 수정 5단계, 팀 삭제, 합주 추가 4단계, 소모임 정보.
// Drawer가 스택으로 쌓여 같은 문구의 버튼("확인")이 여러 개 있으므로 Drawer 범위로 찾는다.

/** 팀 버튼('테스트밴드')을 눌러 팀 정보 Drawer를 연다 */
async function openTeamInfo() {
    const user = userEvent.setup();
    renderApp();
    // '테스트밴드'는 팀 버튼과 합주표 블록 두 곳에 있다. 문서 순서상 첫 번째를 고르면 가끔 합주 블록이 잡혀
    // (합주 존재 확인 요청 → 모킹 없음 → 이미 삭제된 합주로 처리되어 Drawer를 모두 닫음) 실패했다.
    // → "팀 추가" 버튼과 같은 목록 안에서 찾는다
    const addTeamButton = await screen.findByText('팀 추가');
    const teamButton = await within(addTeamButton.parentElement!).findByText('테스트밴드');
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

    it('팀 추가: 종류 → 이름 → 멤버 → 셋리 → PIN 확인 후 서버에 보내고 완료 화면을 띄운다', async () => {
        let posted: Record<string, unknown> | undefined;
        server.use(
            http.post(`${url}/team`, async ({ request }) => {
                posted = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ id: 'team-2' });
            }),
        );
        const user = userEvent.setup();
        renderApp();

        await user.click(await screen.findByText('팀 추가'));
        await user.click(await screen.findByText('교내공연'));

        const nameDrawer = await findDrawer(/팀 이름을 지어요/);
        await user.type(within(nameDrawer).getByRole('textbox'), '새밴드');
        await user.click(await findEnabledButton('확인', nameDrawer));

        const memberDrawer = await findDrawer(/누구누구 있나요/);
        await user.type(within(memberDrawer).getAllByRole('textbox')[0]!, '홍길동');
        await user.click(await findEnabledButton('확인', memberDrawer));

        const setlistDrawer = await findDrawer(/셋리 정한 거 있나요/);
        await user.type(within(setlistDrawer).getByRole('textbox'), '곡1');
        await user.click(await findEnabledButton('확인', setlistDrawer));

        // PIN Drawer는 열림 애니메이션이 끝난 뒤 PIN 칸으로 포커스를 옮긴다 (common/Drawer의 afterOpenChange).
        // 그 전에 입력을 시작하면 "한 번 더" 칸에 입력하는 도중 포커스가 PIN 칸으로 되돌아가 확인 PIN이 덜 입력되는 경우가 있었다
        // → 포커스가 옮겨진 뒤 입력한다 (ISSUES V6)
        const pinInput = await screen.findByPlaceholderText('숫자 4자리');
        await waitFor(() => expect(pinInput).toHaveFocus());
        await user.type(pinInput, '1234');
        await user.type(screen.getByPlaceholderText('한 번 더'), '1234');
        await user.click(await findEnabledButton('완료'));

        expect(await screen.findByText('락앤롤!')).toBeInTheDocument();
        expect(posted).toMatchObject({
            type: '교내공연(축제/버스킹)',
            name: '새밴드',
            desc: ['홍길동', '', '', '', '', '', '곡1'],
            pin: '1234',
        });
        expect(typeof posted!.publishDate).toBe('string'); // Dayjs → ISO 문자열로 직렬화
    });

    it('팀 정보: 팀원과 셋리를 탭으로 전환해 보여준다', async () => {
        const user = await openTeamInfo();

        expect(screen.getByText('드럼D')).toBeInTheDocument();
        await user.click(screen.getByText('셋리'));
        expect(await screen.findByText('셋리스트')).toBeInTheDocument();
        // 팀 클릭 시점의 존재 확인 요청은 없다 (이전: 1회, 사전 결정 5)
        expect(countOf(requests, 'GET /team/team-1')).toBe(0);
    });

    it('팀 삭제: PIN이 맞으면 팀을 삭제한다', async () => {
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
        await user.type(await screen.findByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await findEnabledButton('진짜 삭제해요'));

        // 알림 기능 삭제로 완료 알림 대신 서버 요청을 기다린다
        await waitFor(() => expect(deletedUrl).not.toBe(''));
        expect(pinBody).toEqual({ teamId: 'team-1', pin: '1234' });
        expect(new URL(deletedUrl).searchParams.get('id')).toBe('team-1');
    });

    it('팀 수정: PIN → 종류 → 이름 → 멤버 → 셋리 순으로 바꾸고 서버에 보낸다', async () => {
        let putBody: unknown;
        let putUrl = '';
        server.use(
            http.post(`${url}/check-team-pin`, () => HttpResponse.json(true)),
            http.put(`${url}/team`, async ({ request }) => {
                putUrl = request.url;
                putBody = await request.json();
                return HttpResponse.json({ id: 'team-1' });
            }),
        );
        const user = await openTeamInfo();

        await user.click(screen.getByRole('button', { name: /팀 수정/ }));
        // PIN이 맞으면 다음 단계로 자동 이동
        await user.type(await screen.findByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await screen.findByText('외부공연'));

        // 이름·멤버·셋리는 기존 값이 채워져 있다
        const nameDrawer = await findDrawer(/팀 이름을 바꿔요/);
        const nameInput = within(nameDrawer).getByRole('textbox');
        expect(nameInput).toHaveValue('테스트밴드');
        await user.clear(nameInput);
        await user.type(nameInput, '바뀐밴드');
        await user.click(await findEnabledButton('확인', nameDrawer));

        const memberDrawer = await findDrawer(/누가 바뀌었나요/);
        expect(within(memberDrawer).getAllByRole('textbox')[0]).toHaveValue('보컬A');
        await user.click(await findEnabledButton('확인', memberDrawer));

        const setlistDrawer = await findDrawer(/셋리가 바뀌었나요/);
        expect(within(setlistDrawer).getByRole('textbox')).toHaveValue('셋리스트');
        await user.click(await findEnabledButton('다 바꿨어요', setlistDrawer));

        // 알림 기능 삭제로 완료 알림 대신 서버 요청을 기다린다
        await waitFor(() => expect(putBody).toBeDefined());
        expect(new URL(putUrl).searchParams.get('id')).toBe('team-1');
        expect(putBody).toEqual({
            type: '외부공연(연합/대외)',
            name: '바뀐밴드',
            desc: ['보컬A', '기타B', '베이스C', '드럼D', '키보드E', '매니저F', '셋리스트'],
        });
        // 존재 확인은 팀 정보 Drawer의 수정 버튼·PIN Drawer 2회 (이전: 팀 클릭·저장 직전까지 4회, 사전 결정 5)
        expect(countOf(requests, 'GET /team/team-1')).toBe(2);
    });

    it('팀 수정: 저장할 때 서버가 404(이미 삭제됨)를 주면 Drawer를 모두 닫고 팀·합주 목록을 다시 불러온다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(
            http.post(`${url}/check-team-pin`, () => HttpResponse.json(true)),
            http.put(`${url}/team`, () =>
                HttpResponse.json({ error: 'Team not found' }, { status: 404 }),
            ),
        );
        const user = await openTeamInfo();

        await user.click(screen.getByRole('button', { name: /팀 수정/ }));
        await user.type(await screen.findByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await screen.findByText('외부공연'));
        await user.click(await findEnabledButton('확인', await findDrawer(/팀 이름을 바꿔요/)));
        await user.click(await findEnabledButton('확인', await findDrawer(/누가 바뀌었나요/)));
        await user.click(
            await findEnabledButton('다 바꿨어요', await findDrawer(/셋리가 바뀌었나요/)),
        );

        await waitFor(() => expect(document.querySelectorAll('.ant-drawer-open')).toHaveLength(0));
        await waitFor(() => expect(countOf(requests, 'GET /teams')).toBe(2));
        expect(countOf(requests, 'GET /ensembles')).toBe(2);
        expect(countOf(requests, 'GET /notes')).toBe(1);
    });

    // F1 회귀 테스트: 멤버·셋리 단계에서 뒤로 가면 그 단계의 입력을 원래 값으로 되돌린다 (이전에는 빈 값이 되어 그대로 저장됐다)
    it('팀 수정: 멤버·셋리 단계에서 뒤로 갔다가 다시 진행해 저장해도 기존 값이 유지된다', async () => {
        let putBody: unknown;
        server.use(
            http.post(`${url}/check-team-pin`, () => HttpResponse.json(true)),
            http.put(`${url}/team`, async ({ request }) => {
                putBody = await request.json();
                return HttpResponse.json({ id: 'team-1' });
            }),
        );
        const user = await openTeamInfo();

        await user.click(screen.getByRole('button', { name: /팀 수정/ }));
        await user.type(await screen.findByPlaceholderText('숫자 4자리'), '1234');
        await user.click(await screen.findByText('외부공연'));
        const nameDrawer = await findDrawer(/팀 이름을 바꿔요/);
        await user.click(await findEnabledButton('확인', nameDrawer));

        // 멤버를 고친 뒤 뒤로 가기 → 다시 진행하면 원래 값
        let memberDrawer = await findDrawer(/누가 바뀌었나요/);
        await user.type(within(memberDrawer).getAllByRole('textbox')[0]!, '바뀜');
        await user.click(within(memberDrawer).getByRole('button', { name: 'Close' }));
        await user.click(await findEnabledButton('확인', nameDrawer));
        memberDrawer = await findDrawer(/누가 바뀌었나요/);
        expect(within(memberDrawer).getAllByRole('textbox')[0]).toHaveValue('보컬A');
        await user.click(await findEnabledButton('확인', memberDrawer));

        // 셋리를 고친 뒤 뒤로 가기 → 다시 진행하면 원래 값
        let setlistDrawer = await findDrawer(/셋리가 바뀌었나요/);
        await user.type(within(setlistDrawer).getByRole('textbox'), '바뀜');
        await user.click(within(setlistDrawer).getByRole('button', { name: 'Close' }));
        await user.click(await findEnabledButton('확인', memberDrawer));
        setlistDrawer = await findDrawer(/셋리가 바뀌었나요/);
        expect(within(setlistDrawer).getByRole('textbox')).toHaveValue('셋리스트');
        await user.click(await findEnabledButton('다 바꿨어요', setlistDrawer));

        // 알림 기능 삭제로 완료 알림 대신 서버 요청을 기다린다
        await waitFor(() => expect(putBody).toBeDefined());
        expect(putBody).toEqual({
            type: '외부공연(연합/대외)',
            name: '테스트밴드',
            desc: ['보컬A', '기타B', '베이스C', '드럼D', '키보드E', '매니저F', '셋리스트'],
        });
    });

    describe('합주 추가', () => {
        beforeEach(() => {
            // 달력 날짜 고정: 2026-11-20(금). Date만 가짜로 바꿔 user-event·MSW 타이머에는 영향 없음
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(new Date(2026, 10, 20, 10, 0));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('반복 여부 → 날짜 → 시간을 고르면 서버에 보내고 완료 화면을 띄운다', async () => {
            let posted: Record<string, unknown> | undefined;
            server.use(
                http.post(`${url}/ensemble`, async ({ request }) => {
                    posted = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json({ id: 'ensemble-2' });
                }),
            );
            const user = await openTeamInfo();

            await user.click(screen.getByRole('button', { name: /합주 추가/ }));
            await user.click(await screen.findByText(/하루만 할래요/));

            await screen.findByText(/언제 할래요/);
            const cell = document.querySelector<HTMLElement>('td[title="2026-11-27"]');
            expect(cell).not.toBeNull();
            await user.click(cell!);

            // 시간: 19:00부터 21:00까지 → 시간칸 20 ~ 23
            await user.click(await screen.findByRole('button', { name: '19:00' }));
            await user.click(screen.getByRole('button', { name: '21:00' }));
            await user.click(await findEnabledButton('이대로 할래요'));

            expect(await screen.findByText(/등록했어요/)).toBeInTheDocument();
            expect(posted).toMatchObject({
                teamId: 'team-1',
                teamName: '테스트밴드',
                repeat: false,
                startTime: 20,
                endTime: 23,
                day: 4, // 금요일 (월요일 0 기준)
                type: '일회성',
                due: '2026-11-27',
            });
            expect(dayjs(posted!.nextDate as string).format('YYYY-MM-DD')).toBe('2026-11-27');
            // 서버가 팀 존재를 검사하지 않아(ISSUES B4) 저장 직전 확인은 유지: 팀 정보 Drawer의 합주 추가 버튼 + 저장 직전 = 2회
            expect(countOf(requests, 'GET /team/team-1')).toBe(2);
        });
    });

    it('소모임 버튼을 누르면 전체 이름으로 보여준다', async () => {
        const user = userEvent.setup();
        renderApp();

        await user.click(await screen.findByText('보소'));
        expect(await screen.findByText('보컬 소모임')).toBeInTheDocument();
    });
});
