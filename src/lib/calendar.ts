import dayjs, { type Dayjs } from 'dayjs';
import { eventIds, idx2hour } from '@/constants';
import theme from '@/styles/theme';
import type { DayIndex, EnsembleResponse, TimeSlot } from '@/types';
import { resolveNextDate, slotEndTime } from './board';
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
 * 반복 합주를 미루지 않았다면 다음 합주였을 날짜 (그날 0시): 오늘부터 처음 오는 그 요일.
 * 오늘이 그 요일이면 오늘 합주가 아직 안 끝났을 때만 오늘, 끝났으면 7일 뒤 (resolveNextDate와 같은 기준)
 */
export function getRegularNextDate(
    { day, endTime }: { day: DayIndex; endTime: TimeSlot },
    now: Dayjs,
): Dayjs {
    const today = now.startOf('day');
    const weekday = (day + 1) % 7; // 월요일 0 → dayjs의 day()(일요일 0)
    if (weekday === now.day()) {
        const [hour, minute] = slotEndTime(endTime);
        return now.hour(hour).minute(minute).isAfter(now) ? today : today.add(7, 'day');
    }
    return today.add((7 + weekday - now.day()) % 7, 'day');
}

/**
 * 합주가 date(그 합주 요일의 날짜)에 어떻게 보이는지. 안 보이면 null.
 * - 일회성: nextDate 그날만. regularDate를 주면 그날부터 nextDate 전까지는 "쉼" (미래로 잡은 일회성 합주)
 * - 반복: nextDate 이후(당일 포함)는 매주 합주. nextDate 직전 1주는 "쉼"
 *   (미루기는 nextDate를 7일 뒤로 옮기므로, 옮겨지기 전 날짜가 nextDate - 7이다).
 *   regularDate(미루지 않았다면 다음 합주였을 날짜, getRegularNextDate)를 주면 그날부터 nextDate 전까지도 모두 "쉼"
 *   (여러 번 미룬 경우)
 *
 * 한계: 서버에는 "언제부터 시작"과 "미룬 날짜"가 따로 저장되지 않는다. 그래서 시작일이 미래인 반복 합주도
 * 시작 전 주들이 "쉼"으로 보인다 (ISSUES V9).
 */
export function getOccurrence(
    { repeat, nextDate }: Pick<EnsembleResponse, 'repeat' | 'nextDate'>,
    date: Dayjs,
    regularDate?: Dayjs,
): OccurrenceStatus | null {
    const next = dayjs(nextDate).startOf('day');
    const day = date.startOf('day');
    if (!repeat) {
        if (day.isSame(next, 'day')) return 'normal';
        return regularDate && !day.isBefore(regularDate, 'day') && day.isBefore(next)
            ? 'skipped'
            : null;
    }
    if (!day.isBefore(next)) return 'normal';
    if (!day.isBefore(next.subtract(7, 'day'))) return 'skipped';
    if (regularDate && !day.isBefore(regularDate, 'day')) return 'skipped';
    return null;
}

/** 합주 정보 Drawer에 보여줄 날짜들 */
export interface EnsembleSchedule {
    /** 다음 합주 날짜 (미뤘으면 미룬 뒤 날짜). resolveNextDate 결과 */
    nextDate: Dayjs;
    /** 미뤄서 쉬는 날짜들 (오래된 순, 7일 간격). 미루지 않았거나 일회성이면 빈 배열 */
    skippedDates: Dayjs[];
}

/**
 * 다음 합주와 쉬는 날짜들. 반복 합주에서 미루지 않았다면 다음 합주였을 날짜(getRegularNextDate)부터
 * 다음 합주 전까지가 쉬는 날짜다. 미루기 취소는 다음 날짜를 skippedDates[0]으로 되돌린다.
 * 한계: 시작일이 미래인 반복 합주도 시작 전 주들이 쉬는 날짜로 나온다 (ISSUES V9)
 */
export function getEnsembleSchedule(
    ensemble: Pick<EnsembleResponse, 'repeat' | 'nextDate' | 'day' | 'endTime'>,
    now: Dayjs,
): EnsembleSchedule {
    const nextDate = resolveNextDate(ensemble, now);
    const skippedDates: Dayjs[] = [];
    if (ensemble.repeat) {
        const next = nextDate.startOf('day');
        for (
            let date = getRegularNextDate(ensemble, now);
            date.isBefore(next, 'day');
            date = date.add(7, 'day')
        ) {
            skippedDates.push(date);
        }
    }
    return { nextDate, skippedDates };
}

export interface SlotRange {
    startTime: TimeSlot;
    /** 마지막 시간칸 (포함) */
    endTime: TimeSlot;
}

