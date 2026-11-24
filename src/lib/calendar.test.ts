import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { eventIds } from '@/constants';
import theme from '@/styles/theme';
import type { EnsembleResponse } from '@/types';
import {
    assignLanes,
    eventsAtSlot,
    freeRangeAt,
    formatSlotRange,
    formatWeekRange,
    getEnsembleSchedule,
    getOccurrence,
    getRegularNextDate,
    getWeekStart,
    resolveSlotTap,
    toWeekSchedule,
} from './calendar';

const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD HH:mm');

describe('getWeekStart', () => {
    it('오늘이 속한 주의 월요일 0시, offset주 뒤', () => {
        const wed = dayjs('2026-11-25T15:30');
        expect(fmt(getWeekStart(wed, 0))).toBe('2026-11-23 00:00');
        expect(fmt(getWeekStart(wed, 1))).toBe('2026-11-30 00:00');
        expect(fmt(getWeekStart(wed, 12))).toBe('2027-02-15 00:00');
    });

    it('일요일은 그 주의 마지막 날 (다음 주가 아니다)', () => {
        expect(fmt(getWeekStart(dayjs('2026-11-29T23:00'), 0))).toBe('2026-11-23 00:00');
    });
});

describe('formatWeekRange', () => {
    it('같은 달이면 끝 날짜만, 달·해가 바뀌면 달까지', () => {
        expect(formatWeekRange(dayjs('2026-11-23'))).toBe('11월 23일 – 29일');
        expect(formatWeekRange(dayjs('2026-11-30'))).toBe('11월 30일 – 12월 6일');
        expect(formatWeekRange(dayjs('2026-12-28'))).toBe('12월 28일 – 1월 3일');
    });
});

describe('formatSlotRange', () => {
    it('끝나는 시각은 마지막 칸의 다음 칸', () => {
        expect(formatSlotRange(18, 20)).toBe('18:00–19:30');
        expect(formatSlotRange(0, 29)).toBe('09:00–24:00');
    });
});

describe('getOccurrence', () => {
    const next = '2026-11-23T00:00:00.000Z'; // 월요일 (서울 기준 09:00)

    it('일회성: nextDate 그날만', () => {
        expect(getOccurrence({ repeat: false, nextDate: next }, dayjs('2026-11-23'))).toBe(
            'normal',
        );
        expect(getOccurrence({ repeat: false, nextDate: next }, dayjs('2026-11-30'))).toBeNull();
        expect(getOccurrence({ repeat: false, nextDate: next }, dayjs('2026-11-16'))).toBeNull();
    });

    it('반복: nextDate부터 매주, 직전 주는 쉼, 그 전은 안 보임', () => {
        const repeat = { repeat: true, nextDate: next };
        expect(getOccurrence(repeat, dayjs('2026-11-23'))).toBe('normal');
        expect(getOccurrence(repeat, dayjs('2027-02-15'))).toBe('normal');
        expect(getOccurrence(repeat, dayjs('2026-11-16'))).toBe('skipped');
        expect(getOccurrence(repeat, dayjs('2026-11-09'))).toBeNull();
    });

    it('반복: nextDate가 지났어도 매주 합주', () => {
        expect(
            getOccurrence(
                { repeat: true, nextDate: '2026-10-05T00:00:00.000Z' },
                dayjs('2026-11-23'),
            ),
        ).toBe('normal');
    });
});

