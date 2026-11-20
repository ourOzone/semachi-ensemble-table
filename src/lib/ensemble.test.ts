import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { toEnsembleRequest } from './ensemble';

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

    it('일요일(dayjs의 day() 0)은 6', () => {
        expect(toEnsembleRequest('team-a', true, dayjs('2026-11-22'), 0, 1).day).toBe(6);
    });
});
