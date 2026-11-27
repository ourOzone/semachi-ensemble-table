// 관리자 API (B-6·B-7). 관리자 화면(웹 /admin)이 부른다. 마스터 PIN으로 로그인한다 (사용자 결정)
// - POST /admin/login { pin } → 맞으면 관리자 쿠키 (lib/admin-session, 12시간). 틀린 횟수는 "마스터"로 센다
// - GET /admin/session → { admin } (화면이 로그인 상태를 묻는다), POST /admin/logout
// - 로그인해야 하는 것: 활동 기록 찾기, 방문자 한 명의 기록과 같은 IP·기기의 다른 방문자, 요약, 마스터 PIN 바꾸기
// 활동 기록에는 IP·기기 같은 사람을 짐작할 수 있는 정보가 있어 관리자만 본다
import express, { type RequestHandler } from 'express';
import type { RecordActivity } from '../lib/activity.ts';
import type { AdminSessions } from '../lib/admin-session.ts';
import { MASTER_PIN_FORMAT, WRONG_PIN, type PinAuth } from '../lib/pin-auth.ts';
import type { PinCheck } from '../lib/pin-check.ts';
import { pinTarget, type PinGuard } from '../lib/pin-guard.ts';
import { Activity } from '../models/activity.ts';

const NOT_ADMIN = { error: 'Admin login required' };
const DAY = 24 * 60 * 60 * 1000;

/** 쿼리의 문자열 값만 (배열·객체로 오면 무시) */
const text = (value: unknown) => (typeof value === 'string' && value !== '' ? value : undefined);

