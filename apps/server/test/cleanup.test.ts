// 정리 작업 (jobs/cleanup.ts, B-9): 날짜 지난 팀·합주 지우기, 활동 기록, 매일 04:00 실행
import { pino } from 'pino';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanupExpired, scheduleCleanup, type CleanupResult } from '../src/jobs/cleanup.ts';
import { createSystemActivityRecorder } from '../src/lib/activity.ts';
import { activities, api, ensembleDoc, findAll, insert, teamDoc } from './helpers.ts';

// 지금 = KST 11/28 04:00. "오늘"은 11/28 (한국 날짜). due는 그날 UTC 0시로 저장된다
const NOW = new Date('2026-11-27T19:00:00Z');
const day = (date: string) => new Date(`${date}T00:00:00Z`);
const silent = pino({ level: 'silent' });
const record = createSystemActivityRecorder({ env: 'test', logger: silent });

const names = async (collection: 'teams' | 'ensembles') =>
    (await findAll(collection)).map((d) => d.name ?? d.teamName);

describe('cleanupExpired', () => {
    test('자동 삭제 날짜가 어제인 팀과 그 팀의 합주를 지운다. 오늘·내일·계속 유지·날짜 없는(옛) 팀은 남긴다', async () => {
        const yesterday = await insert('teams', teamDoc({ name: '어제', due: day('2026-11-27') }));
        await insert('teams', teamDoc({ name: '오늘', due: day('2026-11-28') }));
        await insert('teams', teamDoc({ name: '계속', due: day('2099-12-31') }));
        await insert('teams', teamDoc({ name: '옛 팀' }));
        // 지워질 팀의 합주 (계속 반복이어도 팀과 함께)
        await insert('ensembles', ensembleDoc({ teamId: yesterday, teamName: '어제' }));
        await insert('ensembles', ensembleDoc({ teamName: '다른 팀' }));

        const result = await cleanupExpired({ now: NOW, apply: true, record });

        expect(result.teams).toEqual([
            { id: yesterday, name: '어제', due: '2026-11-27', ensembles: 1 },
        ]);
        expect(await names('teams')).toEqual(['오늘', '계속', '옛 팀']);
        expect(await names('ensembles')).toEqual(['다른 팀']);
    });

    test('반복 종료 날짜가 지난 반복 합주, 날짜가 지난 일회성 합주를 지운다 (GET /ensembles가 빼는 것과 같은 기준)', async () => {
        await insert(
            'ensembles',
            ensembleDoc({ teamName: '반복 어제 끝', due: day('2026-11-27') }),
        );
        await insert(
            'ensembles',
            ensembleDoc({ teamName: '반복 오늘 끝', due: day('2026-11-28') }),
        );
        await insert('ensembles', ensembleDoc({ teamName: '반복 계속', due: day('2099-12-31') }));
        await insert('ensembles', ensembleDoc({ teamName: '반복 due 없음', due: undefined }));
        const once = { repeat: false };
        // 일회성: nextDate는 시작 시각. 한국 날짜 11/27 23:30 = 11/27T14:30Z, 11/28 00:00 = 11/27T15:00Z
        await insert(
            'ensembles',
            ensembleDoc({
                ...once,
                teamName: '일회 어제',
                nextDate: new Date('2026-11-27T14:30:00Z'),
            }),
        );
        await insert(
            'ensembles',
            ensembleDoc({
                ...once,
                teamName: '일회 오늘',
                nextDate: new Date('2026-11-27T15:00:00Z'),
            }),
        );
        // repeat가 없는 이상한 문서는 건드리지 않는다
        await insert(
            'ensembles',
            ensembleDoc({ repeat: undefined, teamName: '모름', due: day('2020-01-01') }),
        );

        // 지우기 전에 목록에 보이던 것 = 지운 뒤 남는 것 (모름은 목록에도 안 보인다)
        vi.useFakeTimers({ toFake: ['Date'], now: NOW });
        const listed = ((await api().get('/ensembles')).body as { teamName: string }[]).map(
            (e) => e.teamName,
        );
        vi.useRealTimers();

        const result = await cleanupExpired({ now: NOW, apply: true, record });
        expect(result.ensembles).toEqual({ repeat: 1, once: 1 });
        expect(await names('ensembles')).toEqual([...listed, '모름']);
        expect(listed).toEqual(['반복 오늘 끝', '반복 계속', '반복 due 없음', '일회 오늘']);
    });

    test('세어 보기(apply: false)는 지우지 않고 기록도 남기지 않는다', async () => {
        const id = await insert('teams', teamDoc({ name: '어제', due: day('2026-11-27') }));
        await insert('ensembles', ensembleDoc({ teamId: id }));
        await insert('ensembles', ensembleDoc({ repeat: false, nextDate: day('2026-01-01') }));

        const result = await cleanupExpired({ now: NOW, apply: false, record });

        expect(result).toMatchObject({
            applied: false,
            teams: [{ name: '어제', ensembles: 1 }],
            ensembles: { repeat: 0, once: 1 },
        });
        expect(await findAll('teams')).toHaveLength(1);
        expect(await findAll('ensembles')).toHaveLength(2);
        expect(await activities()).toHaveLength(0);
    });

    test('지운 것을 활동 기록에 남긴다: 지운 내용 전체, 방문자·IP 없음, PIN 없음', async () => {
        const id = await insert(
            'teams',
            teamDoc({ name: '지울 팀', pin: '4826', due: day('2026-11-27') }),
        );
        await insert('ensembles', ensembleDoc({ teamId: id, startTime: 3 }));
        const e = await insert(
            'ensembles',
            ensembleDoc({ teamName: '지난 합주', repeat: false, nextDate: day('2026-11-01') }),
        );

        await cleanupExpired({ now: NOW, apply: true, record });

        const [team, ensemble] = await activities();
        expect(team).toMatchObject({
            env: 'test',
            action: 'team.expire',
            target: { kind: 'team', id, name: '지울 팀' },
            before: { name: '지울 팀', ensembles: [{ teamId: id, startTime: 3 }] },
            result: 'ok',
        });
        expect(team?.before).not.toHaveProperty('pin');
        expect(team).not.toHaveProperty('visitorId');
        expect(team).not.toHaveProperty('ip');
        expect(ensemble).toMatchObject({
            action: 'ensemble.expire',
            target: { kind: 'ensemble', id: e, name: '지난 합주' },
            before: { repeat: false },
        });
    });

    test('두 번 돌려도 같다 (지울 것이 없으면 아무 일도 없음)', async () => {
        await insert('teams', teamDoc({ due: day('2026-11-27') }));
        await cleanupExpired({ now: NOW, apply: true, record });
        expect(await cleanupExpired({ now: NOW, apply: true, record })).toEqual({
            applied: true,
            teams: [],
            ensembles: { repeat: 0, once: 0 },
        });
        expect(await activities()).toHaveLength(1);
    });
});

