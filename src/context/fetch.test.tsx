/**
 * context/fetch의 fetchData 정제 로직 characterization test
 *
 * characterization test(특성 테스트)란?
 * - "이렇게 동작해야 한다"(명세)가 아니라 "지금 이렇게 동작한다"(현재 동작)를 그대로 기록하는 테스트.
 * - 레거시 코드를 리팩터링하기 전에 안전망으로 쓴다. 고친 뒤에도 이 테스트가 통과하면 동작이 바뀌지 않은 것이다.
 * - 그래서 이상해 보이는 동작도 일단 그대로 고정한다.
 * - 승인된 수정(3-3): 반복 합주의 다시 계산한 다음 날짜는 0시 (F7, 이전에는 현재 시각이 붙었다),
 *   색상 없는 팀의 teamColor는 theme.blueGray (F8, 이전에는 -1)
 *   이런 동작을 일부러 바꾸려면, 먼저 승인을 받고 해당 테스트의 기대값을 함께 고친다.
 *
 * 대상: 서버 응답(teams·ensembles·notes·notices)을 화면용 데이터로 바꾸는 부분.
 * 3단계에서 TanStack Query로 옮길 때 이 테스트가 그대로 통과해야 한다.
 *
 * 시각은 2026-11-20(금) 10:00(Asia/Seoul)로 고정한다.
 */
import { act, renderHook } from '@testing-library/react';
import dayjs from 'dayjs';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eventIds, url } from '@/constants';
import theme from '@/styles/theme';
import { server } from '@/test/server';
import type {
    EnsembleBlock,
    EnsembleResponse,
    NoteResponse,
    NoticeResponse,
    TeamResponse,
} from '@/types';
import { ContextProvider, useFetchContext } from '.';

/** 로컬(Asia/Seoul) 날짜·시각을 서버가 보내는 ISO(UTC) 문자열로 바꾼다 */
const iso = (local: string) => dayjs(local).toISOString();
const fmt = (block: EnsembleBlock) => block.nextDate.format('YYYY-MM-DD HH:mm');

