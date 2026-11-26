import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { LOCKED_SCROLL_VAR, lockPageScroll } from '@/lib/page-scroll-lock';

// 입력칸이 있는 아래 Drawer의 키보드 처리 (V-2 16~20차에 합주 정보 Drawer의 PIN 단계에서 만들고,
// V-3 9차에 팀 정보 Drawer의 팀 삭제 PIN 단계와 함께 쓰려고 여기로 옮김, 10차에 팀 추가 Drawer(글자 입력)도. 동작은 그대로).
// 입력칸이 있는 새 Drawer는 모두 이것을 쓴다 (ISSUES V12)
// Drawer에는 repositionInputs={false}를 주고, DrawerContent에 style, Drawer 안에 cover를 그린다.

/**
 * @param inputsOpen 입력칸이 있는 화면이 열려 있는지 (Drawer가 열려 있고 PIN 단계일 때 등)
 * @returns style: DrawerContent의 아래 여백·최대 높이, cover: 키보드 쪽 흰 판 (없으면 null)
 */
export function useKeyboardSheet(inputsOpen: boolean): {
    style: CSSProperties;
    cover: ReactNode;
    /** 화면 키보드가 열려 있는지 (보이는 영역이 줄었는지). 키보드를 쓰는 동안 아래 버튼을 숨길 때 (팀 추가, V-3 11차) */
    keyboardOpen: boolean;
} {
    // 화면 키보드가 열리면 내용을 보이는 영역의 아래 끝(키보드 바로 위)까지 올리고, 그 안에 들어가게 한다 (hooks/use-keyboard-inset).
    // Drawer 자체는 화면 맨 아래에 둔 채 키보드 높이만큼 아래 여백을 준다: Drawer의 흰 바탕이 키보드 뒤까지 덮어,
    // 키보드 위 막대(완료 버튼)와 반투명 키보드 사이로 뒤 화면이 비치지 않는다
    // (17차, 이전: Drawer를 키보드 높이만큼 올렸더니 아이폰에서 그 아래가 비었다)
    const { inset, viewportHeight, visibleBottom } = useKeyboardInset();

    // 입력하는 동안 뒤 페이지를 스크롤할 수 없게 고정한다 (20차, lib/page-scroll-lock).
    // 아이폰 사파리는 입력칸에 포커스가 가거나 커서가 움직일 때마다(틀린 PIN을 비울 때 등) 입력칸을 보이려고 페이지를 스크롤한다.
    // Drawer 위치는 보이는 영역 기준으로 직접 맞추므로 이 스크롤은 필요 없고, 뒤 합주판만 계속 내려갔다
    useEffect(() => (inputsOpen ? lockPageScroll() : undefined), [inputsOpen]);

    const style: CSSProperties = {
        paddingBottom: inset > 0 ? `${inset}px` : undefined,
        // 높이에는 아래 여백(키보드)이 들어가므로, 보이는 부분 = 보이는 영역 - 위 12px
        maxHeight:
            viewportHeight === null
                ? undefined
                : inset > 0
                  ? `${viewportHeight - 12 + inset}px`
                  : `min(92dvh, ${viewportHeight - 12}px)`,
    };
    const cover =
        inputsOpen && visibleBottom !== null ? (
            <KeyboardCover visibleBottom={visibleBottom} />
        ) : null;
    return { style, cover, keyboardOpen: inset > 0 };
}

/** KeyboardCover가 보이는 영역 아래 끝보다 얼마나 위에서 시작하는지 (Drawer 아래에 숨는 부분, 줄바꿈 오차 여유) */
const KEYBOARD_COVER_OVERLAP = 240;
/**
 * 흰 판의 높이: 키보드(약 300~400px)와 그 위 막대를 덮고도 남게. 너무 길면 문서가 그만큼 길어져
 * 사파리가 입력칸을 보이려고 스크롤할 공간이 생긴다 (19차 이전 3000px: 틀릴 때마다 뒤 페이지가 계속 내려갔다)
 */
const KEYBOARD_COVER_HEIGHT = 1000;

/**
 * 아이폰 사파리 26: 키보드 위 막대(^ v 완료)와 반투명 키보드 쪽에는 고정(position: fixed) 요소가 아니라
 * "페이지 내용"의 그 부분이 그대로 비친다 (어둡게 하는 덮개·Drawer·vaul의 흰 연장 모두 닿지 않음. 17차까지 그대로였던 이유).
 * 그래서 페이지 문서 안에(absolute) 흰 판을 깔아, 보이는 영역 아래 끝 조금 위부터 그 아래를 덮는다.
 * 보이는 영역 안에 걸친 부분은 Drawer(z-50) 아래에 숨는다. 보이는 영역 밖이라 다른 브라우저에서는 보이지 않는다
 */
const KeyboardCover = ({ visibleBottom }: { visibleBottom: number }) =>
    createPortal(
        <div
            aria-hidden
            data-keyboard-cover
            className="pointer-events-none absolute inset-x-0 z-40 bg-surface"
            style={{
                // body가 고정(lockPageScroll)되면 body 기준 위치라 고정할 때의 스크롤만큼 더한다
                top: `calc(var(${LOCKED_SCROLL_VAR}, 0px) + ${visibleBottom - KEYBOARD_COVER_OVERLAP}px)`,
                height: `${KEYBOARD_COVER_HEIGHT}px`,
            }}
        />,
        document.body,
    );
