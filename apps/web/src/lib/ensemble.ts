import dayjs, { type Dayjs } from 'dayjs';
import { idx2hour } from '@/constants';
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

/**
 * 서버에 보내는 합주 날짜: 그날에 시작 시각을 붙인다 (합주 잡기 21차·수정 31차).
 * 서버는 지난 일회성 합주를 날짜로 걸러 내는데(오늘 0시 기준), 0시로 보내면 서버 시간대에 따라
 * 그날이 되기 전에 지난 것으로 걸러질 수 있다 (옛 달력은 고른 때의 시각이 붙었다)
 */
export function withStartTime(date: Dayjs, startTime: TimeSlot): Dayjs {
    const [hour = 0, minute = 0] = (idx2hour[startTime] ?? '').split(':').map(Number);
    return date.startOf('day').hour(hour).minute(minute);
}

/** 반복 종료 날짜가 없음(계속 반복)을 뜻하는 due */
export const NO_REPEAT_END = '2099-12-31';

/**
 * 반복 합주의 종료 날짜 (서버 due, 0시). 없거나 계속 반복(2099년 이후)이면 null. 지난 날짜도 그대로 돌려준다.
 * 합주판은 이 날짜 뒤에 반복 합주를 보여주지 않는다 (lib/calendar의 getOccurrence, V-2 V13)
 */
export function parseRepeatEnd(due: string | undefined): Dayjs | null {
    if (!due) return null;
    const end = dayjs(due).startOf('day');
    if (!end.isValid() || end.year() >= 2099) return null;
    return end;
}

/**
 * 화면에 보여주고 수정 때 그대로 둘 반복 종료 날짜. parseRepeatEnd에서 이미 지난 날짜는 null.
 * 지난 날짜도 null인 이유: 옛 데이터에 반복인데 지난 due가 남은 합주가 있다 (반복 종료 기능 전에 만들어짐).
 * 그런 합주는 합주판에 보이지 않는다 (V13)
 */
export function getRepeatEnd(due: string | undefined, now: Dayjs): Dayjs | null {
    const end = parseRepeatEnd(due);
    return end && !end.isBefore(now, 'day') ? end : null;
}