describe('getOccurrence: 여러 번 미룬 반복 합주', () => {
    it('regularDate부터 nextDate 전까지 모두 쉼, regularDate 전은 기존 규칙', () => {
        const repeat = { repeat: true, nextDate: '2026-12-07T00:00:00.000Z' }; // 3주 미룸
        const regular = dayjs('2026-11-16');
        expect(getOccurrence(repeat, dayjs('2026-11-16'), regular)).toBe('skipped');
        expect(getOccurrence(repeat, dayjs('2026-11-23'), regular)).toBe('skipped');
        expect(getOccurrence(repeat, dayjs('2026-11-30'), regular)).toBe('skipped');
        expect(getOccurrence(repeat, dayjs('2026-12-07'), regular)).toBe('normal');
        expect(getOccurrence(repeat, dayjs('2026-11-09'), regular)).toBeNull();
        // regularDate 없이는 직전 주만
        expect(getOccurrence(repeat, dayjs('2026-11-23'))).toBeNull();
    });

    it('미래로 잡은 일회성: regularDate부터 그 날짜 전까지 쉼, 그 날짜는 합주, 뒤는 안 보임', () => {
        const oneTime = { repeat: false, nextDate: '2026-12-07T00:00:00.000Z' };
        const regular = dayjs('2026-11-23');
        expect(getOccurrence(oneTime, dayjs('2026-11-16'), regular)).toBeNull();
        expect(getOccurrence(oneTime, dayjs('2026-11-23'), regular)).toBe('skipped');
        expect(getOccurrence(oneTime, dayjs('2026-11-30'), regular)).toBe('skipped');
        expect(getOccurrence(oneTime, dayjs('2026-12-07'), regular)).toBe('normal');
        expect(getOccurrence(oneTime, dayjs('2026-12-14'), regular)).toBeNull();
    });
});

describe('getRegularNextDate', () => {
    // 2026-11-20 금요일 10:00
    const now = dayjs('2026-11-20T10:00');

    it('오늘부터 처음 오는 그 요일 0시', () => {
        expect(getRegularNextDate({ day: 0, endTime: 3 }, now).format('YYYY-MM-DD HH:mm')).toBe(
            '2026-11-23 00:00',
        );
        expect(getRegularNextDate({ day: 5, endTime: 3 }, now).format('YYYY-MM-DD')).toBe(
            '2026-11-21',
        );
        expect(getRegularNextDate({ day: 3, endTime: 3 }, now).format('YYYY-MM-DD')).toBe(
            '2026-11-26',
        );
    });

    it('오늘이 그 요일이면 끝나기 전엔 오늘, 끝났으면 다음 주', () => {
        // 마지막 시간칸 1 = 10:00에 끝남(지금과 같음 → 끝남), 2 = 10:30에 끝남
        expect(getRegularNextDate({ day: 4, endTime: 1 }, now).format('YYYY-MM-DD')).toBe(
            '2026-11-27',
        );
        expect(getRegularNextDate({ day: 4, endTime: 2 }, now).format('YYYY-MM-DD')).toBe(
            '2026-11-20',
        );
    });
});

describe('getEnsembleSchedule', () => {
    const now = dayjs('2026-11-20T10:00'); // 금요일
    const thursday = { repeat: true, day: 3, endTime: 3 };

    it('미루지 않은 반복 합주: 쉬는 날짜 없음', () => {
        const { nextDate, skippedDates } = getEnsembleSchedule(
            { ...thursday, nextDate: '2026-10-01T00:00:00.000Z' },
            now,
        );
        expect(nextDate.format('YYYY-MM-DD')).toBe('2026-11-26');
        expect(skippedDates).toEqual([]);
    });

    it('두 번 미룬 반복 합주: 정규 날짜부터 다음 합주 전까지 쉼', () => {
        const { nextDate, skippedDates } = getEnsembleSchedule(
            { ...thursday, nextDate: '2026-12-10T00:00:00.000Z' },
            now,
        );
        expect(nextDate.format('YYYY-MM-DD')).toBe('2026-12-10');
        expect(skippedDates.map((d) => d.format('YYYY-MM-DD'))).toEqual([
            '2026-11-26',
            '2026-12-03',
        ]);
    });

    it('일회성: 쉬는 날짜 없음', () => {
        const { nextDate, skippedDates } = getEnsembleSchedule(
            { ...thursday, repeat: false, nextDate: '2026-12-10T00:00:00.000Z' },
            now,
        );
        expect(nextDate.format('YYYY-MM-DD')).toBe('2026-12-10');
        expect(skippedDates).toEqual([]);
    });
});