describe('scheduleCleanup', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    const done: CleanupResult = { applied: true, teams: [], ensembles: { repeat: 0, once: 0 } };

    test('시작하자마자 한 번, 그 뒤 매일 한국 시각 04:00에', async () => {
        vi.useFakeTimers({ now: new Date('2026-11-28T03:00:00Z') }); // KST 11/28 12:00
        const run = vi.fn<() => Promise<CleanupResult>>(async () => done);
        const stop = scheduleCleanup({ run, logger: silent });

        await vi.advanceTimersByTimeAsync(0);
        expect(run).toHaveBeenCalledTimes(1);
        // 다음은 KST 11/29 04:00 = 11/28T19:00Z (16시간 뒤)
        await vi.advanceTimersByTimeAsync(16 * 60 * 60 * 1000 - 1);
        expect(run).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(run).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
        expect(run).toHaveBeenCalledTimes(3);
        stop();
        await vi.advanceTimersByTimeAsync(48 * 60 * 60 * 1000);
        expect(run).toHaveBeenCalledTimes(3);
    });

    test('실패해도 멈추지 않고 다음 날 다시 한다', async () => {
        vi.useFakeTimers({ now: new Date('2026-11-28T03:00:00Z') });
        const run = vi.fn<() => Promise<CleanupResult>>(async () => {
            throw new Error('DB 끊김');
        });
        const stop = scheduleCleanup({ run, logger: silent });
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(16 * 60 * 60 * 1000);
        expect(run).toHaveBeenCalledTimes(2);
        stop();
    });
});
