import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { getRepeatEnd, toEnsembleRequest } from './ensemble';

describe('toEnsembleRequest', () => {
    it('반복 합주: 요일을 월요일 0 ~ 일요일 6으로 바꾸고, 레거시 type·due는 무기한·2099-12-31', () => {
        const nextDate = dayjs('2026-11-20T10:00'); // 금

        expect(toEnsembleRequest('team-a', true, nextDate, 2, 3)).toEqual({
            teamId: 'team-a',
            repeat: true,
            nextDate,
            startTime: 2,
            endTime: 3,
            day: 4,
            type: '무기한',
            due: '2099-12-31',
        });
    });

    it('일회성 합주: 레거시 type·due는 일회성·그 날짜', () => {
        const request = toEnsembleRequest('team-a', false, dayjs('2026-11-25T10:00'), 2, 3);

        expect(request).toMatchObject({ day: 2, type: '일회성', due: '2026-11-25' });
    });

    it('반복 종료 날짜가 있으면 due에 그 날짜, 일회성은 무시', () => {
        const end = dayjs('2026-12-20');
        expect(toEnsembleRequest('team-a', true, dayjs('2026-11-20'), 2, 3, end).due).toBe(
            '2026-12-20',
        );
        expect(toEnsembleRequest('team-a', true, dayjs('2026-11-20'), 2, 3, null).due).toBe(
            '2099-12-31',
        );
        expect(toEnsembleRequest('team-a', false, dayjs('2026-11-25'), 2, 3, end).due).toBe(
            '2026-11-25',
        );
    });

    it('일요일(dayjs의 day() 0)은 6', () => {
        expect(toEnsembleRequest('team-a', true, dayjs('2026-11-22'), 0, 1).day).toBe(6);
    });
});

describe('getRepeatEnd', () => {
    const now = dayjs('2026-11-20T10:00');

    it('2099년 이후(계속 반복)·지난 날짜·없음은 null, 오늘 이후는 그날 0시', () => {
        expect(getRepeatEnd('2099-12-31T00:00:00.000Z', now)).toBeNull();
        expect(getRepeatEnd('2026-11-19T00:00:00.000Z', now)).toBeNull();
        expect(getRepeatEnd(undefined, now)).toBeNull();
        expect(getRepeatEnd('2026-11-20T00:00:00.000Z', now)?.format('YYYY-MM-DD HH:mm')).toBe(
            '2026-11-20 00:00',
        );
        expect(getRepeatEnd('2026-12-20', now)?.format('YYYY-MM-DD')).toBe('2026-12-20');
    });
});
