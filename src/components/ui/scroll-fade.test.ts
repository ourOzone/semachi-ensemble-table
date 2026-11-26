import { describe, expect, it } from 'vitest';
import { attachScrollFade } from './scroll-fade';

// jsdom은 배치를 계산하지 않아 높이·스크롤 위치를 정해 두고 확인한다
function scroller(scrollHeight: number, clientHeight: number) {
    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollHeight', { value: scrollHeight });
    Object.defineProperty(el, 'clientHeight', { value: clientHeight });
    return el;
}

function scrollTo(el: HTMLElement, top: number) {
    el.scrollTop = top;
    el.dispatchEvent(new Event('scroll'));
}

function fades(el: HTMLElement) {
    return {
        top: el.hasAttribute('data-fade-top'),
        bottom: el.hasAttribute('data-fade-bottom'),
        topPx: el.style.getPropertyValue('--fade-top'),
        bottomPx: el.style.getPropertyValue('--fade-bottom'),
    };
}

describe('attachScrollFade', () => {
    it('더 있는 쪽 끝만 흐리게 하고, 흐림 폭은 끝까지 남은 거리(최대 28px)', () => {
        const el = scroller(1000, 400);
        const detach = attachScrollFade(el);
        expect(fades(el)).toEqual({ top: false, bottom: true, topPx: '0px', bottomPx: '28px' });

        scrollTo(el, 10); // 위로 10px 남음: 그만큼만 흐림
        expect(fades(el)).toEqual({ top: true, bottom: true, topPx: '10px', bottomPx: '28px' });

        scrollTo(el, 300);
        expect(fades(el)).toEqual({ top: true, bottom: true, topPx: '28px', bottomPx: '28px' });

        scrollTo(el, 600); // 맨 아래
        expect(fades(el)).toEqual({ top: true, bottom: false, topPx: '28px', bottomPx: '0px' });

        // 정리하면 더 이상 바꾸지 않는다
        detach();
        scrollTo(el, 0);
        expect(fades(el).top).toBe(true);
    });

    it('넘치지 않으면 흐리지 않는다', () => {
        const el = scroller(400, 400);
        attachScrollFade(el);
        expect(fades(el)).toMatchObject({ top: false, bottom: false });
    });

    it('맨 위 색 머리(data-fade-skip)가 다 지나간 뒤부터 위쪽을 흐린다', () => {
        const el = scroller(1000, 400);
        const header = document.createElement('div');
        header.setAttribute('data-fade-skip', '');
        Object.defineProperty(header, 'offsetHeight', { value: 200 });
        el.append(header, document.createElement('div'));
        attachScrollFade(el);

        scrollTo(el, 150); // 머리가 아직 보임
        expect(fades(el)).toMatchObject({ top: false, topPx: '0px' });
        scrollTo(el, 210); // 머리가 지나고 10px
        expect(fades(el)).toMatchObject({ top: true, topPx: '10px' });
    });
});
