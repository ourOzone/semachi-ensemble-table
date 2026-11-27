// 팀 API: GET /teams, POST /team, POST /check-team-pin, DELETE /team, PUT /team, GET /team/:id
// (모든 팀을 지우던 DELETE /teams는 B-5에서 삭제: B2)
// 수정·삭제는 요청 본문의 pin(팀 PIN 또는 마스터 PIN)을 서버가 확인한다. 틀리면 403 (B-6 B1)
// 목록에는 PIN을 넣지 않는다 (모델의 select: false, B-6 B3)
import express from 'express';
import type { Logger } from '../lib/log.ts';
import { WRONG_PIN, type PinAuth } from '../lib/pin-auth.ts';
import { markPin, type PinLimit } from '../middleware/pin-limit.ts';
import { Ensemble } from '../models/ensemble.ts';
import { Team } from '../models/team.ts';

export function teamsRouter({
    log,
    pins,
    pinLimit,
}: {
    log: Logger;
    pins: PinAuth;
    pinLimit: PinLimit;
}) {
    const router = express.Router();
    // 확인 API와 수정·삭제가 같은 팀이면 함께 센다
    const limitTeamFromBody = pinLimit((req) => `team:${req.body.teamId}`);
    const limitTeamFromQuery = pinLimit((req) => `team:${req.query.id}`);

    // 전체팀
    router.get('/teams', async (req, res) => {
        log(req.visitorId, 'pageload');
        try {
            const teams = await Team.find();
            res.json(teams);
        } catch {
            res.status(500).send('Internal Server Error');
        }
    });

    // 팀 추가 (PIN을 정하는 요청이라 확인하지 않는다)
    router.post('/team', async (req, res) => {
        try {
            const data = req.body;
            log(req.visitorId, `addteam_${data.name}`);

            const newTeam = new Team({
                name: data.name,
                desc: data.desc,
                type: data.type,
                publishDate: data.publishDate,
                pin: await pins.forStorage(data.pin),
            });

            await newTeam.save();
            res.send({ id: newTeam._id });
        } catch {
            res.status(500).send('Internal Server Error');
        }
    });

    // PIN 확인 (웹의 PIN 칸이 4자리를 다 넣으면 바로 부른다). 틀린 시도는 횟수 제한 (S2)
    router.post('/check-team-pin', ...limitTeamFromBody, async (req, res) => {
        try {
            const { teamId, pin } = req.body;

            if (!teamId || !pin) {
                return res.status(400).json({ error: 'Both teamId and pin are required' });
            }

            if (await pins.isMaster(pin)) {
                markPin(req, res, true);
                return res.json(true);
            }

            const team = await Team.findById(teamId).select('+pin');

            if (!team) {
                return res.status(404).json({ error: 'Team not found' });
            }

            const ok = await pins.matches(pin, team.pin);
            markPin(req, res, ok);
            return res.json(ok);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 팀 삭제 (그 팀의 합주도 함께)
    router.delete('/team', ...limitTeamFromQuery, async (req, res) => {
        const teamId = req.query.id as string | undefined; // 현재 동작: 형식 검사 없음 (B-8)

        // id가 없으면 바로 404 (조건 없이 찾거나 지우지 않게)
        if (teamId === undefined) {
            return res.status(404).json({ id: -1 });
        }

        try {
            // PIN을 확인하려면 팀을 먼저 읽어야 한다 (B-5 O5의 "조회 한 번"은 PIN 확인 때문에 두 번으로)
            const team = await Team.findById(teamId).select('+pin');

            if (!team) {
                return res.status(404).json({ id: -1 });
            }

            const ok = await pins.matches(req.body.pin, team.pin);
            markPin(req, res, ok);
            if (!ok) return res.status(403).json(WRONG_PIN);

            // 팀을 먼저 지운다: 합주 삭제가 실패해도 팀만 남는 일은 없다
            await Team.findByIdAndDelete(teamId);
            log(req.visitorId, `deleteteam_${team.name}`);
            await Ensemble.deleteMany({ teamId });
            res.json({ id: teamId });
        } catch {
            res.status(500).send('Internal Server Error');
        }
    });

    // 팀 수정 (그 팀 합주의 teamName도 함께). 현재 동작: 본문에 빠진 필드는 지워진다. PIN은 바꾸지 않는다
    router.put('/team', ...limitTeamFromQuery, async (req, res) => {
        try {
            const teamId = req.query.id as string | undefined; // 현재 동작: 형식 검사 없음 (B-8)
            const existingTeam = await Team.findById(teamId).select('+pin');

            if (!existingTeam) {
                return res.status(404).json({ error: 'Team not found' });
            }

            const ok = await pins.matches(req.body.pin, existingTeam.pin);
            markPin(req, res, ok);
            if (!ok) return res.status(403).json(WRONG_PIN);

            log(req.visitorId, `modifyteam_${existingTeam.name}`);

            existingTeam.name = req.body.name;
            existingTeam.desc = req.body.desc;
            existingTeam.type = req.body.type;

            await existingTeam.save();
            await Ensemble.updateMany({ teamId }, { $set: { teamName: req.body.name } });

            res.json({ id: teamId });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 팀 존재 여부 확인
    router.get('/team/:id', async (req, res) => {
        const teamId = req.params.id;

        try {
            const existingTeam = await Team.findById(teamId);

            if (existingTeam) {
                res.json(true);
            } else {
                res.status(404).json(false);
            }
        } catch {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}