describe('assignLanes', () => {
    const r = (startTime: number, endTime: number, id = `${startTime}-${endTime}`) => ({
        id,
        startTime,
        endTime,
    });
    const lanesOf = (items: ReturnType<typeof assignLanes<ReturnType<typeof r>>>) =>
        Object.fromEntries(items.map((i) => [i.id, [i.lane, i.lanes]]));

    it('겹치지 않으면 모두 한 줄 (끝 칸 다음에 시작하면 겹치지 않음)', () => {
        expect(lanesOf(assignLanes([r(0, 1), r(2, 3), r(10, 12)]))).toEqual({
            '0-1': [0, 1],
            '2-3': [0, 1],
            '10-12': [0, 1],
        });
    });

    it('겹치면 줄을 나누고, 같은 묶음은 같은 줄 수를 쓴다', () => {
        // A(0-3)·B(2-5)가 겹치고, C(4-6)는 A가 끝난 뒤라 A의 줄을 다시 쓴다 → 묶음 전체 2줄
        expect(lanesOf(assignLanes([r(4, 6, 'C'), r(0, 3, 'A'), r(2, 5, 'B')]))).toEqual({
            A: [0, 2],
            B: [1, 2],
            C: [0, 2],
        });
    });

    it('마지막 칸 하나만 겹쳐도 겹침이다 (endTime은 포함)', () => {
        expect(lanesOf(assignLanes([r(0, 2, 'A'), r(2, 4, 'B')]))).toEqual({
            A: [0, 2],
            B: [1, 2],
        });
    });

    it('겹치는 묶음이 끝난 뒤의 합주는 다시 전체 폭 (묶음마다 줄 수를 따로 센다)', () => {
        expect(lanesOf(assignLanes([r(0, 3, 'A'), r(1, 2, 'B'), r(10, 11, 'C')]))).toEqual({
            A: [0, 2],
            B: [1, 2],
            C: [0, 1],
        });
    });

    it('같은 시각에 시작하면 긴 것이 왼쪽', () => {
        expect(lanesOf(assignLanes([r(0, 1, 'short'), r(0, 5, 'long')]))).toEqual({
            long: [0, 2],
            short: [1, 2],
        });
    });

    it('4개가 동시에 겹치면 4줄', () => {
        const result = assignLanes([r(0, 7, 'a'), r(1, 4, 'b'), r(2, 9, 'c'), r(3, 5, 'd')]);
        expect(lanesOf(result)).toEqual({ a: [0, 4], b: [1, 4], c: [2, 4], d: [3, 4] });
    });
});