/** 하루의 합주 중 시간칸 slot에 걸친 것들 (시작이 빠른 순, 같으면 긴 것 먼저) */
export function eventsAtSlot<T extends SlotRange>(events: readonly T[], slot: TimeSlot): T[] {
    return events
        .filter((event) => event.startTime <= slot && slot <= event.endTime)
        .sort((a, b) => a.startTime - b.startTime || b.endTime - a.endTime);
}

/** slot을 포함하고 합주가 하나도 없는 연속 구간. slot에 합주가 있으면 null */
export function freeRangeAt(events: readonly SlotRange[], slot: TimeSlot): SlotRange | null {
    const busy = (s: TimeSlot) => events.some((e) => e.startTime <= s && s <= e.endTime);
    if (busy(slot)) return null;
    let startTime = slot;
    let endTime = slot;
    while (startTime > 0 && !busy(startTime - 1)) startTime--;
    while (endTime < 29 && !busy(endTime + 1)) endTime++;
    return { startTime, endTime };
}

/**
 * 하루 칸의 시간칸 slot을 눌렀을 때 무엇을 보여줄지.
 * - empty: 그 시간에 합주가 없음 (비어 있는 구간 range)
 * - single: 그 시간에 합주가 하나뿐 → 그 합주의 정보
 * - list: 둘 이상 겹침 → 겹친 합주 목록 (누른 게 어느 합주인지 알 수 없으므로)
 * 예: A 12~14시, B·C 13~15시 → 12~13시는 A, 13~14시는 A·B·C, 14~15시는 B·C
 */
export type SlotTap<T> =
    | { kind: 'empty'; range: SlotRange }
    | { kind: 'single'; event: T }
    | { kind: 'list'; events: T[] };

