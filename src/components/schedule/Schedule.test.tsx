import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockInitialData } from '@/test/fixtures';
import { renderApp } from '@/test/render';

// fixtures의 합주: 매주 반복, 다음 날짜 2026-11-23(월), 시간칸 2~3 (10:00 - 11:00)
// 오늘은 2026-11-20(금) → 이번 주(11/16~22) 월요일은 nextDate 직전 주라 "쉼"

describe('합주판 (주 단위 캘린더)', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 10, 20, 10, 0));
        mockInitialData();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('이번 주부터 12주 뒤까지 넘겨 볼 수 있고, "오늘"로 돌아온다', async () => {
        const user = userEvent.setup();
        renderApp();

        expect(
            await screen.findByRole('heading', { name: '11월 16일 – 22일' }),
        ).toBeInTheDocument();
        const prev = screen.getByRole('button', { name: '이전 주' });
        const next = screen.getByRole('button', { name: '다음 주' });
        const today = screen.getByRole('button', { name: '오늘' });
        expect(prev).toBeDisabled();
        expect(today).toBeDisabled();
        // 오늘(20일) 표시. 시간 라벨 '20'과 겹치므로 속성으로 찾는다
        expect(document.querySelector('[aria-current="date"]')).toHaveTextContent(/^20$/);

        await user.click(next);
        expect(screen.getByRole('heading', { name: '11월 23일 – 29일' })).toBeInTheDocument();
        expect(prev).toBeEnabled();
        // 다른 주에는 오늘 표시가 없다
        expect(document.querySelector('[aria-current="date"]')).toBeNull();

        for (let i = 1; i < 12; i++) await user.click(next);
        expect(screen.getByRole('heading', { name: '2월 8일 – 14일' })).toBeInTheDocument();
        expect(next).toBeDisabled();

        await user.click(today);
        expect(screen.getByRole('heading', { name: '11월 16일 – 22일' })).toBeInTheDocument();
    });

    it('미룬 주는 "쉼", 다음 주부터는 합주로 보인다', async () => {
        const user = userEvent.setup();
        renderApp();

        const skipped = await screen.findByRole('button', {
            name: '테스트밴드 10:00–11:00 이번 주 쉼',
        });
        // 점선 블록은 시간 대신 다음 합주 날짜 (반복이면 "~")
        expect(within(skipped).getByText('11/23~')).toBeInTheDocument();
        expect(within(skipped).queryByText('10:00–11:00')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '다음 주' }));
        const normal = screen.getByRole('button', { name: '테스트밴드 10:00–11:00' });
        // 넓을 때의 한 줄·아주 좁을 때의 두 줄 표시가 함께 들어 있다 (CSS로 하나만 보임)
        expect(within(normal).getAllByText('10:00–11:00').length).toBeGreaterThan(0);
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
