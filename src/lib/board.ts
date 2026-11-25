import dayjs, { type Dayjs } from 'dayjs';
import { eventIds, idx2hour } from '@/constants';
import theme from '@/styles/theme';
import type { EnsembleResponse, Team, TeamResponse, TimeSlot } from '@/types';

// 서버 응답 → 화면용 데이터(팀 목록·팀 색·다음 합주 날짜)로 바꾸는 순수 함수.
// 옛 합주표(7 x 30 칸)용 toBoard·isSkipped는 V-2 정리 때 지웠다 (새 캘린더는 lib/calendar).
// 현재 시각은 now 인자로 받는다 (호출부에서 dayjs()를 넘긴다).

/** 시간칸 endTime이 끝나는 시각 [시, 분]. idx2hour[endTime + 1] 기준 (endTime 29 → 24:00) */
export function slotEndTime(endTime: TimeSlot): [hour: number, minute: number] {
    const end = idx2hour[endTime + 1];
    if (end === undefined) {
        // 이전에도 undefined.split에서 TypeError가 났다. 범위 밖 값은 응답 스키마에서 걸러진다
        throw new RangeError(`시간칸 범위를 벗어났어요: endTime ${endTime}`);
    }
    const [hour, minute] = end.split(':') as [string, string]; // idx2hour는 모두 'HH:MM'
    return [parseInt(hour), parseInt(minute)];
}

/** _id를 id로 바꾸고 type·name·desc만 남긴다 (pin은 버린다). 소모임·회의(eventIds)는 뺀다 */
export function toTeams(teamsRaw: TeamResponse[]): Team[] {
    return teamsRaw
        .map(({ _id, type, name, desc }) => ({ id: _id, type, name, desc }))
        .filter((team) => !eventIds.includes(team.id));
}

/** teamId → 색상. 팀은 목록 순서로 teamColors를 순환하고, 소모임·회의는 eventIds 순서대로 eventColors (없는 팀은 undefined) */
export function buildColorMap(teams: Team[]): Partial<Record<string, string>> {
    const teamColorMap = Object.fromEntries(
        teams.map((team, idx) => [team.id, theme.teamColors[idx % theme.teamColors.length]]),
    );
    const eventColorMap = Object.fromEntries(
        eventIds.map((id, idx) => [id, theme.eventColors[idx]]),
    );
    return { ...teamColorMap, ...eventColorMap };
}

/**
 * 다음 합주 날짜.
 * - 일회성 합주이거나 nextDate가 오늘 이후(날짜 단위)면 서버 값 그대로
 * - 반복 합주이고 nextDate가 오늘과 같은 요일이면: 오늘 합주가 아직 안 끝났으면 오늘, 끝났으면 7일 뒤
 * - 반복 합주이고 다른 요일이면: 그 요일이 다시 오는 가장 가까운 날
 * 다시 계산한 날짜는 그날 0시다 (이전에는 현재 시각이 붙어, 미루기 때 시각이 붙은 날짜가 저장됐다: ISSUES F7)
 */
export function resolveNextDate(
    { repeat, nextDate, endTime }: Pick<EnsembleResponse, 'repeat' | 'nextDate' | 'endTime'>,
    now: Dayjs,
): Dayjs {
    const next = dayjs(nextDate);
    if (!repeat || now.isBefore(next, 'day')) {
        return next;
    }
    const today = now.startOf('day');
    if (next.day() === now.day()) {
        const [hour, minute] = slotEndTime(endTime);
        return now.hour(hour).minute(minute).isAfter(now) ? today : today.add(7, 'day');
    }
    return today.add((7 + next.day() - now.day()) % 7, 'day');
}
