import { useSyncExternalStore } from 'react';

/**
 * 화면 키보드 등으로 가려진 아래쪽 높이(inset), 보이는 영역의 높이(viewportHeight),
 * 보이는 영역 아래 끝의 문서 기준 위치(visibleBottom: 문서 맨 위부터의 px). 모두 px.
 * 아래에서 올라오는 Drawer의 내용을 보이는 영역의 아래 끝(키보드 바로 위)까지 올리고(아래 여백), 보이는 영역 안에 들어가게 하고,
 * 키보드 쪽에 비치는 페이지를 덮을 때 쓴다 (EnsembleInfoDrawer의 KeyboardCover).
 *
 * vaul의 repositionInputs를 쓰지 않는 이유 (V-2 16차, 아이폰 사파리):
 * - 키보드가 열리면 사파리가 입력칸을 보이려고 보이는 영역(visual viewport)을 위로 스크롤하는데, vaul은 이를 빼지 않고
 *   키보드 높이만큼 Drawer를 올려 두 번 올라갔다 (위가 잘리고, Drawer와 키보드 사이로 뒤 화면이 보임)
 * - 처음 키보드를 열 때의 Drawer 높이를 기억해 두었다가 키보드를 닫을 때 그 높이로 고정해, 내용이 바뀐 뒤(PIN → 정보)에도
 *   작은 높이가 남아 스크롤이 생겼다
 *
 * position: fixed 요소는 레이아웃 영역 기준이므로, 보이는 영역의 아래 끝(offsetTop + height)부터 레이아웃 영역 아래 끝까지가 가려진 높이다.
 * visualViewport가 없으면(오래된 브라우저·테스트 환경) inset 0, 나머지 null.
 */
export interface KeyboardInset {
    inset: number;
    viewportHeight: number | null;
    visibleBottom: number | null;
}

const NONE = '0||';

function subscribe(onChange: () => void) {
    const viewport = window.visualViewport;
    if (!viewport) return () => {};
    viewport.addEventListener('resize', onChange);
    viewport.addEventListener('scroll', onChange);
    window.addEventListener('scroll', onChange);
    return () => {
        viewport.removeEventListener('resize', onChange);
        viewport.removeEventListener('scroll', onChange);
        window.removeEventListener('scroll', onChange);
    };
}

// 값이 같으면 같은 문자열을 돌려줘 다시 그리지 않는다
function getSnapshot(): string {
    const viewport = window.visualViewport;
    if (!viewport) return NONE;
    const covered = window.innerHeight - (viewport.offsetTop + viewport.height);
    const visibleBottom = viewport.pageTop + viewport.height;
    return `${Math.max(0, Math.round(covered))}|${Math.round(viewport.height)}|${Math.round(visibleBottom)}`;
}

export function useKeyboardInset(): KeyboardInset {
    const snapshot = useSyncExternalStore(subscribe, getSnapshot);
    const [inset, viewportHeight, visibleBottom] = snapshot.split('|');
    return {
        inset: Number(inset),
        viewportHeight: viewportHeight ? Number(viewportHeight) : null,
        visibleBottom: visibleBottom ? Number(visibleBottom) : null,
    };
}