describe('toWeekSchedule', () => {
    const base: EnsembleResponse = {
        _id: 'e1',
        teamId: 'team-1',
        teamName: '테스트밴드',
        day: 0,
        startTime: 2,
        endTime: 3,
        repeat: true,
        nextDate: '2026-11-23T00:00:00.000Z',
        due: '2099-12-31T00:00:00.000Z',
    };
    const colorMap = { 'team-1': '#111111' };
    const now = dayjs('2026-11-20T10:00');

    it('요일 칸에 넣고 색·상태·레인을 붙인다', () => {
        const week = toWeekSchedule([base], colorMap, dayjs('2026-11-23'), now);
        expect(week).toHaveLength(7);
        expect(week[0]).toEqual([
            expect.objectContaining({
                id: 'e1',
                name: '테스트밴드',
                color: '#111111',
                isEvent: false,
                status: 'normal',
                lane: 0,
                lanes: 1,
            }),
        ]);
        expect(week.slice(1).every((day) => day.length === 0)).toBe(true);
    });

    it('nextDate 직전 주는 쉼, 그 전 주와 일회성의 다른 주는 빠진다', () => {
        const oneTime = {
            ...base,
            _id: 'e2',
            day: 2,
            repeat: false,
            nextDate: '2026-12-02T00:00:00.000Z',
        };
        const before = toWeekSchedule([base, oneTime], colorMap, dayjs('2026-11-16'), now);
        expect(before[0]?.[0]?.status).toBe('skipped');
        expect(before[2]).toEqual([]);

        expect(toWeekSchedule([base], colorMap, dayjs('2026-11-09'), now)[0]).toEqual([]);
        expect(toWeekSchedule([oneTime], colorMap, dayjs('2026-11-30'), now)[2]?.[0]?.status).toBe(
            'normal',
        );
        // 그 날짜 전 주(오늘 이후)는 쉼
        expect(toWeekSchedule([oneTime], colorMap, dayjs('2026-11-23'), now)[2]?.[0]?.status).toBe(
            'skipped',
        );
    });

    it('여러 번 미룬 반복 합주는 쉬는 주마다 쉼으로 보인다', () => {
        const skipped3 = { ...base, nextDate: '2026-12-14T00:00:00.000Z' }; // 11/23·30·12/7 쉼
        for (const week of ['2026-11-23', '2026-11-30', '2026-12-07']) {
            expect(toWeekSchedule([skipped3], colorMap, dayjs(week), now)[0]?.[0]?.status).toBe(
                'skipped',
            );
        }
        expect(toWeekSchedule([skipped3], colorMap, dayjs('2026-12-14'), now)[0]?.[0]?.status).toBe(
            'normal',
        );
    });

    it('팀 아닌 일정은 isEvent, 색 매핑에 없는 팀은 회청색', () => {
        const event = { ...base, _id: 'e3', teamId: eventIds[0]! };
        const unknown = { ...base, _id: 'e4', teamId: 'gone', startTime: 10, endTime: 11 };
        const [monday] = toWeekSchedule([event, unknown], colorMap, dayjs('2026-11-23'), now);
        expect(monday?.find((e) => e.id === 'e3')?.isEvent).toBe(true);
        expect(monday?.find((e) => e.id === 'e4')?.color).toBe(theme.blueGray);
    });
});

describe('합주 잡기 Drawer: 시간칸 누르기', () => {
    // A 12~14시, B·C 13~15시 (시간칸: 12시 = 6, 13시 = 8, 14시 = 10, 15시 = 12)
    const A = { id: 'A', startTime: 6, endTime: 9 };
    const B = { id: 'B', startTime: 8, endTime: 11 };
    const C = { id: 'C', startTime: 8, endTime: 11 };
    const day = [B, C, A];

    it('eventsAtSlot: 그 시간칸에 걸친 합주 (시작이 빠른 순)', () => {
        expect(eventsAtSlot(day, 6).map((e) => e.id)).toEqual(['A']);
        expect(eventsAtSlot(day, 8).map((e) => e.id)).toEqual(['A', 'B', 'C']);
        expect(eventsAtSlot(day, 11).map((e) => e.id)).toEqual(['B', 'C']);
        expect(eventsAtSlot(day, 12)).toEqual([]);
    });

    it('resolveSlotTap: 하나뿐이면 그 합주, 둘 이상이면 목록, 없으면 빈 구간', () => {
        expect(resolveSlotTap(day, 7)).toEqual({ kind: 'single', event: A });
        expect(resolveSlotTap(day, 9)).toEqual({ kind: 'list', events: [A, B, C] });
        expect(resolveSlotTap(day, 10)).toEqual({ kind: 'list', events: [B, C] });
        expect(resolveSlotTap(day, 14)).toEqual({
            kind: 'empty',
            range: { startTime: 12, endTime: 29 },
        });
    });

    it('freeRangeAt: 앞뒤로 합주가 없는 데까지, 합주가 있으면 null', () => {
        expect(freeRangeAt(day, 0)).toEqual({ startTime: 0, endTime: 5 });
        expect(freeRangeAt(day, 5)).toEqual({ startTime: 0, endTime: 5 });
        expect(freeRangeAt(day, 6)).toBeNull();
        expect(freeRangeAt([], 10)).toEqual({ startTime: 0, endTime: 29 });
    });
});
