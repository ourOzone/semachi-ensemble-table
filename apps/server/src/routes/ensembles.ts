// 합주 API: GET /ensembles, POST /ensemble, DELETE /ensemble, GET /ensemble/:id, PUT /ensemble
// 현재 동작: 변경 API가 PIN을 확인하지 않는다 (B1, B-6). 합주를 만들 때 팀이 있는지 보지 않는다 (B4)
import express from 'express';
import type { Logger } from '../lib/log.ts';
import { Ensemble } from '../models/ensemble.ts';

export function ensemblesRouter({ log }: { log: Logger }) {
    const router = express.Router();

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
    router.delete('/ensemble', async (req, res) => {
        const ensembleId = req.query.id;

        // id가 없으면 바로 404. findByIdAndDelete(undefined)가 무엇을 하는지(지금 Mongoose 9는 아무것도 지우지 않음)에 기대지 않는다
        if (ensembleId === undefined) {
            return res.status(404).json({ id: -1 });
        }

        try {
            // 조회 없이 바로 지운다 (O5)
            const deletedEnsemble = await Ensemble.findByIdAndDelete(ensembleId);

            if (!deletedEnsemble) {
                return res.status(404).json({ id: -1 });
            }

            log(req.visitorId, `deleteensemble_${deletedEnsemble.teamName}`);
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
