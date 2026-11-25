import dayjs, { type Dayjs } from 'dayjs';
import type { EnsembleUpdateRequest, TimeSlot } from '@/types';

/**
 * 합주 추가·수정 요청 본문 (추가는 여기에 teamName을 더한다).
 * - day: dayjs의 day()(일요일 0)를 월요일 0 ~ 일요일 6으로 변환
 * - type: repeat에서 파생되는 레거시 필드 (TODO 삭제)
 * - due: 일회성은 그 날짜. 반복은 반복 종료 날짜(이 날짜 이후 자동 삭제, View 개편 V-2 23차), 없으면 2099-12-31 (= 계속 반복)
 */
export function toEnsembleRequest(
    teamId: string,
    repeat: boolean,
    nextDate: Dayjs,
    startTime: TimeSlot,
    endTime: TimeSlot,
    /** 반복 종료 날짜 (반복일 때만 쓴다) */
    repeatEnd?: Dayjs | null,
): EnsembleUpdateRequest {
    return {
        teamId,
        repeat,
        nextDate,
        startTime,
        endTime,
        day: (nextDate.day() + 6) % 7,
        type: repeat ? '무기한' : '일회성',
        due: repeat
            ? (repeatEnd?.format('YYYY-MM-DD') ?? NO_REPEAT_END)
            : nextDate.format('YYYY-MM-DD'),
    };
}

/** 반복 종료 날짜가 없음(계속 반복)을 뜻하는 due */
export const NO_REPEAT_END = '2099-12-31';

/**
 * 반복 합주의 종료 날짜 (서버 due). 계속 반복(2099년 이후)이거나 이미 지난 날짜면 null.
 * 지난 날짜도 null인 이유: 옛 데이터에 반복인데 지난 due가 남은 합주가 있다 (반복 종료 기능 전에 만들어짐)
 */
export function getRepeatEnd(due: string | undefined, now: Dayjs): Dayjs | null {
    if (!due) return null;
    const end = dayjs(due).startOf('day');
    if (!end.isValid() || end.year() >= 2099 || end.isBefore(now, 'day')) return null;
    return end;
}
