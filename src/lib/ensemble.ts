import type { Dayjs } from 'dayjs';
import type { EnsembleUpdateRequest, TimeSlot } from '@/types';

/**
 * 합주 추가·수정 요청 본문 (추가는 여기에 teamName을 더한다).
 * - day: dayjs의 day()(일요일 0)를 월요일 0 ~ 일요일 6으로 변환
 * - type·due: repeat에서 파생되는 레거시 필드 (TODO 삭제)
 */
export function toEnsembleRequest(
    teamId: string,
    repeat: boolean,
    nextDate: Dayjs,
    startTime: TimeSlot,
    endTime: TimeSlot,
): EnsembleUpdateRequest {
    return {
        teamId,
        repeat,
        nextDate,
        startTime,
        endTime,
        day: (nextDate.day() + 6) % 7,
        type: repeat ? '무기한' : '일회성',
        due: repeat ? '2099-12-31' : nextDate.format('YYYY-MM-DD'),
    };
}
