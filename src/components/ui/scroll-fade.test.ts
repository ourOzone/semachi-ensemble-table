import { describe, expect, it } from 'vitest';
import { attachScrollFade } from './scroll-fade';

// jsdom은 배치를 계산하지 않아 높이·스크롤 위치를 정해 두고 확인한다
function scroller(scrollHeight: number, clientHeight: number) {
    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollHeight', { value: scrollHeight });
    Object.defineProperty(el, 'clientHeight', { value: clientHeight });
    return el;
}

function fades(el: HTMLElement) {
    return { top: el.hasAttribute('data-fade-top'), bottom: el.hasAttribute('data-fade-bottom') };
}

describe('attachScrollFade', () => {
    it('더 있는 쪽 끝만 흐리게 하고, 스크롤하면 다시 계산한다', () => {
        const el = scroller(1000, 400);
        const detach = attachScrollFade(el);
        expect(fades(el)).toEqual({ top: false, bottom: true }); // 맨 위

        el.scrollTop = 300;
        el.dispatchEvent(new Event('scroll'));
        expect(fades(el)).toEqual({ top: true, bottom: true }); // 가운데

        el.scrollTop = 600;
        el.dispatchEvent(new Event('scroll'));
        expect(fades(el)).toEqual({ top: true, bottom: false }); // 맨 아래

        // 정리하면 더 이상 바꾸지 않는다
        detach();
        el.scrollTop = 0;
        el.dispatchEvent(new Event('scroll'));
        expect(fades(el)).toEqual({ top: true, bottom: false });
    });

    it('넘치지 않으면 흐리지 않는다', () => {
        const el = scroller(400, 400);
        attachScrollFade(el);
        expect(fades(el)).toEqual({ top: false, bottom: false });
    });
});
