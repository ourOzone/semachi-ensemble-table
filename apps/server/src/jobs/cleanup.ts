// 정리 작업 (B-9, 사용자 요청): 날짜가 지난 것을 DB에서 지운다. 요청 없이 서버가 스스로 하는 일이라 jobs/에 둔다
// - 자동 삭제 날짜(due)가 지난 팀 → 그 팀과 그 팀의 합주
// - 반복 종료 날짜(due)가 지난 반복 합주, 날짜(nextDate)가 지난 일회성 합주
//   (GET /ensembles가 목록에서 빼는 것과 같은 기준. 이전에는 숨기기만 하고 DB에 남았다)
// "지났다" = 한국 날짜로 오늘보다 앞 (lib/time). due가 오늘이면 오늘까지는 남고 다음 날 지워진다
// 지운 것은 활동 기록에 남긴다 (team.expire·ensemble.expire, 지운 내용 전체: 지워져도 무엇이었는지 남게)
// 운영 서버 하나에서만 돈다 (CLEANUP_ENABLED, 기본 꺼짐: 같은 DB를 쓰는 베타·내 PC 서버가 같은 일을 하거나 실수로 지우지 않게)
import type { Logger } from 'pino';
import { withoutPin, type RecordSystemActivity } from '../lib/activity.ts';
import { msUntilNextKstHour, startOfKstDay } from '../lib/time.ts';
import { Ensemble } from '../models/ensemble.ts';
import { Team } from '../models/team.ts';

export interface CleanupResult {
    /** 실제로 지웠는지 (false면 세어 보기만) */
    applied: boolean;
    /** 자동 삭제 날짜가 지난 팀 (그 팀의 합주 수 포함). 이름·날짜는 사람이 확인하려고 */
    teams: { id: string; name: string | null; due: string; ensembles: number }[];
    /** 위 팀의 합주를 뺀, 날짜가 지난 합주 */
    ensembles: { repeat: number; once: number };
}

/** 날짜가 지난 합주 조건 (GET /ensembles가 보내는 조건의 반대). repeat가 없는 이상한 문서는 건드리지 않는다 */
const expiredEnsembleFilter = (today: Date) => ({
    $or: [
        { repeat: true, due: { $lt: today } },
        { repeat: false, nextDate: { $lt: today } },
    ],
});

export async function cleanupExpired({
    now,
    apply,
    record,
}: {
    now: Date;
    apply: boolean;
    /** 지운 것을 남길 활동 기록 (세어 보기면 쓰지 않는다) */
    record?: RecordSystemActivity;
}): Promise<CleanupResult> {
    const today = startOfKstDay(now);
    const result: CleanupResult = { applied: apply, teams: [], ensembles: { repeat: 0, once: 0 } };

    // 1) 자동 삭제 날짜가 지난 팀과 그 팀의 합주. due가 없는 팀(옛 팀)은 계속 유지
    const teams = await Team.find({ due: { $lt: today } });
    for (const team of teams) {
        const ensembles = await Ensemble.find({ teamId: team.id });
        result.teams.push({
            id: team.id,
            name: team.name ?? null,
            due: team.due!.toISOString().slice(0, 10), // 조건에 맞았으니 있다
            ensembles: ensembles.length,
        });
        if (!apply) continue;
        // 지우는 사이 누가 날짜를 바꿨으면(그새 수정) 지우지 않는다. 팀을 먼저 지운다 (routes/teams의 삭제와 같은 순서)
        const deleted = await Team.findOneAndDelete({ _id: team._id, due: { $lt: today } });
        if (!deleted) continue;
        await Ensemble.deleteMany({ teamId: team.id });
        await record?.({
            action: 'team.expire',
            target: { kind: 'team', id: team.id, name: team.name ?? undefined },
            before: { ...withoutPin(team), ensembles: ensembles.map((e) => withoutPin(e)) },
            result: 'ok',
        });
    }

    // 2) 날짜가 지난 합주 (1에서 팀과 함께 지운 합주는 빼고 센다)
    const teamIds = result.teams.map((t) => t.id);
    const ensembles = await Ensemble.find({
        ...expiredEnsembleFilter(today),
        teamId: { $nin: teamIds },
    });
    for (const ensemble of ensembles) {
        if (ensemble.repeat) result.ensembles.repeat++;
        else result.ensembles.once++;
        if (!apply) continue;
        const deleted = await Ensemble.findOneAndDelete({
            _id: ensemble._id,
            ...expiredEnsembleFilter(today),
        });
        if (!deleted) continue;
        await record?.({
            action: 'ensemble.expire',
            target: { kind: 'ensemble', id: ensemble.id, name: ensemble.teamName ?? undefined },
            before: withoutPin(ensemble),
            result: 'ok',
        });
    }

    return result;
}

/** 한 줄 요약 (운영 로그·스크립트 출력) */
export const summarize = ({ teams, ensembles }: CleanupResult) => ({
    teams: teams.length,
    teamEnsembles: teams.reduce((sum, t) => sum + t.ensembles, 0),
    repeatEnsembles: ensembles.repeat,
    onceEnsembles: ensembles.once,
});

/** 정리 작업을 매일 한국 시각 hour시(기본 04:00)에, 그리고 시작하자마자 한 번 돌린다. 멈추는 함수를 돌려준다 */
export function scheduleCleanup({
    run,
    logger,
    hour = 4,
    now = () => new Date(),
}: {
    run: () => Promise<CleanupResult>;
    logger: Logger;
    hour?: number;
    now?: () => Date;
}) {
    let timer: NodeJS.Timeout | undefined;
    let stopped = false;

    const tick = async () => {
        try {
            const result = await run();
            logger.info({ cleanup: summarize(result) }, '정리 작업을 마쳤습니다');
        } catch (err) {
            // 실패해도 서버는 그대로 돌고, 다음 날 다시 한다
            logger.error({ err }, '정리 작업이 실패했습니다');
        }
        if (stopped) return;
        // 다음 실행 시각을 매번 다시 계산한다 (setInterval은 실행 시간만큼 조금씩 밀린다)
        timer = setTimeout(() => void tick(), msUntilNextKstHour(now(), hour));
        timer.unref(); // 이 타이머 때문에 서버가 꺼지지 못하는 일이 없게
    };

    void tick();
    return () => {
        stopped = true;
        clearTimeout(timer);
    };
}
