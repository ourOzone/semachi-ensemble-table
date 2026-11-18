import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithTheme } from '@/test/render';
import OkButton from './OkButton';

// OkButton은 아직 JS라서 disabled가 필수 prop으로 추론된다. TS 전환 후 disabled={false}는 제거 가능.

describe('OkButton', () => {
    it('label을 표시하고, 클릭하면 onClick을 호출한다', async () => {
        const onClick = vi.fn<() => void>();
        renderWithTheme(<OkButton disabled={false} label="완료" onClick={onClick} />);

        await userEvent.setup().click(screen.getByRole('button', { name: '완료' }));

        expect(onClick).toHaveBeenCalledOnce();
    });

    it('label이 없으면 "확인"을 표시한다', () => {
        renderWithTheme(<OkButton disabled={false} />);

        expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument();
    });

    it('disabled면 비활성화되고 화면에서 숨겨진다', () => {
        renderWithTheme(<OkButton disabled label="완료" />);

        // disabled일 때 visibility: hidden 처리되어 accessible name이 비므로, name 없이 hidden 포함 조회
        const button = screen.getByRole('button', { hidden: true });
        expect(button).toBeDisabled();
        expect(button).not.toBeVisible();
    });
});
