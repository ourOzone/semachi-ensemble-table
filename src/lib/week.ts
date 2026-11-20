import type { Dayjs } from 'dayjs';
import type { DayIndex } from '@/types';

// 합주표 상단의 날짜 라벨용

/** 월요일 0 ~ 일요일 6 기준에서 오늘의 인덱스 */
export function getTodayIdx(now: Dayjs): DayIndex {
    return now.day() === 0 ? 6 : now.day() - 1;
}

/**
 * 합주표에 표시할 7일 (월~일, 시각은 now 그대로).
 * dayjs의 day(1)은 일요일 시작 주 기준이라, 일요일에는 다음 주 월요일부터가 된다 (ISSUES F2, 3-3에서 수정 예정)
 */
export function getWeek(now: Dayjs): Dayjs[] {
    return Array.from({ length: 7 }, (_, i) => now.day(1).add(i, 'day'));
}
