// 합주 API: GET /ensembles, POST /ensemble, DELETE /ensemble, GET /ensemble/:id, PUT /ensemble
// 잡기·수정·삭제는 요청 본문의 pin(그 합주 팀의 PIN 또는 마스터 PIN)을 서버가 확인한다. 틀리면 403 (B-6)
// 틀린 횟수는 그 팀의 것으로 센다 (팀 PIN이므로). 하는 일마다 활동 기록 (B-7)
// teamName·day는 서버가 채운다: teamName = 그 팀의 이름, day = nextDate의 한국 요일 (B-8 D3). type은 없다 (B-8, 사용자 결정)
import express from 'express';
import mongoose from 'mongoose';
import { withoutPin, type RecordActivity } from '../lib/activity.ts';
import type { PinCheck } from '../lib/pin-check.ts';
import { pinTarget } from '../lib/pin-guard.ts';
import { kstDayIndex, startOfKstDay } from '../lib/time.ts';
import { Ensemble } from '../models/ensemble.ts';
import { Team } from '../models/team.ts';

/** 활동 기록에 남길 합주 내용 (바뀌기 전·후 비교용) */
const ensembleFields = (e: Record<string, unknown>) => ({
    teamId: e.teamId,
    day: e.day,
    startTime: e.startTime,
    endTime: e.endTime,
    repeat: e.repeat,
    nextDate: e.nextDate,
    due: e.due,
});

