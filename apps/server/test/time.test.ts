// 한국 날짜 계산 (lib/time.ts, B-8 D1). 서버 시간대 설정과 관계없이 같은 답인지
import { afterEach, describe, expect, test } from 'vitest';
import { kstDateString, kstDayIndex, msUntilNextKstHour, startOfKstDay } from '../src/lib/time.ts';

const originalTz = process.env.TZ;
afterEach(() => {
    process.env.TZ = originalTz;
});

describe('startOfKstDay', () => {
    test('한국 날짜의 0시 (= 전날 15:00Z). 경계: KST 0시 직전·정각', () => {
        const iso = (s: string) => startOfKstDay(new Date(s)).toISOString();
        expect(iso('2026-11-27T10:00:00Z')).toBe('2026-11-26T15:00:00.000Z'); // KST 11/27 19:00
        expect(iso('2026-11-26T23:00:00Z')).toBe('2026-11-26T15:00:00.000Z'); // KST 11/27 08:00
        expect(iso('2026-11-27T14:59:59.999Z')).toBe('2026-11-26T15:00:00.000Z'); // KST 11/27 23:59
        expect(iso('2026-11-27T15:00:00Z')).toBe('2026-11-27T15:00:00.000Z'); // KST 11/28 00:00
        expect(iso('2026-12-31T16:00:00Z')).toBe('2026-12-31T15:00:00.000Z'); // 해 바뀜: KST 2027/1/1
    });

    test('서버 시간대(TZ)가 달라도 같다', () => {
        const now = new Date('2026-11-26T23:00:00Z');
        const results = ['UTC', 'Asia/Seoul', 'America/Los_Angeles'].map((tz) => {
            process.env.TZ = tz;
            return startOfKstDay(now).toISOString();
        });
        expect(new Set(results).size).toBe(1);
    });
});

describe('kstDayIndex (월 0 ~ 일 6)', () => {
    test('한국 날짜의 요일', () => {
        expect(kstDayIndex(new Date('2026-11-23T00:00:00+09:00'))).toBe(0); // 월
        expect(kstDayIndex(new Date('2026-11-29T23:59:00+09:00'))).toBe(6); // 일
        // UTC로는 일요일 23:00이지만 한국은 월요일 08:00
        expect(kstDayIndex(new Date('2026-11-29T23:00:00Z'))).toBe(0);
    });

    test('서버 시간대(TZ)가 달라도 같다', () => {
        const date = new Date('2026-11-29T23:00:00Z');
        const results = ['UTC', 'Asia/Seoul', 'America/Los_Angeles'].map((tz) => {
            process.env.TZ = tz;
            return kstDayIndex(date);
        });
        expect(results).toEqual([0, 0, 0]);
    });
});

describe('kstDateString', () => {
    test("한국 날짜 'YYYY-MM-DD'", () => {
        expect(kstDateString(new Date('2026-11-27T14:59:59Z'))).toBe('2026-11-27'); // KST 23:59
        expect(kstDateString(new Date('2026-11-27T15:00:00Z'))).toBe('2026-11-28'); // KST 다음 날 0시
    });
});

describe('msUntilNextKstHour (정리 작업 다음 실행, B-9)', () => {
    const HOUR = 60 * 60 * 1000;
    test('오늘 그 시각 전이면 오늘, 지났거나 정각이면 내일', () => {
        // KST 11/28 03:00 → 04:00까지 1시간
        expect(msUntilNextKstHour(new Date('2026-11-27T18:00:00Z'), 4)).toBe(HOUR);
        // KST 11/28 04:00 정각 → 내일 04:00
        expect(msUntilNextKstHour(new Date('2026-11-27T19:00:00Z'), 4)).toBe(24 * HOUR);
        // KST 11/28 12:00 → 11/29 04:00까지 16시간
        expect(msUntilNextKstHour(new Date('2026-11-28T03:00:00Z'), 4)).toBe(16 * HOUR);
    });
});
