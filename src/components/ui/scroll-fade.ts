// 스크롤 영역의 위·아래 흐림 (V-3 5차). CSS는 index.css의 scroll-fade 유틸리티.
// 새 코드의 세로 스크롤 영역은 모두 `scroll-fade` 클래스 + `ref={scrollFadeRef}`로 쓴다 (스크롤 막대 없음, CLAUDE.md 규칙).
// 흐림 폭은 끝까지 남은 거리만큼(최대 FADE) 늘어 부드럽게 생기고 사라진다. React state가 아니라 DOM 스타일이라 다시 그리지 않는다.
//
// 색 머리(팀 색 등): 스크롤 영역 맨 위 자식에 data-fade-skip을 붙이면, 그 머리가 위로 다 지나간 뒤부터 위쪽을 흐린다 (V-3 6차).
// 흐림은 마스크(투명하게)라 뒤의 Drawer 바탕(흰색·검은색)이 비치는데, 노랑 머리가 흰색·검은색으로 흐려지는 배합이 보기 싫었다

/** 흐림 폭 (px) */
const FADE = 28;
/** 끝에 닿았다고 보는 여유 (소수점 배율에서 scrollTop이 정수로 딱 맞지 않는다) */
const EDGE = 1;

const clamp = (value: number) => Math.min(FADE, Math.max(0, value));

/** 스크롤·크기 변화를 지켜보며 흐림을 정한다. 돌려받은 함수로 정리한다 */
export function attachScrollFade(el: HTMLElement): () => void {
    const update = () => {
        const skip = el.querySelector<HTMLElement>(':scope > [data-fade-skip]');
        const top = clamp(el.scrollTop - (skip?.offsetHeight ?? 0));
        const bottom = clamp(el.scrollHeight - el.clientHeight - el.scrollTop);
        el.style.setProperty('--fade-top', `${top}px`);
        el.style.setProperty('--fade-bottom', `${bottom}px`);
        // 마스크는 흐릴 곳이 있을 때만 건다 (index.css)
        el.toggleAttribute('data-fade-top', top > EDGE);
        el.toggleAttribute('data-fade-bottom', bottom > EDGE);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });

    // 내용이 늘거나 줄면(달력 펼침, 단계 바뀜 등) 다시 계산한다. 직접 자식의 크기를 지켜보고, 자식이 바뀌면 다시 붙인다.
    // ResizeObserver가 없는 환경(테스트의 jsdom)에서는 처음 한 번과 스크롤 때만
    let resize: ResizeObserver | undefined;
    let mutation: MutationObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(update);
        const observeAll = () => {
            observer.disconnect();
            observer.observe(el);
            for (const child of Array.from(el.children)) observer.observe(child);
        };
        observeAll();
        resize = observer;
        mutation = new MutationObserver(() => {
            observeAll();
            update();
        });
        mutation.observe(el, { childList: true });
    }

    return () => {
        el.removeEventListener('scroll', update);
        resize?.disconnect();
        mutation?.disconnect();
    };
}

/** 스크롤 영역에 그대로 넘기는 ref (모듈 수준이라 렌더링마다 바뀌지 않는다, React 19의 ref 정리 함수 사용) */
export const scrollFadeRef = (el: HTMLElement | null) => (el ? attachScrollFade(el) : undefined);
