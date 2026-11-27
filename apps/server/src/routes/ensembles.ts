// 합주 API: GET /ensembles, POST /ensemble, DELETE /ensemble, GET /ensemble/:id, PUT /ensemble
// 현재 동작: 변경 API가 PIN을 확인하지 않는다 (B1, B-6). 합주를 만들 때 팀이 있는지 보지 않는다 (B4)
import express from 'express';
import mongoose from 'mongoose';
import type { Logger } from '../lib/log.ts';
import { WRONG_PIN, type PinAuth } from '../lib/pin-auth.ts';
import { markPin, type PinLimit } from '../middleware/pin-limit.ts';
import { Ensemble } from '../models/ensemble.ts';
import { Team } from '../models/team.ts';

export function ensemblesRouter({
    log,
    pins,
    pinLimit,
}: {
    log: Logger;
    pins: PinAuth;
    pinLimit: PinLimit;
}) {
    const router = express.Router();
    const limitEnsemble = pinLimit((req) => `ensemble:${req.query.id}`);

    /** 합주 팀의 PIN. 팀이 없거나(삭제된 팀의 합주) id 형식이 아니면 없음 → 마스터 PIN만 통과 */
    const teamPinOf = async (teamId: string | null | undefined) =>
        teamId && mongoose.isValidObjectId(teamId)
            ? (await Team.findById(teamId).select('+pin'))?.pin
            : undefined;

    // 전체 합주
    router.get('/ensembles', async (req, res) => {
        try {
            // 현재 동작: "오늘"은 서버 시간대의 0시 (D1, B-5)
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

    // 합주 추가
    router.post('/ensemble', async (req, res) => {
        try {
            const data = req.body;
            log(req.visitorId, `addensemble_${data.teamName}`);

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
            res.send({ id: newEnsemble._id });
        } catch {
            res.status(500).send('Internal Server Error');
        }
    });

    // 합주 삭제
    router.delete('/ensemble', ...limitEnsemble, async (req, res) => {
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

            const ok = await pins.matches(req.body.pin, await teamPinOf(existingEnsemble.teamId));
            markPin(req, res, ok);
            if (!ok) return res.status(403).json(WRONG_PIN);

            await Ensemble.findByIdAndDelete(ensembleId);
            log(req.visitorId, `deleteensemble_${existingEnsemble.teamName}`);
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

    // 합주 수정. teamName은 바꾸지 않는다. 현재 동작: 본문에 빠진 필드는 지워진다
    router.put('/ensemble', ...limitEnsemble, async (req, res) => {
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
            const ok = await pins.matches(req.body.pin, await teamPinOf(existingEnsemble.teamId));
            markPin(req, res, ok);
            if (!ok) return res.status(403).json(WRONG_PIN);

            existingEnsemble.teamId = teamId;
            existingEnsemble.startTime = startTime;
            existingEnsemble.endTime = endTime;
            existingEnsemble.day = day;
            existingEnsemble.type = type;
            existingEnsemble.due = due;
            existingEnsemble.nextDate = nextDate;
            existingEnsemble.repeat = repeat;

            await existingEnsemble.save();

            res.json({ message: 'Ensemble updated successfully', id: existingEnsemble._id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}
