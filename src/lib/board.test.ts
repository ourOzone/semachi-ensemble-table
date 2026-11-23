/**
 * lib/board 단위 테스트.
 * context/fetch.test.tsx의 characterization 기대값(현재 동작)을 now 인자 방식으로 옮겼다.
 * 동작을 바꿀 때는 승인 후 기대값을 함께 고친다.
 * 3-3에서 승인된 수정: 다시 계산한 nextDate는 0시 (F7, 이전에는 현재 시각 10:00이 붙었다),
 *   목록에 없는 팀의 teamColor는 theme.blueGray (F8, 이전에는 -1)
 *
 * now는 2026-11-20(금) 10:00 (테스트 시간대 Asia/Seoul)
 */
import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { eventIds } from '@/constants';
import theme from '@/styles/theme';
import type { EnsembleResponse, TeamResponse } from '@/types';
import { buildColorMap, isSkipped, resolveNextDate, slotEndTime, toBoard, toTeams } from './board';

const now = dayjs('2026-11-20T10:00');
/** 로컬(Asia/Seoul) 날짜·시각을 서버가 보내는 ISO(UTC) 문자열로 바꾼다 */
const iso = (local: string) => dayjs(local).toISOString();
const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD HH:mm');

const teamRaw = (id: string, name: string): TeamResponse => ({
    _id: id,
    name,
    type: '기타 등등',
    desc: ['보컬', '기타', '베이스', '드럼', '키보드', '매니저', '셋리'],
    pin: '1234',
});

const ensemble = (overrides: Partial<EnsembleResponse> & { _id: string }): EnsembleResponse => ({
    teamId: 'team-a',
    teamName: '팀A',
    day: 4,
    startTime: 2,
    endTime: 3,
    repeat: true,
    nextDate: iso('2026-11-23'),
    due: iso('2099-12-31'),
    ...overrides,
});

describe('slotEndTime', () => {
    it('시간칸이 끝나는 시각(idx2hour[endTime + 1])을 [시, 분]으로 돌려준다', () => {
        expect(slotEndTime(0)).toEqual([9, 30]);
        expect(slotEndTime(3)).toEqual([11, 0]);
        expect(slotEndTime(29)).toEqual([24, 0]);
    });

    it('범위 밖이면 RangeError (이전에도 TypeError가 났다. 범위 밖 합주는 응답 스키마에서 걸러진다)', () => {
        expect(() => slotEndTime(30)).toThrow(RangeError);
    });
});

describe('toTeams', () => {
    it('_id를 id로 바꾸고 type·name·desc만 남긴다 (pin은 버린다)', () => {
        expect(toTeams([teamRaw('team-a', '팀A')])).toEqual([
            {
                id: 'team-a',
                type: '기타 등등',
                name: '팀A',
                desc: ['보컬', '기타', '베이스', '드럼', '키보드', '매니저', '셋리'],
            },
        ]);
    });

    it('소모임·회의(eventIds)는 뺀다. 순서는 서버 순서 그대로', () => {
        const teams = toTeams([
            teamRaw('team-a', '팀A'),
            teamRaw(eventIds[0]!, '보소'),
            teamRaw('team-b', '팀B'),
        ]);

        expect(teams.map((t) => t.id)).toEqual(['team-a', 'team-b']);
    });
});

describe('buildColorMap', () => {
    it('팀은 목록 순서로 teamColors를 순환하고, 소모임·회의는 eventIds 순서대로 eventColors를 쓴다', () => {
        const teams = toTeams(Array.from({ length: 22 }, (_, i) => teamRaw(`t${i}`, `팀${i}`)));
        const colorMap = buildColorMap(teams);

        expect(colorMap.t0).toBe(theme.teamColors[0]);
        expect(colorMap.t21).toBe(theme.teamColors[1]); // 21 % 20 = 1
        expect(colorMap[eventIds[1]!]).toBe(theme.eventColors[1]);
    });
});

describe('resolveNextDate', () => {
    const next = (overrides: Partial<EnsembleResponse>) =>
        fmt(resolveNextDate(ensemble({ _id: 'e1', ...overrides }), now));

    it('일회성 합주는 서버 값 그대로 둔다 (오늘 날짜여도)', () => {
        expect(next({ repeat: false, nextDate: iso('2026-11-25') })).toBe('2026-11-25 00:00');
        // 오늘 합주가 이미 끝난 시각(09:30)이라, 반복 합주였다면 7일 뒤가 됐을 경우
        expect(next({ repeat: false, nextDate: iso('2026-11-20'), startTime: 0, endTime: 0 })).toBe(
            '2026-11-20 00:00',
        );
    });

    it('반복 합주의 nextDate가 내일 이후면 그대로 둔다', () => {
        expect(next({ nextDate: iso('2026-11-23') })).toBe('2026-11-23 00:00');
    });

    describe('반복 합주의 nextDate가 오늘 이전이고, 오늘과 같은 요일(금)일 때', () => {
        it('오늘 합주가 아직 안 끝났으면 오늘(0시)로 바꾼다', () => {
            // endTime 3 → 끝나는 시각 11:00, 지금 10:00
            expect(next({ nextDate: iso('2026-11-13'), endTime: 3 })).toBe('2026-11-20 00:00');
        });

        it('nextDate가 오늘이거나 오늘의 더 늦은 시각이어도 날짜 단위로 비교해 같은 규칙을 따른다', () => {
            expect(next({ nextDate: iso('2026-11-20'), endTime: 3 })).toBe('2026-11-20 00:00');
            expect(next({ nextDate: iso('2026-11-20T15:00'), endTime: 3 })).toBe(
                '2026-11-20 00:00',
            );
        });

        it('오늘 합주가 이미 끝났으면 7일 뒤(0시)로 바꾼다', () => {
            // startTime 0, endTime 0 → 끝나는 시각 09:30, 지금 10:00
            expect(next({ nextDate: iso('2026-11-13'), startTime: 0, endTime: 0 })).toBe(
                '2026-11-27 00:00',
            );
        });

        it('마지막 칸(endTime 29)까지 하는 합주는 끝나는 시각이 24:00이라 항상 오늘이다', () => {
            expect(next({ nextDate: iso('2026-11-13'), startTime: 28, endTime: 29 })).toBe(
                '2026-11-20 00:00',
            );
        });
    });

    describe('반복 합주의 nextDate가 오늘 이전이고, 오늘과 다른 요일일 때', () => {
        it('그 요일이 다시 오는 가장 가까운 날(0시)로 바꾼다', () => {
            expect(next({ day: 1, nextDate: iso('2026-11-17') })).toBe('2026-11-24 00:00'); // 화 → 다음 화
            expect(next({ day: 3, nextDate: iso('2026-11-19') })).toBe('2026-11-26 00:00'); // 목 → 6일 뒤
            expect(next({ day: 6, nextDate: iso('2026-11-15') })).toBe('2026-11-22 00:00'); // 일(day() 0) → 다음 일
            // 오늘(금)보다 뒤 요일: 7 + 6 - 5 = 8 → % 7 = 1일 뒤
            expect(next({ day: 5, nextDate: iso('2026-11-14') })).toBe('2026-11-21 00:00'); // 토 → 내일
        });
    });
});

