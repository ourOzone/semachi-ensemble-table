import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { url } from '@/constants';
import { mockInitialData } from '@/test/fixtures';
import { findDrawer, findEnabledButton } from '@/test/queries';
import { renderApp } from '@/test/render';
import { server } from '@/test/server';

// 팀 기능 흐름 테스트: 팀 추가 6단계, 팀 정보, 팀 삭제, 소모임 정보.
// Drawer가 스택으로 쌓여 같은 문구의 버튼("확인")이 여러 개 있으므로 Drawer 범위로 찾는다.

/** 팀 버튼(첫 번째 '테스트밴드')을 눌러 팀 정보 Drawer를 연다 */
async function openTeamInfo() {
    const user = userEvent.setup();
    renderApp();
    const [teamButton] = await screen.findAllByText('테스트밴드');
    await user.click(teamButton!);
    await screen.findByText('보컬A');
    return user;
}

describe('팀', () => {
    beforeEach(() => {
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

        await user.type(await screen.findByPlaceholderText('숫자 4자리'), '1234');
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

        expect(await screen.findByText('팀을 삭제했어요.')).toBeInTheDocument();
        expect(pinBody).toEqual({ teamId: 'team-1', pin: '1234' });
        expect(new URL(deletedUrl).searchParams.get('id')).toBe('team-1');
    });

    it('소모임 버튼을 누르면 전체 이름으로 보여준다', async () => {
        const user = userEvent.setup();
        renderApp();

        await user.click(await screen.findByText('보소'));
        expect(await screen.findByText('보컬 소모임')).toBeInTheDocument();
    });
});