export function ensemblesRouter({
    pinCheck,
    activity,
}: {
    pinCheck: PinCheck;
    activity: RecordActivity;
}) {
    const router = express.Router();

    /** 합주 팀의 PIN. 팀이 없거나(삭제된 팀의 합주) id 형식이 아니면 없음 → 마스터 PIN만 통과 */
    const teamPinOf = async (teamId: unknown) =>
        typeof teamId === 'string' && mongoose.isValidObjectId(teamId)
            ? (await Team.findById(teamId).select('+pin'))?.pin
            : undefined;

    // 전체 합주
    router.get('/ensembles', async (_req, res) => {
        try {
            // "오늘"은 한국 날짜의 0시 (D1, B-8). 이전엔 서버 시간대의 0시라 UTC 서버에서는 KST 오전 9시였다
            const today = startOfKstDay(new Date());

            const ensembles = await Ensemble.find({
                $or: [
                    {
                        repeat: true,
                        due: { $not: { $lt: today } }, // 반복 종료 날짜(due)가 오늘 이전이 아닌 것 (due가 없으면 포함)
                    },
                    {
                        repeat: false,
                        nextDate: { $gte: today }, // 반복되지 않고, 아직 지나지 않은 일정
                    },
                ],
            });

            res.json(ensembles);
        } catch {
            res.status(500).send('Internal Server Error');
        }
    });

    // 합주 잡기 (B-6 뒤 사용자 결정: 잡을 때도 그 팀의 PIN)
    // 팀이 없으면 404 (B-8 B4, 이전: 마스터 PIN이면 없는 팀의 합주도 만들었다). 소모임·회의도 teams 컬렉션의 팀이다
    router.post('/ensemble', async (req, res) => {
        try {
            const data = req.body;
            const team =
                typeof data.teamId === 'string' && mongoose.isValidObjectId(data.teamId)
                    ? await Team.findById(data.teamId).select('+pin')
                    : null;
            if (!team) {
                await activity(req, {
                    action: 'ensemble.create',
                    target: { kind: 'team', id: String(data.teamId) },
                    result: 'not-found',
                });
                return res.status(404).json({ error: 'Team not found' });
            }

            const target = { kind: 'ensemble', name: team.name ?? undefined };
            const via = await pinCheck.require(req, res, {
                guardTarget: pinTarget.team(team.id),
                stored: team.pin,
                entry: { action: 'ensemble.create', target },
            });
            if (!via) return;

            const newEnsemble = new Ensemble({
                teamId: team.id,
                teamName: team.name,
                startTime: data.startTime,
                endTime: data.endTime,
                day: kstDayIndex(new Date(data.nextDate)),
                due: data.due,
                nextDate: data.nextDate,
                repeat: data.repeat,
            });

            await newEnsemble.save();
            await activity(req, {
                action: 'ensemble.create',
                target: { ...target, id: newEnsemble.id },
                after: ensembleFields(newEnsemble.toObject()),
                pin: via,
                result: 'ok',
            });
            res.send({ id: newEnsemble._id });
        } catch {
            res.status(500).send('Internal Server Error');
        }
    });

    // 합주 삭제
    router.delete('/ensemble', async (req, res) => {
        const ensembleId = req.query.id;

        // id가 없으면 바로 404 (조건 없이 찾거나 지우지 않게)
        if (ensembleId === undefined) {
            return res.status(404).json({ id: -1 });
        }

        try {
            const existingEnsemble = await Ensemble.findById(ensembleId);

            if (!existingEnsemble) {
                return res.status(404).json({ id: -1 });
            }

            const target = {
                kind: 'ensemble',
                id: existingEnsemble.id,
                name: existingEnsemble.teamName ?? undefined,
            };
            const via = await pinCheck.require(req, res, {
                guardTarget: pinTarget.team(existingEnsemble.teamId),
                stored: await teamPinOf(existingEnsemble.teamId),
                entry: { action: 'ensemble.delete', target },
            });
            if (!via) return;

            await Ensemble.findByIdAndDelete(ensembleId);
            await activity(req, {
                action: 'ensemble.delete',
                target,
                before: withoutPin(existingEnsemble),
                pin: via,
                result: 'ok',
            });
            res.json({ id: ensembleId });
        } catch {
            res.status(500).send('Internal Server Error');
        }
    });

    // 합주 존재하는지 확인
    router.get('/ensemble/:id', async (req, res) => {
        const ensembleId = req.params.id;

        try {
            const existingEnsemble = await Ensemble.findById(ensembleId);

            if (existingEnsemble) {
                res.json(true);
            } else {
                res.status(404).json(false);
            }
        } catch {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 합주 수정 (미루기·바로 하기·반복으로 바꾸기도 이 요청). 팀은 바꾸지 않는다 (B-8: 웹도 팀을 바꿀 수 없다. 이전엔 본문의 teamId로 바꾸고 teamName은 그대로라 서로 어긋났다)
    // 현재 동작: 본문에 빠진 필드는 지워진다 (입력 검증에서 막는다)
    router.put('/ensemble', async (req, res) => {
        const { startTime, endTime, due, nextDate, repeat } = req.body;
        const ensembleId = req.query.id;

        try {
            if (!ensembleId) {
                return res.status(400).json({ error: 'Ensemble ID is required' });
            }

            const existingEnsemble = await Ensemble.findById(ensembleId);

            if (!existingEnsemble) {
                return res.status(404).json({ error: 'Ensemble not found' });
            }

            // 지금 합주의 팀 PIN으로 확인한다
            const target = {
                kind: 'ensemble',
                id: existingEnsemble.id,
                name: existingEnsemble.teamName ?? undefined,
            };
            const via = await pinCheck.require(req, res, {
                guardTarget: pinTarget.team(existingEnsemble.teamId),
                stored: await teamPinOf(existingEnsemble.teamId),
                entry: { action: 'ensemble.update', target },
            });
            if (!via) return;

            const before = ensembleFields(existingEnsemble.toObject());
            existingEnsemble.startTime = startTime;
            existingEnsemble.endTime = endTime;
            existingEnsemble.day = kstDayIndex(new Date(nextDate));
            existingEnsemble.due = due;
            existingEnsemble.nextDate = nextDate;
            existingEnsemble.repeat = repeat;

            await existingEnsemble.save();
            await activity(req, {
                action: 'ensemble.update',
                target,
                before,
                after: ensembleFields(existingEnsemble.toObject()),
                pin: via,
                result: 'ok',
            });

            res.json({ message: 'Ensemble updated successfully', id: existingEnsemble._id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}
