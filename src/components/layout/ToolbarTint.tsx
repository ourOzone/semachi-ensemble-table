import { BOTTOM_DRAWERS, useDrawerStore } from '@/stores/drawer';

// 아이폰 사파리 26의 아래 도구 막대 색 고정 (V-3 7차).
// 사파리 26은 화면 아래 끝에 닿은 고정(position: fixed) 요소 중 가장 위(z-index)의 바탕색으로 도구 막대를 물들인다
// (Apple 문서는 없고, 개발자들의 실기기 확인: docs/ISSUES.md V14). 새 Drawer가 열려 있는 동안 팀 색으로 물드는 일이
// 여러 번 생겨(V-2 9차, V-3 5·6차), Drawer가 열려 있는 동안은 Drawer 바탕색 띠를 맨 위에 둬 그 색으로 고정한다.
// 띠는 화면 아래로 8px 내려가 4px만 보이고(아이폰에서는 도구 막대 밑), Drawer 아래 끝도 같은 바탕색이라 보이지 않는다.
// 다른 기기에는 그리지 않는다 (Drawer를 끌어내리는 동안 4px 띠가 보일 수 있어서)

/** 아이폰·아이패드 (모든 브라우저가 사파리 엔진. 아이패드는 데스크톱 UA라 터치 지점 수로 구분) */
function isIOS() {
    if (typeof navigator === 'undefined') return false;
    return (
        /iP(hone|ad|od)/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
}

const ToolbarTint = () => {
    const top = useDrawerStore((state) => state.openedDrawers[state.openedDrawers.length - 1]);
    if (!top || !BOTTOM_DRAWERS.includes(top) || !isIOS()) return null;
    return (
        <div
            aria-hidden
            data-toolbar-tint
            className="ui pointer-events-none fixed inset-x-0 -bottom-2 z-[2147483000] h-3 bg-surface"
        />
    );
};

export default ToolbarTint;
