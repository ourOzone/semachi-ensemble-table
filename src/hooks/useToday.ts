import { useEffect, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';

/**
 * 오늘(호출 시점의 현재 시각). 자정이 지나면 새 값으로 다시 렌더링한다.
 * 합주표의 날짜 라벨·"오늘" 표시가 페이지를 켜 둔 채 날짜가 바뀌어도 갱신되도록 쓴다 (ISSUES F2)
 */
export function useToday(): Dayjs {
    const [today, setToday] = useState(() => dayjs());

    useEffect(() => {
        // 다음 자정까지 기다렸다가 갱신. 타이머가 일찍 끝나도 다시 예약되므로 날짜가 바뀐 뒤에 맞춰진다
        const msUntilMidnight = today.add(1, 'day').startOf('day').diff(dayjs());
        const timer = setTimeout(() => setToday(dayjs()), Math.max(msUntilMidnight, 0));
        return () => clearTimeout(timer);
    }, [today]);

    return today;
}
