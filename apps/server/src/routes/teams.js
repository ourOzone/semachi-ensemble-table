// 팀 API: GET /teams, POST /team, POST /check-team-pin, DELETE /team, DELETE /teams, PUT /team, GET /team/:id
// 현재 동작: 변경 API가 PIN을 확인하지 않는다 (B1, B-6). 응답에 PIN이 들어 있다 (B3)
import express from 'express';
import { Ensemble } from '../models/ensemble.js';
import { Team } from '../models/team.js';

export function teamsRouter({ log, masterPin }) {
    const router = express.Router();

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

    // 팀 추가
    router.post('/team', async (req, res) => {
        try {
            const data = req.body;
            log(req.visitorId, `addteam_${data.name}`);

            const newTeam = new Team({
                name: data.name,
                desc: data.desc,
                type: data.type,
                publishDate: data.publishDate,
                pin: data.pin,
            });

            await newTeam.save();
            res.send({ id: newTeam._id });
        } catch {
            res.status(500).send('Internal Server Error');
        }
    });

    router.post('/check-team-pin', async (req, res) => {
        try {
            const { teamId, pin } = req.body;

            // teamId와 pin이 제공되지 않은 경우 오류 처리
            if (!teamId || !pin) {
                return res.status(400).json({ error: 'Both teamId and pin are required' });
            }

            if (pin === masterPin) {
                return res.json(true);
            }

            // 해당 팀을 데이터베이스에서 조회
            const team = await Team.findById(teamId);

            if (!team) {
                return res.status(404).json({ error: 'Team not found' });
            }

            // 팀의 pin과 제공된 pin이 일치하는지 확인
            return res.json(team.pin === pin);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 팀 삭제 (그 팀의 합주도 함께)
    router.delete('/team', async (req, res) => {
        const teamId = req.query.id;

        try {
            const existingTeam = await Team.findById(teamId);

            if (!existingTeam) {
                return res.status(404).json({ id: -1 });
            }

            log(req.visitorId, `deleteteam_${existingTeam.name}`);
            await Ensemble.deleteMany({ teamId });
            const deletedTeam = await Team.findByIdAndDelete(teamId);

            if (deletedTeam) {
                res.json({ id: teamId });
            } else {
                res.status(500).send('Internal Server Error');
            }
        } catch {
            res.status(500).send('Internal Server Error');
        }
    });

    // 전체팀 삭제. 현재 동작: 인증 없이 모든 팀을 지운다 (B2, B-5에서 삭제)
    router.delete('/teams', async (req, res) => {
        log(req.visitorId, '전체팀을삭제했습니다.엄벌을내리십시오_');
        try {
            const result = await Team.deleteMany({});
            res.json({
                message: `All teams (${result.deletedCount}) have been successfully deleted.`,
            });
        } catch {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 팀 수정 (그 팀 합주의 teamName도 함께). 현재 동작: 본문에 빠진 필드는 지워진다
    router.put('/team', async (req, res) => {
        try {
            const teamId = req.query.id;
            const existingTeam = await Team.findById(teamId);

            if (!existingTeam) {
                return res.status(404).json({ error: 'Team not found' });
            }

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
