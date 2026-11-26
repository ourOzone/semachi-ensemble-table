// 스크롤 영역의 위·아래 흐림 (V-3 5차). CSS는 index.css의 scroll-fade 유틸리티.
// 새 코드의 세로 스크롤 영역은 모두 `scroll-fade` 클래스 + `ref={scrollFadeRef}`로 쓴다 (스크롤 막대 없음, CLAUDE.md 규칙).
// 위로 더 있으면 data-fade-top, 아래로 더 있으면 data-fade-bottom을 붙인다. React state가 아니라 DOM 속성이라 다시 그리지 않는다.

/** 끝에 닿았다고 보는 여유 (소수점 배율에서 scrollTop이 정수로 딱 맞지 않는다) */
const EDGE = 1;

/** 스크롤·크기 변화를 지켜보며 흐림 속성을 붙인다. 돌려받은 함수로 정리한다 */
export function attachScrollFade(el: HTMLElement): () => void {
    const update = () => {
        el.toggleAttribute('data-fade-top', el.scrollTop > EDGE);
        el.toggleAttribute(
            'data-fade-bottom',
            el.scrollTop + el.clientHeight < el.scrollHeight - EDGE,
        );
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
