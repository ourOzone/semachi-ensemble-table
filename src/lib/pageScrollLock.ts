// 뒤 페이지 스크롤 고정 (View 개편 V-2 20차). 아래에서 올라오는 Drawer에서 화면 키보드를 쓰는 동안(PIN 단계) 쓴다.
//
// body를 position: fixed(top: -스크롤 위치)로 두면 화면은 그대로인 채 문서에 스크롤할 공간이 없어진다 (아이폰 사파리의 일반적인 방법).
// 아이폰 사파리는 입력칸에 포커스가 가거나 커서가 움직일 때마다(틀린 PIN을 비울 때 등) 입력칸을 보이려고 페이지를 스크롤해,
// 뒤 합주판이 계속 내려갔다.
// - 19차는 사파리가 스크롤한 뒤 되돌렸는데, 내려갔다 올라오는 사이 화면 위쪽에 흰 영역이 생겼다 사라져 크게 깜빡였다
// - vaul에도 같은 기능(usePositionFixed)이 있지만, Drawer를 vaul의 Trigger로 열었을 때만 켜져(hasBeenOpened)
//   Drawer 스택(stores/drawer)으로 여는 이 앱에서는 한 번도 동작하지 않았다
// 고정하는 동안 window.scrollY는 0이므로, 스크롤을 보는 코드(헤더 숨김 등)는 isPageScrollLocked()이면 무시한다.

/** 고정할 때의 스크롤 위치를 body에 CSS 변수로 남긴다 (body 기준으로 위치를 잡는 요소용) */
export const LOCKED_SCROLL_VAR = '--locked-scroll-y';

const LOCK_ATTR = 'data-page-scroll-locked';

export function isPageScrollLocked(): boolean {
    return document.body.hasAttribute(LOCK_ATTR);
}

/**
 * 뒤 페이지를 고정하고, 풀어 주는 함수를 돌려준다 (풀면 원래 스크롤 위치로).
 * Radix Dialog의 스크롤 잠금이 body에 position: relative !important를 주므로 important로 덮는다
 */
export function lockPageScroll(): () => void {
    const { scrollX, scrollY } = window;
    const style = document.body.style;
    const previous = {
        position: style.getPropertyValue('position'),
        priority: style.getPropertyPriority('position'),
        top: style.top,
        left: style.left,
        right: style.right,
    };
    style.setProperty('position', 'fixed', 'important');
    Object.assign(style, { top: `${-scrollY}px`, left: `${-scrollX}px`, right: '0px' });
    style.setProperty(LOCKED_SCROLL_VAR, `${scrollY}px`);
    document.body.setAttribute(LOCK_ATTR, '');

    return () => {
        if (previous.position) style.setProperty('position', previous.position, previous.priority);
        else style.removeProperty('position');
        Object.assign(style, { top: previous.top, left: previous.left, right: previous.right });
        style.removeProperty(LOCKED_SCROLL_VAR);
        window.scrollTo(scrollX, scrollY);
        document.body.removeAttribute(LOCK_ATTR);
    };
}
