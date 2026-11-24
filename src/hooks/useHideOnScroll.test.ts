import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { lockPageScroll } from '@/lib/pageScrollLock';
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

    it('뒤 페이지 고정 중(PIN 입력 등)의 스크롤 변화는 무시한다', () => {
        const { result } = renderHook(() => useHideOnScroll());
        scrollTo(500);
        expect(result.current).toBe(true);

        // 고정하면 scrollY가 0이 되지만 맨 위로 올라간 것이 아니다 (이전: 헤더가 나타났다가 풀 때 다시 숨었다)
        let unlock = () => {};
        act(() => {
            unlock = lockPageScroll();
        });
        scrollTo(0);
        expect(result.current).toBe(true);
        act(() => unlock());
        scrollTo(500);
        expect(result.current).toBe(true);
    });
});
