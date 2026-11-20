import { useState, useEffect } from 'react';

/** window의 세로 스크롤 위치(px) */
const useScrollPosition = (): number => {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };

        // 초기값 설정
        handleScroll();

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return scrollY;
};

export default useScrollPosition;