export function resolveSlotTap<T extends SlotRange>(
    events: readonly T[],
    slot: TimeSlot,
): SlotTap<T> {
    const hits = eventsAtSlot(events, slot);
    if (hits.length === 0) {
        return {
            kind: 'empty',
            range: freeRangeAt(events, slot) ?? { startTime: slot, endTime: slot },
        };
    }
    if (hits.length === 1) return { kind: 'single', event: hits[0]! };
    return { kind: 'list', events: hits };
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

    // 이번 주 월요일부터 합주 날짜 전까지는 모두 "쉼"(점선)으로 보인다 (24차).
    // 이전에는 "오늘부터 처음 오는 그 요일"부터라, 오늘보다 앞선 이번 주 요일의 합주(예: 미래에 시작하는 화요일 합주를
    // 수요일에 보면)는 이번 주 캘린더에서 사라졌다. 합주가 이미 그 요일에 있었는지는 데이터로 알 수 없다 (ISSUES V9)
    const thisWeek = getWeekStart(now, 0);
    for (const ensemble of ensembles) {
        const { _id: id, teamId, teamName, day, startTime, endTime, repeat } = ensemble;
        const status = getOccurrence(ensemble, weekStart.add(day, 'day'), thisWeek);
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

// ---------------- 합주 잡기 (View 개편 V-2 21차) ----------------

/** 한 시간에 겹칠 수 있는 합주 수 (2026-11-23 사용자 결정) */
export const MAX_OVERLAP = 4;

/** 그 날짜에 보이는 합주들 (레인 배치 포함). 합주판 캘린더와 같은 기준 (toWeekSchedule) */
export function eventsOnDate(
    ensembles: readonly EnsembleResponse[],
    colorMap: Partial<Record<string, string>>,
    date: Dayjs,
    now: Dayjs,
): WithLane<CalendarEvent>[] {
    return toWeekSchedule(ensembles, colorMap, getWeekStart(date, 0), now)[getTodayIdx(date)] ?? [];
}

/** range와 시간이 겹치는 것들 (시작이 빠른 순) */
export function overlapping<T extends SlotRange>(events: readonly T[], range: SlotRange): T[] {
    return events
        .filter((e) => e.startTime <= range.endTime && range.startTime <= e.endTime)
        .sort((a, b) => a.startTime - b.startTime || b.endTime - a.endTime);
}

export interface NewEnsemble extends SlotRange {
    /** 합주 날짜 (반복이면 시작 날짜) */
    date: Dayjs;
    repeat: boolean;
    /** 반복 종료 날짜 (이 날짜까지만). 없으면 계속 */
    until?: Dayjs | null;
}

/**
 * 새 합주를 넣으면 같은 시간에 MAX_OVERLAP개를 넘게 겹치는 첫 날짜. 없으면 null.
 * 그날 실제로 하는 합주(getOccurrence가 normal)만 센다 (미뤄서 쉬는 주는 세지 않음).
 * - 일회성: 그날만
 * - 반복: 시작 날짜부터 매주(until이 있으면 그날까지). 반복 합주는 nextDate부터 매주 하고 일회성 합주는 그날만 하므로,
 *   겹침 수가 바뀌는 날짜(시작 날짜, 같은 요일 합주들의 nextDate 이후 처음 오는 그 요일)만 보면 된다
 */
export function findOverlapLimit(
    ensembles: readonly EnsembleResponse[],
    ensemble: NewEnsemble,
): Dayjs | null {
    const start = ensemble.date.startOf('day');
    const day = getTodayIdx(start);
    const sameDay = ensembles.filter((e) => e.day === day);

    const dates = [start];
    if (ensemble.repeat) {
        for (const e of sameDay) {
            const next = dayjs(e.nextDate).startOf('day');
            if (!next.isAfter(start)) continue;
            // next 이후(당일 포함) 처음 오는 그 요일
            dates.push(start.add(Math.ceil(next.diff(start, 'day') / 7) * 7, 'day'));
        }
        dates.sort((a, b) => a.valueOf() - b.valueOf());
    }

    for (const date of dates) {
        if (ensemble.until && date.isAfter(ensemble.until, 'day')) break;
        const held = sameDay.filter((e) => getOccurrence(e, date) === 'normal');
        for (let slot = ensemble.startTime; slot <= ensemble.endTime; slot++) {
            const count = held.filter((e) => e.startTime <= slot && slot <= e.endTime).length;
            if (count >= MAX_OVERLAP) return date;
        }
    }
    return null;
}

/**
 * 그 날짜의 시간칸 slot에 이미 MAX_OVERLAP개가 겹쳐 있는지 (그 시간에는 합주를 더 잡을 수 없다).
 * "합주 잡기" 버튼을 막는 데 쓴다 (24차)
 */
export function isSlotFull(
    ensembles: readonly EnsembleResponse[],
    date: Dayjs,
    slot: TimeSlot,
): boolean {
    return (
        findOverlapLimit(ensembles, { date, repeat: false, startTime: slot, endTime: slot }) !==
        null
    );
}

// ---------------- 합주판 보기 방식 (View 개편 V-2 26차) ----------------
// 지난 날짜는 볼 필요가 없어, 첫 화면(offset 0)은 늘 오늘부터 7일을 보여준다. 다음 주부터는 일~토 한 주씩.

/** 합주판 보기 방식. rolling: 오늘을 맨 왼쪽에 두고 7일 / weekday: 일~토 요일 고정, 지난 요일은 다음 주 날짜로 */
export type BoardView = 'rolling' | 'weekday';

/** offset주 뒤 주의 일요일 0시 (offset 0 = 오늘이 속한 일~토 주) */
export function getSundayWeekStart(now: Dayjs, offset: number): Dayjs {
    const today = now.startOf('day');
    return today.subtract(today.day(), 'day').add(offset * 7, 'day');
}

/** 합주판의 한 열 */
export interface BoardDay {
    date: Dayjs;
    /** 요일 고정 보기에서 지난 요일 대신 들어간 다음 주 날짜 ("다음주"라고 작게 표시) */
    nextWeek: boolean;
}

/**
 * 합주판에 보여줄 7일 (왼쪽부터 열 순서).
 * - offset 0, rolling: 오늘 ~ 6일 뒤 (오늘이 수요일이면 수 ~ 다음 주 화)
 * - offset 0, weekday: 이번 주 일 ~ 토, 오늘보다 앞선 요일은 다음 주 날짜 (수요일이면 다음 주 일·월·화 + 이번 주 수~토)
 * - offset 1 이상: 두 방식 모두 offset주 뒤의 일 ~ 토 (토요일에 다음 주를 누르면 바로 다음 날 일요일부터)
 * offset 0의 7일은 두 방식이 같고 열 순서만 다르다
 */
export function getBoardDays(now: Dayjs, offset: number, view: BoardView): BoardDay[] {
    const today = now.startOf('day');
    const sunday = getSundayWeekStart(now, offset);
    return Array.from({ length: 7 }, (_, i) => {
        if (offset > 0) return { date: sunday.add(i, 'day'), nextWeek: false };
        if (view === 'rolling') return { date: today.add(i, 'day'), nextWeek: false };
        const date = sunday.add(i, 'day');
        return date.isBefore(today)
            ? { date: date.add(7, 'day'), nextWeek: true }
            : { date, nextWeek: false };
    });
}

/** 날짜마다 그날 보이는 합주 (레인 배치 포함, 열 순서 그대로) */
export function toDaysSchedule(
    ensembles: readonly EnsembleResponse[],
    colorMap: Partial<Record<string, string>>,
    dates: readonly Dayjs[],
    now: Dayjs,
): WithLane<CalendarEvent>[][] {
    return dates.map((date) => eventsOnDate(ensembles, colorMap, date, now));
}
