import dayjs, { type Dayjs } from 'dayjs';
import { eventIds, idx2hour } from '@/constants';
import theme from '@/styles/theme';
import type { DayIndex, EnsembleResponse, TimeSlot } from '@/types';
import { resolveNextDate } from './board';
import { getTodayIdx } from './week';

// 주 단위 캘린더(View 개편 V-2)용 순수 함수. 서버 데이터(합주 = 요일 + 시간칸 + 반복 여부 + 다음 날짜)는 그대로 두고,
// 주마다 어떤 합주가 어떤 상태로 보이는지와 겹치는 합주의 가로 배치(레인)를 계산한다.

/** 이번 주(0)부터 몇 주 뒤까지 볼 수 있는지 */
export const MAX_WEEK_OFFSET = 12;

/** offset주 뒤 주의 월요일 0시 (offset 0 = 오늘이 속한 주) */
export function getWeekStart(now: Dayjs, offset: number): Dayjs {
    return now
        .startOf('day')
        .subtract(getTodayIdx(now), 'day')
        .add(offset * 7, 'day');
}

/** 주 제목: "11월 16일 – 22일", 달이 바뀌면 "11월 30일 – 12월 6일" */
export function formatWeekRange(weekStart: Dayjs): string {
    const end = weekStart.add(6, 'day');
    const startLabel = `${weekStart.month() + 1}월 ${weekStart.date()}일`;
    const endLabel =
        end.month() === weekStart.month()
            ? `${end.date()}일`
            : `${end.month() + 1}월 ${end.date()}일`;
    return `${startLabel} – ${endLabel}`;
}

/** 시간칸 범위의 표시: "10:00–11:30" (endTime은 마지막 칸이라 끝나는 시각은 다음 칸의 시작) */
export function formatSlotRange(startTime: TimeSlot, endTime: TimeSlot): string {
    return `${idx2hour[startTime] ?? ''}–${idx2hour[endTime + 1] ?? ''}`;
}

/** 그 날짜에 합주가 보이는 상태. normal = 합주함, skipped = 이번 주 쉼(미루기) */
export type OccurrenceStatus = 'normal' | 'skipped';

/**
 * 합주가 date(그 합주 요일의 날짜)에 어떻게 보이는지. 안 보이면 null.
 * - 일회성: nextDate 그날만
 * - 반복: nextDate 이후(당일 포함)는 매주 합주. nextDate 직전 1주는 "쉼"
 *   (미루기는 nextDate를 7일 뒤로 옮기므로, 옮겨지기 전 날짜가 nextDate - 7이다)
 *
 * 한계: 서버에는 "언제부터 시작"과 "미룬 날짜"가 따로 저장되지 않는다. 그래서 시작일이 미래인 반복 합주도
 * 시작 직전 주에 "쉼"으로 보이고, 두 주 이상 연속으로 미루면 마지막 주만 "쉼"으로 보인다.
 */
export function getOccurrence(
    { repeat, nextDate }: Pick<EnsembleResponse, 'repeat' | 'nextDate'>,
    date: Dayjs,
): OccurrenceStatus | null {
    const next = dayjs(nextDate).startOf('day');
    const day = date.startOf('day');
    if (!repeat) {
        return day.isSame(next, 'day') ? 'normal' : null;
    }
    if (!day.isBefore(next)) return 'normal';
    if (!day.isBefore(next.subtract(7, 'day'))) return 'skipped';
    return null;
}

interface SlotRange {
    startTime: TimeSlot;
    /** 마지막 시간칸 (포함) */
    endTime: TimeSlot;
}

export type WithLane<T> = T & {
    /** 겹치는 묶음 안에서 몇 번째 세로줄인지 (0부터) */
    lane: number;
    /** 그 묶음의 세로줄 수 (가로 폭을 이 수로 나눈다) */
    lanes: number;
};

/**
 * 하루 안의 합주를 겹치지 않는 세로줄(레인)에 나눠 담는다.
 * 시간이 이어서 겹치는 합주끼리 한 묶음이 되고, 묶음마다 필요한 세로줄 수만큼 폭을 나눈다.
 * 시작이 빠른 순(같으면 긴 것 먼저)으로, 비어 있는 가장 왼쪽 줄에 넣는다.
 */
export function assignLanes<T extends SlotRange>(items: readonly T[]): WithLane<T>[] {
    const sorted = [...items].sort((a, b) => a.startTime - b.startTime || b.endTime - a.endTime);
    const result: WithLane<T>[] = [];
    let group: WithLane<T>[] = [];
    let laneEnds: TimeSlot[] = []; // 줄마다 마지막 합주의 끝 칸
    let groupEnd = -1;

    const closeGroup = () => {
        group.forEach((item) => (item.lanes = laneEnds.length));
        result.push(...group);
        group = [];
        laneEnds = [];
    };

    for (const item of sorted) {
        if (item.startTime > groupEnd && group.length > 0) closeGroup();
        let lane = laneEnds.findIndex((end) => end < item.startTime);
        if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(item.endTime);
        } else {
            laneEnds[lane] = item.endTime;
        }
        group.push({ ...item, lane, lanes: 0 });
        groupEnd = Math.max(groupEnd, item.endTime);
    }
    if (group.length > 0) closeGroup();
    return result;
}

/** 캘린더의 합주 블록 하나 (그 주의 특정 날짜에 보이는 합주) */
export interface CalendarEvent {
    id: string;
    teamId: string;
    /** 팀(또는 일정) 이름 */
    name: string;
    /** 블록 색. 색 매핑에 없는 팀(삭제된 팀 등)은 theme.blueGray */
    color: string;
    /** 팀 아닌 일정 (보소·기소 등 소모임, 회의, 오디션, 합주 불가, 동방 사용 불가: eventIds) */
    isEvent: boolean;
    status: OccurrenceStatus;
    day: DayIndex;
    startTime: TimeSlot;
    endTime: TimeSlot;
    repeat: boolean;
    /** 다음 합주 날짜 (옛 합주 정보 Drawer용, resolveNextDate 결과) */
    nextDate: Dayjs;
}

/**
 * 한 주의 캘린더: [요일 0~6][그날 보이는 합주(레인 배치 포함)].
 * colorMap은 buildColorMap(toTeams(...)) 결과 (팀 목록 순서로 색이 정해진다).
 */
export function toWeekSchedule(
    ensembles: readonly EnsembleResponse[],
    colorMap: Partial<Record<string, string>>,
    weekStart: Dayjs,
    now: Dayjs,
): WithLane<CalendarEvent>[][] {
    const days: CalendarEvent[][] = Array.from({ length: 7 }, () => []);

    for (const ensemble of ensembles) {
        const { _id: id, teamId, teamName, day, startTime, endTime, repeat } = ensemble;
        const status = getOccurrence(ensemble, weekStart.add(day, 'day'));
        if (!status) continue;
        // day(0~6) 범위는 응답 스키마(ensembleResponseSchema)에서 검증된다
        days[day]!.push({
            id,
            teamId,
            name: teamName,
            color: colorMap[teamId] ?? theme.blueGray,
            isEvent: eventIds.includes(teamId),
            status,
            day,
            startTime,
            endTime,
            repeat,
            nextDate: resolveNextDate(ensemble, now),
        });
    }

    return days.map(assignLanes);
}
