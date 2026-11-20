import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { getTodayIdx, getWeek } from './week';

// 테스트 시간대 Asia/Seoul. 2026-11-16(월) ~ 2026-11-22(일)
const dates = (now: dayjs.Dayjs) => getWeek(now).map((d) => d.format('MM-DD'));

describe('getTodayIdx', () => {
    it('월요일 0 ~ 일요일 6 기준의 오늘 인덱스', () => {
        expect(getTodayIdx(dayjs('2026-11-16T10:00'))).toBe(0); // 월
        expect(getTodayIdx(dayjs('2026-11-20T10:00'))).toBe(4); // 금
        expect(getTodayIdx(dayjs('2026-11-22T10:00'))).toBe(6); // 일
    });
});

describe('getWeek', () => {
    it('오늘이 속한 주의 월~일 7일을 돌려준다 (시각은 now 그대로)', () => {
        const now = dayjs('2026-11-20T10:00'); // 금

        expect(dates(now)).toEqual(['11-16', '11-17', '11-18', '11-19', '11-20', '11-21', '11-22']);
        expect(getWeek(now)[0]!.format('HH:mm')).toBe('10:00');
        expect(dates(dayjs('2026-11-16T10:00'))).toEqual(dates(now)); // 월
    });

    // ISSUES F2: 이전에는 일요일에 다음 주(11-23~11-29)가 표시됐다
    it('일요일에는 그 주의 마지막 날이다 (다음 주가 아님)', () => {
        expect(dates(dayjs('2026-11-22T23:59'))).toEqual(dates(dayjs('2026-11-20T10:00')));
    });

    it('주가 바뀌면 다음 주 월~일이 된다', () => {
        expect(dates(dayjs('2026-11-23T00:00'))).toEqual([
            '11-23',
            '11-24',
            '11-25',
            '11-26',
            '11-27',
            '11-28',
            '11-29',
        ]);
    });
});
