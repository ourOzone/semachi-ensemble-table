import { useEffect, useState } from 'react';
import { isPageScrollLocked } from '@/lib/pageScrollLock';

/** 이 높이보다 위에서는 항상 보인다 (헤더 높이 정도) */
const SHOW_NEAR_TOP = 64;
/** 이보다 적게 움직이면 무시한다 (손가락 떨림·관성 끝의 작은 움직임) */
const MIN_DELTA = 4;

/**
 * 스크롤을 내리면 true(숨김), 올리면 false(보임). 맨 위 근처에서는 항상 false.
 * 헤더가 스크롤을 내리면 들어가고 올리면 다시 나오게 할 때 쓴다 (View 개편 V-2)
 */
export function useHideOnScroll(): boolean {
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        let lastY = window.scrollY;
        const onScroll = () => {
            // 뒤 페이지 고정 중(PIN 입력 등)에는 scrollY가 0이 되고, 풀면 원래 위치로 돌아온다 → 무시
            // (무시하지 않으면 고정할 때 맨 위로 본 것으로 여겨 헤더가 나타났다가 풀 때 다시 숨었다)
            if (isPageScrollLocked()) return;
            const y = window.scrollY;
            if (Math.abs(y - lastY) < MIN_DELTA) return;
            setHidden(y > lastY && y > SHOW_NEAR_TOP);
            lastY = y;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return hidden;
}
