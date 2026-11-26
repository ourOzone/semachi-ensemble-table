import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDrawerStore } from '@/stores/drawer';
import ToolbarTint from './toolbar-tint';

const IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1';

function tint() {
    return document.querySelector('[data-toolbar-tint]');
}

describe('ToolbarTint', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('아이폰에서 Drawer가 열려 있는 동안만 바탕색 띠를 그린다', () => {
        vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
        const { rerender } = render(<ToolbarTint />);
        expect(tint()).toBeNull(); // 열린 Drawer 없음

        useDrawerStore.getState().setOpenedDrawers(['teamInfo']);
        rerender(<ToolbarTint />);
        expect(tint()).toHaveClass('fixed', 'bg-surface');

        // 모두 닫으면 그리지 않는다 (V-6: 옛 Drawer가 위에 쌓이는 경우는 옛 Drawer와 함께 사라짐)
        useDrawerStore.getState().closeAllDrawers();
        rerender(<ToolbarTint />);
        expect(tint()).toBeNull();
    });

    it('아이폰이 아니면 그리지 않는다', () => {
        useDrawerStore.getState().setOpenedDrawers(['teamInfo']);
        render(<ToolbarTint />);
        expect(tint()).toBeNull();
    });
});