describe('toBoard', () => {
    const teams = toTeams([teamRaw('team-a', '팀A'), teamRaw('team-b', '팀B')]);

    it('7(요일) x 30(시간칸) 크기의 2차원 배열을 만든다', () => {
        const board = toBoard(teams, [], now);

        expect(board).toHaveLength(7);
        expect(board.every((day) => day.length === 30)).toBe(true);
    });

    it('합주를 day와 startTime~endTime(양 끝 포함) 칸마다 넣고, 첫 칸에만 팀 이름을 표시한다', () => {
        const board = toBoard(
            teams,
            [ensemble({ _id: 'e1', day: 4, startTime: 2, endTime: 4 })],
            now,
        );
        const day = board[4]!;

        expect(day[1]).toEqual([]);
        expect(day[2]!.map((b) => b.displayName)).toEqual(['팀A']);
        expect(day[3]!.map((b) => b.displayName)).toEqual(['']);
        expect(day[4]!.map((b) => b.displayName)).toEqual(['']);
        expect(day[5]).toEqual([]);
        expect(day[2]![0]).toMatchObject({
            id: 'e1',
            day: 4,
            startTime: 2,
            endTime: 4,
            teamId: 'team-a',
            name: '팀A',
            repeat: true,
            due: iso('2099-12-31'),
            teamColor: theme.teamColors[0],
        });
        expect(fmt(day[2]![0]!.nextDate)).toBe('2026-11-23 00:00');
    });

    it('같은 칸에 겹치는 합주는 서버 순서대로 함께 들어간다', () => {
        const board = toBoard(
            teams,
            [
                ensemble({ _id: 'e1', teamId: 'team-a', teamName: '팀A' }),
                ensemble({ _id: 'e2', teamId: 'team-b', teamName: '팀B' }),
            ],
            now,
        );

        expect(board[4]![2]!.map((b) => [b.id, b.teamColor])).toEqual([
            ['e1', theme.teamColors[0]],
            ['e2', theme.teamColors[1]],
        ]);
    });

    it('소모임·회의 합주는 eventColors, 팀 목록에 없는 팀(예: 삭제된 팀)의 합주는 회청색(blueGray)', () => {
        const board = toBoard(
            teams,
            [
                ensemble({ _id: 'e1', teamId: eventIds[1]!, startTime: 0, endTime: 0 }),
                ensemble({ _id: 'e2', teamId: 'deleted-team', startTime: 1, endTime: 1 }),
            ],
            now,
        );

        expect(board[4]![0]![0]!.teamColor).toBe(theme.eventColors[1]);
        expect(board[4]![1]![0]!.teamColor).toBe(theme.blueGray);
    });

    it('nextDate는 now 기준으로 다시 계산된다 (resolveNextDate)', () => {
        const board = toBoard(teams, [ensemble({ _id: 'e1', nextDate: iso('2026-11-13') })], now);

        expect(fmt(board[4]![2]![0]!.nextDate)).toBe('2026-11-20 00:00');
    });
});

describe('isSkipped (회색 표시)', () => {
    const skipped = (nextDate: string, endTime: number) =>
        isSkipped({ nextDate: dayjs(nextDate), endTime }, now);

    it('다음 합주가 끝나는 시각이 지금부터 7일 이상 뒤면 true', () => {
        // 11-27 11:00 - 11-20 10:00 = 7일 1시간
        expect(skipped('2026-11-27', 3)).toBe(true);
        expect(skipped('2026-12-04', 3)).toBe(true);
    });

    it('7일 미만이면 false (일 단위 내림)', () => {
        // 11-27 09:30 - 11-20 10:00 = 6일 23시간 30분
        expect(skipped('2026-11-27', 0)).toBe(false);
        expect(skipped('2026-11-20', 3)).toBe(false);
    });

    it('nextDate의 시각은 무시하고 끝나는 시각으로 맞춰 비교한다 (초 단위는 nextDate 값 그대로)', () => {
        expect(skipped('2026-11-27T23:00', 0)).toBe(false);
    });
});
