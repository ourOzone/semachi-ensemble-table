// 스크롤 영역의 위·아래 흐림 (V-3 5차). CSS는 index.css의 edge-fade 유틸리티 (shadcn의 scroll-fade와는 다르다).
// 새 코드의 세로 스크롤 영역은 모두 `edge-fade` 클래스 + `ref={scrollFadeRef}`로 쓴다 (스크롤 막대 없음, CLAUDE.md 규칙).
// 흐림의 진하기(0~1)는 끝까지 남은 거리로 정해(FADE px에서 1) 부드럽게 생기고 사라진다.
// React state가 아니라 DOM 스타일이라 다시 그리지 않는다.
//
// 색 머리(팀 색 등): 스크롤 영역 맨 위 자식에 data-fade-skip을 붙이면 위쪽은 흐리지 않는다 (V-3 7차, 사용자 결정).
// 흐림은 바탕색(흰색·검은색) 그러데이션이라 노랑 머리가 흰색·검은색으로 흐려지는 배합이 보기 싫었다.
// 6차에는 "머리가 다 지나간 뒤부터"였는데, 끝까지 내려도 머리가 남는 애매한 길이에서는 흐림이 생겼다

/** 흐림 높이 (px, index.css의 edge-fade와 같음) */
const FADE = 28;
/** 끝에 닿았다고 보는 여유 (소수점 배율에서 scrollTop이 정수로 딱 맞지 않는다) */
const EDGE = 1;

/** 끝까지 남은 거리 → 흐림 진하기 0~1 */
const strength = (distance: number) => Math.min(FADE, Math.max(0, distance)) / FADE;

/** 스크롤·크기 변화를 지켜보며 흐림을 정한다. 돌려받은 함수로 정리한다 */
export function attachScrollFade(el: HTMLElement): () => void {
    const update = () => {
        const skipTop = el.querySelector(':scope > [data-fade-skip]') !== null;
        const top = skipTop ? 0 : strength(el.scrollTop);
        const bottom = strength(el.scrollHeight - el.clientHeight - el.scrollTop);
        el.style.setProperty('--fade-top', String(top));
        el.style.setProperty('--fade-bottom', String(bottom));
        // 지금 흐리는 쪽 (확인·디버깅용)
        el.toggleAttribute('data-fade-top', top * FADE > EDGE);
        el.toggleAttribute('data-fade-bottom', bottom * FADE > EDGE);
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
