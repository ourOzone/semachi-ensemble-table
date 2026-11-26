import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useKeyboardInset } from './use-keyboard-inset';

// 화면 키보드가 가린 높이 = 레이아웃 영역 높이 - (보이는 영역의 위치 + 높이)

class FakeVisualViewport extends EventTarget {
    height = 844;
    offsetTop = 0;
    /** 문서 맨 위부터 보이는 영역 위 끝까지 (페이지 스크롤 300px + offsetTop) */
    pageTop = 300;
    set(height: number, offsetTop: number) {
        this.height = height;
        this.offsetTop = offsetTop;
        this.pageTop = 300 + offsetTop;
        this.dispatchEvent(new Event('resize'));
    }
}

function install(viewport: FakeVisualViewport | undefined) {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
}

describe('useKeyboardInset', () => {
    afterEach(() => install(undefined));

    it('visualViewport가 없으면 가린 높이 0', () => {
        install(undefined);
        const { result } = renderHook(() => useKeyboardInset());
        expect(result.current).toEqual({ inset: 0, viewportHeight: null, visibleBottom: null });
    });

    it('키보드가 열리면 가린 높이, 사파리가 보이는 영역을 스크롤한 만큼은 뺀다', () => {
        const viewport = new FakeVisualViewport();
        install(viewport);
        const { result } = renderHook(() => useKeyboardInset());
        expect(result.current).toEqual({ inset: 0, viewportHeight: 844, visibleBottom: 1144 });

        // 키보드 330px
        act(() => viewport.set(514, 0));
        expect(result.current).toEqual({ inset: 330, viewportHeight: 514, visibleBottom: 814 });

        // 사파리가 입력칸을 보이려고 보이는 영역을 120px 위로 스크롤: 가려진 아래쪽은 210px
        // (vaul은 이 스크롤을 빼지 않아 Drawer가 120px 더 올라갔다)
        act(() => viewport.set(514, 120));
        expect(result.current).toEqual({ inset: 210, viewportHeight: 514, visibleBottom: 934 });

        // 키보드를 닫으면 원래대로 (높이를 기억해 두지 않는다)
        act(() => viewport.set(844, 0));
        expect(result.current).toEqual({ inset: 0, viewportHeight: 844, visibleBottom: 1144 });
    });
});
