import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useHideOnScroll } from './useHideOnScroll';

function scrollTo(y: number) {
    act(() => {
        Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
        window.dispatchEvent(new Event('scroll'));
    });
}

describe('useHideOnScroll', () => {
    afterEach(() => {
        Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    });

    it('내리면 숨고, 올리면 다시 보인다', () => {
        const { result } = renderHook(() => useHideOnScroll());
        expect(result.current).toBe(false);

        scrollTo(300);
        expect(result.current).toBe(true);

        scrollTo(250);
        expect(result.current).toBe(false);
    });

    it('맨 위 근처(헤더 높이 이내)에서는 내려도 보인다', () => {
        const { result } = renderHook(() => useHideOnScroll());
        scrollTo(40);
        expect(result.current).toBe(false);
    });

    it('아주 조금 움직이면 무시한다', () => {
        const { result } = renderHook(() => useHideOnScroll());
        scrollTo(300);
        scrollTo(298);
        expect(result.current).toBe(true);
    });
});
