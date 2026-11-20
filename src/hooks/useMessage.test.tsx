import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithTheme } from '@/test/render';
import useMessage from './useMessage';

function MessageTester() {
    const [message, contextHolder] = useMessage();
    return (
        <>
            {contextHolder}
            <button onClick={() => message.success('잘 등록했어요.')}>success</button>
            <button onClick={() => message.error('실패했어요.')}>error</button>
        </>
    );
}

describe('useMessage', () => {
    it('알림 문구를 화면에 띄운다', async () => {
        const user = userEvent.setup();
        renderWithTheme(<MessageTester />);

        await user.click(screen.getByRole('button', { name: 'success' }));

        expect(await screen.findByText('잘 등록했어요.')).toBeInTheDocument();
    });

    it('새 알림을 띄우면 이전 알림은 사라진다', async () => {
        const user = userEvent.setup();
        renderWithTheme(<MessageTester />);

        await user.click(screen.getByRole('button', { name: 'success' }));
        await screen.findByText('잘 등록했어요.');
        await user.click(screen.getByRole('button', { name: 'error' }));

        expect(await screen.findByText('실패했어요.')).toBeInTheDocument();

        // 이전 알림은 퇴장 애니메이션이 끝나야 DOM에서 빠진다. jsdom은 애니메이션 종료 이벤트를
        // 보내지 않으므로, 퇴장 애니메이션이 진행 중(leave-active)이 된 뒤 브라우저처럼 직접 발생시킨다.
        // (antd 내부 클래스명에 의존한다. antd를 Sonner로 바꿀 때 이 테스트도 함께 고친다.)
        const previous = screen
            .getByText('잘 등록했어요.')
            .closest<HTMLElement>('.ant-message-notice-wrapper');
        expect(previous).not.toBeNull();
        await waitFor(() => expect(previous!.className).toContain('leave-active'));
        fireEvent.animationEnd(previous!);
        fireEvent.transitionEnd(previous!);

        await waitFor(() => expect(screen.queryByText('잘 등록했어요.')).not.toBeInTheDocument());
        expect(screen.getByText('실패했어요.')).toBeInTheDocument();
    });
});
