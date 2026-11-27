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

/** 위·아래 흐림 진하기 (0~1) */
function fades(el: HTMLElement) {
    return {
        top: Number(el.style.getPropertyValue('--fade-top')),
        bottom: Number(el.style.getPropertyValue('--fade-bottom')),
    };
}

describe('attachScrollFade', () => {
    it('더 있는 쪽 끝만 흐리게 하고, 진하기는 끝까지 남은 거리(28px에서 최대)', () => {
        const el = scroller(1000, 400);
        const detach = attachScrollFade(el);
        expect(fades(el)).toEqual({ top: 0, bottom: 1 }); // 맨 위

        scrollTo(el, 14); // 위로 14px 남음: 절반
        expect(fades(el)).toEqual({ top: 0.5, bottom: 1 });

        scrollTo(el, 300);
        expect(fades(el)).toEqual({ top: 1, bottom: 1 });

        scrollTo(el, 600); // 맨 아래
        expect(fades(el)).toEqual({ top: 1, bottom: 0 });

        // 정리하면 더 이상 바꾸지 않는다
        detach();
        scrollTo(el, 0);
        expect(fades(el).top).toBe(1);
    });

    it('넘치지 않으면 흐리지 않는다', () => {
        const el = scroller(400, 400);
        attachScrollFade(el);
        expect(fades(el)).toEqual({ top: 0, bottom: 0 });
    });

    it('맨 위에 색 머리(data-fade-skip)가 있으면 위쪽은 흐리지 않는다', () => {
        const el = scroller(1000, 400);
        const header = document.createElement('div');
        header.setAttribute('data-fade-skip', '');
        el.append(header, document.createElement('div'));
        attachScrollFade(el);

        scrollTo(el, 300); // 머리가 다 지나간 뒤에도
        expect(fades(el)).toEqual({ top: 0, bottom: 1 });
    });
});
