import type { Dayjs } from 'dayjs';
import type { DayIndex } from '@/types';

// 합주표 상단의 날짜 라벨용

/** 월요일 0 ~ 일요일 6 기준에서 오늘의 인덱스 */
export function getTodayIdx(now: Dayjs): DayIndex {
    return now.day() === 0 ? 6 : now.day() - 1;
}

/**
 * 합주표에 표시할 7일: 오늘이 속한 주의 월~일 (일요일은 마지막 날). 시각은 now 그대로.
 * 이전에는 dayjs의 day(1)(일요일 시작 주 기준)을 써서 일요일에 다음 주가 표시됐다 (ISSUES F2)
 */
export function getWeek(now: Dayjs): Dayjs[] {
    const monday = now.subtract(getTodayIdx(now), 'day');
    return Array.from({ length: 7 }, (_, i) => monday.add(i, 'day'));
}