const team = (id: string, name: string): TeamResponse => ({
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

async function fetchWith(data: {
    teams?: TeamResponse[];
    ensembles?: EnsembleResponse[];
    notes?: NoteResponse[];
    notices?: NoticeResponse[];
}) {
    server.use(
        http.get(`${url}/teams`, () => HttpResponse.json(data.teams ?? [])),
        http.get(`${url}/ensembles`, () => HttpResponse.json(data.ensembles ?? [])),
        http.get(`${url}/notes`, () => HttpResponse.json(data.notes ?? [])),
        http.get(`${url}/notices`, () => HttpResponse.json(data.notices ?? [])),
    );
    const { result } = renderHook(() => useFetchContext(), { wrapper: ContextProvider });
    await act(() => result.current.fetchData());
    return result.current;
}

/** 합주 1개를 받아 정제한 뒤, 그 합주의 첫 칸(startTime) 블록을 돌려준다 */
async function refineOne(e: EnsembleResponse) {
    const { ensembles } = await fetchWith({ teams: [team('team-a', '팀A')], ensembles: [e] });
    return ensembles[e.day]![e.startTime]![0]!;
}

describe('fetchData 정제 로직 (characterization)', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 10, 20, 10, 0)); // 2026-11-20(금) 10:00
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('테스트 시간대가 Asia/Seoul로 고정되어 있다', () => {
        expect(new Date(2026, 10, 20).getTimezoneOffset()).toBe(-540);
    });

    describe('팀', () => {
        it('_id를 id로 바꾸고 type·name·desc만 남긴다 (pin은 버린다)', async () => {
            const { teams } = await fetchWith({ teams: [team('team-a', '팀A')] });

            expect(teams).toEqual([
                {
                    id: 'team-a',
                    type: '기타 등등',
                    name: '팀A',
                    desc: ['보컬', '기타', '베이스', '드럼', '키보드', '매니저', '셋리'],
                },
            ]);
        });

        it('소모임·회의(eventIds)는 팀 목록에서 뺀다. 순서는 서버 순서 그대로', async () => {
            const { teams } = await fetchWith({
                teams: [team('team-a', '팀A'), team(eventIds[0]!, '보소'), team('team-b', '팀B')],
            });

            expect(teams.map((t) => t.id)).toEqual(['team-a', 'team-b']);
        });
    });

    describe('합주표 블록', () => {
        it('7(요일) x 30(시간칸) 크기의 2차원 배열을 만든다', async () => {
            const { ensembles } = await fetchWith({});

            expect(ensembles).toHaveLength(7);
            expect(ensembles.every((day) => day.length === 30)).toBe(true);
        });

        it('합주를 서버의 day와 startTime~endTime(양 끝 포함) 칸마다 하나씩 넣고, 첫 칸에만 팀 이름을 표시한다', async () => {
            const { ensembles } = await fetchWith({
                teams: [team('team-a', '팀A')],
                ensembles: [ensemble({ _id: 'e1', day: 4, startTime: 2, endTime: 4 })],
            });

            const day = ensembles[4]!;
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
            });
        });

        it('같은 칸에 겹치는 합주는 서버 순서대로 함께 들어간다', async () => {
            const { ensembles } = await fetchWith({
                teams: [team('team-a', '팀A'), team('team-b', '팀B')],
                ensembles: [
                    ensemble({ _id: 'e1', teamId: 'team-a', teamName: '팀A' }),
                    ensemble({ _id: 'e2', teamId: 'team-b', teamName: '팀B' }),
                ],
            });

            expect(ensembles[4]![2]!.map((b) => b.id)).toEqual(['e1', 'e2']);
        });
    });

    describe('팀 색상 (teamColor)', () => {
        it('팀은 "소모임·회의를 뺀 팀 목록에서의 순서"로 teamColors를 순환해서 쓴다', async () => {
            const teams = Array.from({ length: 22 }, (_, i) => team(`t${i}`, `팀${i}`));
            const { ensembles } = await fetchWith({
                teams,
                ensembles: [
                    ensemble({ _id: 'e0', teamId: 't0', startTime: 0, endTime: 0 }),
                    ensemble({ _id: 'e21', teamId: 't21', startTime: 1, endTime: 1 }),
                ],
            });

            expect(ensembles[4]![0]![0]!.teamColor).toBe(theme.teamColors[0]);
            // 22번째 팀(인덱스 21) → 21 % 20 = 1
            expect(ensembles[4]![1]![0]!.teamColor).toBe(theme.teamColors[1]);
        });

        it('소모임·회의는 eventIds 순서대로 eventColors를 쓴다', async () => {
            const block = await refineOne(ensemble({ _id: 'e1', teamId: eventIds[1]! }));

            expect(block.teamColor).toBe(theme.eventColors[1]);
        });

        it('팀 목록에 없는 팀(예: 삭제된 팀)의 합주는 회청색(blueGray)이다', async () => {
            const block = await refineOne(ensemble({ _id: 'e1', teamId: 'deleted-team' }));

            expect(block.teamColor).toBe(theme.blueGray);
        });
    });

    describe('다음 합주 날짜 (nextDate)', () => {
        it('일회성 합주는 서버 값 그대로 둔다', async () => {
            const block = await refineOne(
                ensemble({ _id: 'e1', repeat: false, nextDate: iso('2026-11-25') }),
            );

            expect(fmt(block)).toBe('2026-11-25 00:00');
        });

        it('일회성 합주는 오늘 날짜여도 그대로 둔다 (반복 합주 규칙을 적용하지 않음)', async () => {
            // 서버는 오늘 이후의 일회성 합주를 내려준다. 오늘 합주가 이미 끝난 시각(09:30)이라, 반복 합주였다면 7일 뒤로 바뀌었을 경우
            const block = await refineOne(
                ensemble({
                    _id: 'e1',
                    repeat: false,
                    nextDate: iso('2026-11-20'),
                    startTime: 0,
                    endTime: 0,
                }),
            );

            expect(fmt(block)).toBe('2026-11-20 00:00');
        });

        it('반복 합주의 nextDate가 내일 이후면 그대로 둔다', async () => {
            const block = await refineOne(ensemble({ _id: 'e1', nextDate: iso('2026-11-23') }));

            expect(fmt(block)).toBe('2026-11-23 00:00');
        });

        describe('반복 합주의 nextDate가 오늘 이전이고, 오늘과 같은 요일(금)일 때', () => {
            it('오늘 합주가 아직 안 끝났으면 오늘(0시)로 바꾼다', async () => {
                // endTime 3 → 끝나는 시각 idx2hour[4] = 11:00, 지금 10:00
                const block = await refineOne(
                    ensemble({ _id: 'e1', nextDate: iso('2026-11-13'), endTime: 3 }),
                );

                expect(fmt(block)).toBe('2026-11-20 00:00');
            });

            it('nextDate가 오늘이어도 같은 규칙을 따른다', async () => {
                const block = await refineOne(
                    ensemble({ _id: 'e1', nextDate: iso('2026-11-20'), endTime: 3 }),
                );

                expect(fmt(block)).toBe('2026-11-20 00:00');
            });

            it('nextDate가 오늘의 더 늦은 시각(15:00)이어도 날짜 단위로 비교해 같은 규칙을 따른다', async () => {
                // 미루기는 시각이 붙은 nextDate에 7일을 더해 저장하므로, 서버 값에 시각이 있을 수 있다
                const block = await refineOne(
                    ensemble({ _id: 'e1', nextDate: iso('2026-11-20T15:00'), endTime: 3 }),
                );

                expect(fmt(block)).toBe('2026-11-20 00:00');
            });

            it('오늘 합주가 이미 끝났으면 7일 뒤(0시)로 바꾼다', async () => {
                // startTime 0, endTime 0 → 끝나는 시각 idx2hour[1] = 09:30, 지금 10:00
                const block = await refineOne(
                    ensemble({ _id: 'e1', nextDate: iso('2026-11-13'), startTime: 0, endTime: 0 }),
                );

                expect(fmt(block)).toBe('2026-11-27 00:00');
            });

            it('마지막 칸(endTime 29)까지 하는 합주는 끝나는 시각이 24:00(다음 날 0시)이라 항상 오늘이다', async () => {
                const block = await refineOne(
                    ensemble({
                        _id: 'e1',
                        nextDate: iso('2026-11-13'),
                        startTime: 28,
                        endTime: 29,
                    }),
                );

                expect(fmt(block)).toBe('2026-11-20 00:00');
            });
        });

        describe('반복 합주의 nextDate가 오늘 이전이고, 오늘과 다른 요일일 때', () => {
            it('그 요일이 다시 오는 가장 가까운 날(0시)로 바꾼다: 화요일 → 다음 화요일', async () => {
                const block = await refineOne(
                    ensemble({ _id: 'e1', day: 1, nextDate: iso('2026-11-17') }), // 화
                );

                expect(fmt(block)).toBe('2026-11-24 00:00');
            });

            it('어제와 같은 요일(목요일)이면 6일 뒤로 바꾼다', async () => {
                const block = await refineOne(
                    ensemble({ _id: 'e1', day: 3, nextDate: iso('2026-11-19') }), // 목
                );

                expect(fmt(block)).toBe('2026-11-26 00:00');
            });

            it('일요일(dayjs의 day() = 0)도 다음 일요일로 바꾼다', async () => {
                const block = await refineOne(
                    ensemble({ _id: 'e1', day: 6, nextDate: iso('2026-11-15') }), // 일
                );

                expect(fmt(block)).toBe('2026-11-22 00:00');
            });
        });
    });

    describe('한마디·공지', () => {
        it('한마디는 { id, text }로, 공지는 content를 text로 바꾼다 (pin은 버린다)', async () => {
            const { notes, notices } = await fetchWith({
                notes: [{ _id: 'n1', text: '한마디', pin: '0000' }],
                notices: [{ _id: 'c1', content: '공지 내용', publishDate: iso('2026-11-01') }],
            });

            expect(notes).toEqual([{ id: 'n1', text: '한마디' }]);
            expect(notices).toEqual([{ id: 'c1', text: '공지 내용' }]);
        });
    });
});
