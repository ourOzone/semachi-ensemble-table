// 합주 API: GET /ensembles, POST /ensemble, DELETE /ensemble, GET /ensemble/:id, PUT /ensemble
// 잡기·수정·삭제는 요청 본문의 pin(그 합주 팀의 PIN 또는 마스터 PIN)을 서버가 확인한다. 틀리면 403 (B-6)
// 틀린 횟수는 그 팀의 것으로 센다 (팀 PIN이므로). 하는 일마다 활동 기록 (B-7)
import express from 'express';
import mongoose from 'mongoose';
import { withoutPin, type RecordActivity } from '../lib/activity.ts';
import type { PinCheck } from '../lib/pin-check.ts';
import { pinTarget } from '../lib/pin-guard.ts';
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
    type: e.type,
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
            // 현재 동작: "오늘"은 서버 시간대의 0시 (D1)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

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

    // 합주 잡기 (B-6 뒤 사용자 결정: 잡을 때도 그 팀의 PIN. 팀이 없으면 마스터 PIN만, ISSUES B4)
    router.post('/ensemble', async (req, res) => {
        try {
            const data = req.body;
            const target = {
                kind: 'ensemble',
                name: typeof data.teamName === 'string' ? data.teamName : undefined,
            };
            const via = await pinCheck.require(req, res, {
                guardTarget: pinTarget.team(data.teamId),
                stored: await teamPinOf(data.teamId),
                entry: { action: 'ensemble.create', target },
            });
            if (!via) return;

            const newEnsemble = new Ensemble({
                teamId: data.teamId,
                teamName: data.teamName,
                startTime: data.startTime,
                endTime: data.endTime,
                day: data.day,
                type: data.type,
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

    // 합주 수정 (미루기·바로 하기·반복으로 바꾸기도 이 요청). teamName은 바꾸지 않는다. 현재 동작: 본문에 빠진 필드는 지워진다
    router.put('/ensemble', async (req, res) => {
        const { teamId, startTime, endTime, day, type, due, nextDate, repeat } = req.body;
        const ensembleId = req.query.id;

        try {
            if (!ensembleId) {
                return res.status(400).json({ error: 'Ensemble ID is required' });
            }

            const existingEnsemble = await Ensemble.findById(ensembleId);

            if (!existingEnsemble) {
                return res.status(404).json({ error: 'Ensemble not found' });
            }

            // 지금 합주의 팀 PIN으로 확인한다 (본문의 teamId로 바꾸기 전)
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
            existingEnsemble.teamId = teamId;
            existingEnsemble.startTime = startTime;
            existingEnsemble.endTime = endTime;
            existingEnsemble.day = day;
            existingEnsemble.type = type;
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