export function adminRouter({
    pins,
    guard,
    pinCheck,
    activity,
    sessions,
}: {
    pins: PinAuth;
    guard: PinGuard;
    pinCheck: PinCheck;
    activity: RecordActivity;
    sessions: AdminSessions;
}) {
    const router = express.Router();

    const requireAdmin: RequestHandler = (req, res, next) => {
        if (sessions.isAdmin(req)) return next();
        res.status(401).json(NOT_ADMIN);
    };

    router.get('/admin/session', (req, res) => {
        res.json({ admin: sessions.isAdmin(req) });
    });

    router.post('/admin/login', async (req, res) => {
        try {
            const entry = { action: 'admin.login', target: { kind: 'master' } } as const;
            if (guard.rejectIfBlocked(req, res, pinTarget.master)) {
                await activity(req, { ...entry, result: 'blocked' });
                return;
            }
            const ok = await pins.isMaster(req.body.pin);
            guard.record(req, res, pinTarget.master, ok);
            await activity(req, {
                ...entry,
                ...(ok && { pin: 'master' }),
                result: ok ? 'ok' : 'wrong-pin',
            });
            if (!ok) return res.status(403).json(WRONG_PIN);
            sessions.issue(res);
            res.json({ admin: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    router.post('/admin/logout', (_req, res) => {
        sessions.clear(res);
        res.json({ admin: false });
    });

    // 활동 기록 찾기 (최근 것부터). 거르기: 방문자 id·IP·동작(앞부분 일치, 예: "team")·대상 id·결과·PIN 종류·서버
    // before(시각)보다 이전 것만 → 더 보기. limit 최대 200
    router.get('/admin/activities', requireAdmin, async (req, res) => {
        try {
            const q = req.query;
            const filter: Record<string, unknown> = {};
            for (const [param, field] of [
                ['visitorId', 'visitorId'],
                ['ip', 'ip'],
                ['targetId', 'target.id'],
                ['result', 'result'],
                ['pin', 'pin'],
                ['env', 'env'],
            ] as const) {
                const value = text(q[param]);
                if (value) filter[field] = value;
            }
            const action = text(q.action);
            if (action) filter.action = { $regex: `^${action.replace(/[^a-z.-]/gi, '')}` };
            const before = text(q.before);
            if (before && !Number.isNaN(Date.parse(before))) filter.at = { $lt: new Date(before) };
            const limit = Math.min(Math.max(Number(text(q.limit) ?? 100) || 100, 1), 200);

            const activities = await Activity.find(filter).sort({ at: -1 }).limit(limit).lean();
            res.json({ activities });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 방문자 한 명: 처음·마지막으로 본 때, 쓴 IP·기기, 그 기록(최근 200건),
    // 같은 IP나 같은 기기(User-Agent)를 쓴 다른 방문자 id (쿠키를 지운 같은 사람일 수 있다)
    router.get('/admin/visitors/:id', requireAdmin, async (req, res) => {
        try {
            const visitorId = req.params.id;
            const [summary] = await Activity.aggregate<{
                firstSeen: Date;
                lastSeen: Date;
                count: number;
                ips: string[];
                userAgents: string[];
            }>([
                { $match: { visitorId } },
                {
                    $group: {
                        _id: null,
                        firstSeen: { $min: '$at' },
                        lastSeen: { $max: '$at' },
                        count: { $sum: 1 },
                        ips: { $addToSet: '$ip' },
                        userAgents: { $addToSet: '$userAgent' },
                    },
                },
            ]);
            if (!summary) return res.status(404).json({ error: 'Visitor not found' });

            const ips = summary.ips.filter(Boolean);
            const userAgents = summary.userAgents.filter(Boolean);
            const related = await Activity.aggregate([
                {
                    $match: {
                        visitorId: { $ne: visitorId },
                        $or: [{ ip: { $in: ips } }, { userAgent: { $in: userAgents } }],
                    },
                },
                {
                    $group: {
                        _id: '$visitorId',
                        lastSeen: { $max: '$at' },
                        count: { $sum: 1 },
                        sharedIps: { $addToSet: { $cond: [{ $in: ['$ip', ips] }, '$ip', null] } },
                        sameDevice: { $max: { $in: ['$userAgent', userAgents] } },
                    },
                },
                { $sort: { lastSeen: -1 } },
                { $limit: 20 },
            ]);
            const devices = await Activity.aggregate([
                { $match: { visitorId } },
                {
                    $group: {
                        _id: '$userAgent',
                        device: { $first: '$device' },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
            ]);
            const activities = await Activity.find({ visitorId })
                .sort({ at: -1 })
                .limit(200)
                .lean();

            res.json({
                visitorId,
                firstSeen: summary.firstSeen,
                lastSeen: summary.lastSeen,
                count: summary.count,
                ips,
                devices: devices.map(({ _id, device, count }) => ({
                    userAgent: _id,
                    device,
                    count,
                })),
                related: related.map(({ _id, lastSeen, count, sharedIps, sameDevice }) => ({
                    visitorId: _id,
                    lastSeen,
                    count,
                    sharedIps: (sharedIps as (string | null)[]).filter(Boolean),
                    sameDevice,
                })),
                activities,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 요약: 최근 24시간 방문자 수, 최근 7일 PIN을 많이 틀린 방문자, 최근 마스터 PIN 사용
    router.get('/admin/overview', requireAdmin, async (_req, res) => {
        try {
            const now = Date.now();
            const visitors24h = (
                await Activity.distinct('visitorId', { at: { $gte: new Date(now - DAY) } })
            ).length;
            const pinFailures = await Activity.aggregate([
                {
                    $match: {
                        at: { $gte: new Date(now - 7 * DAY) },
                        result: { $in: ['wrong-pin', 'blocked'] },
                    },
                },
                {
                    $group: {
                        _id: '$visitorId',
                        count: { $sum: 1 },
                        blocked: { $sum: { $cond: [{ $eq: ['$result', 'blocked'] }, 1, 0] } },
                        lastAt: { $max: '$at' },
                        ips: { $addToSet: '$ip' },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: 20 },
            ]);
            const masterUses = await Activity.find({ pin: 'master', result: 'ok' })
                .sort({ at: -1 })
                .limit(30)
                .lean();
            res.json({
                visitors24h,
                pinFailures: pinFailures.map(({ _id, ...rest }) => ({ visitorId: _id, ...rest })),
                masterUses,
                masterPinSource: await pins.masterSource(),
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 마스터 PIN 바꾸기 { currentPin, newPin }: 로그인한 뒤에도 지금 마스터 PIN을 한 번 더 넣는다 (틀린 횟수는 "마스터"로)
    // 바꾼 PIN은 DB(settings)에 해시로 남고, 같은 DB를 쓰는 새 서버(운영·베타)는 바로 따른다.
    // 옛 서버(api.js)는 계속 .env의 MASTER_PIN을 쓴다 (운영 전환 B-14 전까지)
    router.put('/admin/master-pin', requireAdmin, async (req, res) => {
        try {
            const { newPin } = req.body;

            if (typeof newPin !== 'string' || !MASTER_PIN_FORMAT.test(newPin)) {
                return res.status(400).json({ error: 'newPin must be 4 digits' });
            }

            const via = await pinCheck.require(req, res, {
                pin: req.body.currentPin,
                guardTarget: pinTarget.master,
                stored: null,
                entry: { action: 'admin.master-pin', target: { kind: 'master' } },
            });
            if (!via) return;

            await pins.changeMaster(newPin);
            await activity(req, {
                action: 'admin.master-pin',
                target: { kind: 'master' },
                pin: 'master',
                result: 'ok',
            });
            res.json({ message: 'Master PIN changed' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}
