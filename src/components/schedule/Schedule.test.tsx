import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { url } from '@/constants';
import { ensembles } from '@/test/fixtures';
import { server } from '@/test/server';
import { mockInitialData } from '@/test/fixtures';
import { renderApp } from '@/test/render';

// fixtures의 합주: 매주 반복, 다음 날짜 2026-11-23(월), 시간칸 2~3 (10:00 - 11:00)
// 오늘은 2026-11-20(금) → 첫 화면("이번 주")은 오늘부터 7일 11/20(금) ~ 11/26(목), 다음 주부터는 일~토 (26차)

describe('합주판 (주 단위 캘린더)', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 10, 20, 10, 0));
        mockInitialData();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    /** 요일 머리글: [요일, 날짜, ("다음주")] 열마다 */
    const header = () =>
        [...document.querySelectorAll('[data-board-day]')].map((el) => el.textContent);

    it('첫 화면은 "이번 주"(오늘부터 7일), 다음 주부터 일~토로 12주 뒤까지, "오늘"로 돌아온다', async () => {
        const user = userEvent.setup();
        renderApp();

        expect(await screen.findByRole('heading', { name: '이번 주' })).toBeInTheDocument();
        // 오늘(금)이 맨 왼쪽, 날마다 한 칸씩 밀린다 (이전: 월~일)
        expect(header()).toEqual(['금20', '토21', '일22', '월23', '화24', '수25', '목26']);
        const prev = screen.getByRole('button', { name: '이전 주' });
        const next = screen.getByRole('button', { name: '다음 주' });
        const today = screen.getByRole('button', { name: '오늘' });
        expect(prev).toBeDisabled();
        expect(today).toBeDisabled();
        // 오늘(금요일 20일) 표시. 시간 라벨 '20'과 겹치므로 속성으로 찾는다 (요일이 크고 날짜가 작게: 24차)
        expect(document.querySelector('[aria-current="date"]')).toHaveTextContent(/^금\s*20$/);

        await user.click(next);
        // 다음 주는 일~토 (오늘부터 7일과 겹쳐도 그대로)
        expect(screen.getByRole('heading', { name: '11월 22일 – 28일' })).toBeInTheDocument();
        expect(header()).toEqual(['일22', '월23', '화24', '수25', '목26', '금27', '토28']);
        expect(prev).toBeEnabled();
        // 달의 첫날은 "12/1"
        await user.click(next);
        expect(header()).toEqual(['일29', '월30', '화12/1', '수2', '목3', '금4', '토5']);
        await user.click(screen.getByRole('button', { name: '이전 주' }));
        // 다른 주에는 오늘 표시가 없다
        expect(document.querySelector('[aria-current="date"]')).toBeNull();

        for (let i = 1; i < 12; i++) await user.click(next);
        expect(screen.getByRole('heading', { name: '2월 7일 – 13일' })).toBeInTheDocument();
        expect(next).toBeDisabled();

        await user.click(today);
        expect(screen.getByRole('heading', { name: '이번 주' })).toBeInTheDocument();
    });

    it('헤더 스위치로 요일 고정 보기: 일~토, 지난 요일은 다음 주 날짜에 "다음주"', async () => {
        const user = userEvent.setup();
        renderApp();
        await screen.findByRole('heading', { name: '이번 주' });

        const views = screen.getByRole('radiogroup', { name: '합주판 보기 방식' });
        expect(within(views).getByRole('radio', { name: '오늘부터 보기' })).toBeChecked();
        await user.click(within(views).getByRole('radio', { name: '요일 고정으로 보기' }));

        expect(screen.getByRole('heading', { name: '이번 주' })).toBeInTheDocument();
        // 금요일: 일~목은 지났으니 다음 주 날짜
        expect(header()).toEqual([
            '일22다음주',
            '월23다음주',
            '화24다음주',
            '수25다음주',
            '목26다음주',
            '금20',
            '토21',
        ]);
        expect(document.querySelector('[aria-current="date"]')).toHaveTextContent(/^금\s*20/);
        // 고른 방식은 기억한다
        expect(localStorage.getItem('semachi.boardView')).toBe('weekday');

        // 다음 주는 보기 방식과 관계없이 일~토
        await user.click(screen.getByRole('button', { name: '다음 주' }));
        expect(header()).toEqual(['일22', '월23', '화24', '수25', '목26', '금27', '토28']);
    });

    it('미룬 주는 "쉼", 그 뒤 주부터는 합주로 보인다', async () => {
        // 다음 합주 11/30(월) → 이번 주(11/23)는 쉼
        server.use(
            http.get(`${url}/ensembles`, () =>
                HttpResponse.json([{ ...ensembles[0]!, nextDate: '2026-11-30T00:00:00' }]),
            ),
        );
        const user = userEvent.setup();
        renderApp();

        const skipped = await screen.findByRole('button', {
            name: '테스트밴드 10:00–11:00 이번 주 쉼',
        });
        // 점선 블록은 시간 대신 다음 합주 날짜 (반복이면 "~")
        expect(within(skipped).getByText('11/30~')).toBeInTheDocument();
        expect(within(skipped).queryByText('10:00–11:00')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '다음 주' }));
        await user.click(screen.getByRole('button', { name: '다음 주' }));
        const normal = screen.getByRole('button', { name: '테스트밴드 10:00–11:00' });
        // 넓을 때의 한 줄·아주 좁을 때의 두 줄 표시가 함께 들어 있다 (CSS로 하나만 보임)
        expect(within(normal).getAllByText('10:00–11:00').length).toBeGreaterThan(0);
    });

    it('일회성 합주 블록에만 입장권 같은 반원 구멍 표시 (30분은 작게)', async () => {
        server.use(
            http.get(`${url}/ensembles`, () =>
                HttpResponse.json([
                    { ...ensembles[0]!, _id: 'r', day: 4, nextDate: '2026-11-20T00:00:00' },
                    {
                        ...ensembles[0]!,
                        _id: 'o',
                        teamName: '일회성',
                        day: 5,
                        startTime: 6,
                        endTime: 6,
                        repeat: false,
                        nextDate: '2026-11-21T00:00:00',
                    },
                ]),
            ),
        );
        renderApp();

        const repeat = await screen.findByRole('button', { name: '테스트밴드 10:00–11:00' });
        const oneTime = screen.getByRole('button', { name: '일회성 12:00–12:30' });
        expect(repeat).not.toHaveAttribute('data-one-time');
        expect(oneTime).toHaveAttribute('data-one-time');
        expect(oneTime.className).toContain('[--notch:3px]');
    });

    it('팀 목록은 "전체"로 펼치고, 펼친 동안은 "닫기"로 접는다', async () => {
        const user = userEvent.setup();
        renderApp();

        // 펼치면 버튼이 펼친 목록 안으로 옮겨 가므로(다시 그려짐) 매번 새로 찾는다
        const all = await screen.findByRole('button', { name: /전체/ });
        expect(all).toHaveAttribute('aria-expanded', 'false');

        await user.click(all);
        const close = screen.getByRole('button', { name: '닫기' });
        expect(close).toHaveAttribute('aria-expanded', 'true');
        expect(screen.queryByRole('button', { name: /전체/ })).toBeNull();

        await user.click(close);
        expect(screen.getByRole('button', { name: /전체/ })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
        expect(screen.queryByRole('button', { name: '닫기' })).toBeNull();
    });
});
