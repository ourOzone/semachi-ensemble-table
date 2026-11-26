import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToday } from './use-today';

describe('useToday', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 10, 22, 23, 59, 0)); // 2026-11-22(일) 23:59
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('자정이 지나면 다음 날로 갱신되고, 그다음 자정도 계속 갱신된다', () => {
        const { result } = renderHook(() => useToday());
        expect(result.current.format('MM-DD')).toBe('11-22');

        act(() => vi.advanceTimersByTime(59_000)); // 23:59:59
        expect(result.current.format('MM-DD')).toBe('11-22');

        act(() => vi.advanceTimersByTime(1_000)); // 00:00:00
        expect(result.current.format('MM-DD')).toBe('11-23');

        act(() => vi.advanceTimersByTime(24 * 60 * 60 * 1000));
        expect(result.current.format('MM-DD')).toBe('11-24');
    });

    it('언마운트하면 타이머를 정리한다', () => {
        const { unmount } = renderHook(() => useToday());
        unmount();

        expect(vi.getTimerCount()).toBe(0);
    });
});
