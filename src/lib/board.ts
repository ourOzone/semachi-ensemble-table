import dayjs, { type Dayjs } from 'dayjs';
import { eventIds, idx2hour } from '@/constants';
import theme from '@/styles/theme';
import type {
    EnsembleBlock,
    EnsembleBoard,
    EnsembleResponse,
    Team,
    TeamResponse,
    TimeSlot,
} from '@/types';

// 서버 응답 → 화면용 데이터(팀 목록·합주표)로 바꾸는 순수 함수.
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

/**
 * 합주표: [요일 0~6][시간칸 0~29][그 칸에 겹치는 합주들].
 * 합주는 startTime~endTime(양 끝 포함) 칸마다 하나씩 들어가고, 첫 칸에만 팀 이름을 표시한다.
 * teams는 toTeams 결과(소모임·회의 제외)여야 색상 순서가 맞다.
 */
export function toBoard(
    teams: Team[],
    ensemblesRaw: EnsembleResponse[],
    now: Dayjs,
): EnsembleBoard {
    const colorMap = buildColorMap(teams);
    const blocks: EnsembleBoard = Array.from({ length: 7 }, () =>
        Array.from({ length: 30 }, () => []),
    );

    ensemblesRaw.forEach((ensemble) => {
        const { _id, day, startTime, endTime, teamId, teamName, repeat, due } = ensemble;
        const nextDate = resolveNextDate(ensemble, now);

        for (let hour = startTime; hour <= endTime; hour++) {
            // day(0~6)·시간칸(0~29) 범위는 응답 스키마(ensembleResponseSchema)에서 검증된다
            blocks[day]![hour]!.push({
                id: _id,
                day,
                startTime,
                endTime,
                teamId,
                name: teamName,
                repeat,
                nextDate,
                due,
                displayName: hour === startTime ? teamName : '', // 맨 처음 블록에만 팀명 표시
                // 목록에 없는 팀(삭제된 팀 등)은 회청색 (이전에는 -1이 그대로 CSS 배경색 값이 됐다: ISSUES F8)
                teamColor: colorMap[teamId] ?? theme.blueGray,
            });
        }
    });

    return blocks;
}

/** "다음 번에 안 해요"로 미뤄진 합주인지(회색 표시): 다음 합주가 끝나는 시각이 지금부터 7일 이상 뒤 */
export function isSkipped(
    { nextDate, endTime }: Pick<EnsembleBlock, 'nextDate' | 'endTime'>,
    now: Dayjs,
): boolean {
    const [hour, minute] = slotEndTime(endTime);
    return dayjs(nextDate).hour(hour).minute(minute).diff(now, 'day') >= 7;
}
