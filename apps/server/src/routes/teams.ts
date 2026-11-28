// 팀 API (B-10 A2: 복수형 경로 + 주소 안의 id)
//   GET    /teams                 목록
//   POST   /teams                 만들기 → 201 { id }
//   GET    /teams/:id             한 팀 (없으면 404. 이전의 "있는지 확인" GET /team/:id → true를 대신한다)
//   PUT    /teams/:id             수정 (PIN) → 200 { id }
//   DELETE /teams/:id             삭제 (PIN, 그 팀의 합주도) → 204
//   POST   /teams/:id/check-pin   PIN 확인 { pin } → true/false
// (이전: POST /team, PUT·DELETE /team?id=, GET /team/:id, POST /check-team-pin { teamId, pin }. 모든 팀을 지우던 DELETE /teams는 B-5에서 삭제: B2)
// 수정·삭제는 요청 본문의 pin(팀 PIN 또는 마스터 PIN)을 서버가 확인한다. 틀리면 403 (B-6 B1)
// 목록에는 PIN을 넣지 않는다 (모델의 select: false, B-6 B3). 하는 일마다 활동 기록 (B-7)
// 본문·id는 packages/shared의 스키마로 먼저 검사한다. 틀리면 400 (B-8 S5)
// 팀 자동 삭제 날짜(due)를 받아 저장한다. 날짜가 지나면 정리 작업(jobs/cleanup)이 팀과 그 팀의 합주를 지운다 (B-9)
// 오류는 { error: { code, message } } (lib/errors). 처리 중 던져진 오류는 middleware/errors가 500으로 (B-10 A1)
import {
    idParamsSchema,
    pinCheckBodySchema,
    teamCreateBodySchema,
    teamUpdateBodySchema,
} from '@semachi/shared';
import express from 'express';
import { withoutPin, type RecordActivity } from '../lib/activity.ts';
import { sendError } from '../lib/errors.ts';
import type { PinAuth } from '../lib/pin-auth.ts';
import type { PinCheck } from '../lib/pin-check.ts';
import { pinTarget, type PinGuard } from '../lib/pin-guard.ts';
import { kstDateString } from '../lib/time.ts';
import { sendInvalid, validate } from '../lib/validate.ts';
import { Ensemble } from '../models/ensemble.ts';
import { Team } from '../models/team.ts';

/** 활동 기록에 남길 팀 내용 (바뀌기 전·후 비교용) */
const teamFields = (team: { name?: unknown; type?: unknown; desc?: unknown; due?: unknown }) => ({
    name: team.name,
    type: team.type,
    desc: team.desc,
    due: team.due,
});

/** 저장된 due(그날 UTC 0시)를 'YYYY-MM-DD'로. 없으면(옛 팀) null */
const dueString = (due: Date | null | undefined) => (due ? due.toISOString().slice(0, 10) : null);

const TEAM_NOT_FOUND = { message: '팀이 없습니다' };
const PAST_DUE = '지난 날짜다';

export function teamsRouter({
    pins,
    guard,
    pinCheck,
    activity,
}: {
    pins: PinAuth;
    guard: PinGuard;
    pinCheck: PinCheck;
    activity: RecordActivity;
}) {
    const router = express.Router();

    // 전체팀 (페이지 열기 기록은 POST /visits로 옮겼다: O2, B-7)
    router.get('/teams', async (_req, res) => {
        res.json(await Team.find());
    });

    // 팀 추가 (PIN을 정하는 요청이라 확인하지 않는다. 새 PIN은 숫자 4자리)
    router.post('/teams', async (req, res) => {
        const data = validate(res, teamCreateBodySchema, req.body);
        if (!data) return;
        // 자동 삭제 날짜는 오늘(한국) 이후만. 오늘이면 내일 새벽 정리 작업이 지운다 (B-9)
        if (data.due < kstDateString(new Date())) return sendInvalid(res, 'due', PAST_DUE);

        const newTeam = new Team({
            name: data.name,
            desc: data.desc,
            type: data.type,
            publishDate: data.publishDate,
            due: new Date(data.due),
            pin: await pins.forStorage(data.pin),
        });

        await newTeam.save();
        await activity(req, {
            action: 'team.create',
            target: { kind: 'team', id: newTeam.id, name: newTeam.name ?? undefined },
            after: teamFields(newTeam),
            result: 'ok',
        });
        res.status(201).json({ id: newTeam.id });
    });

    // 한 팀 (웹이 수정·삭제·합주 잡기 전에 "아직 있는지" 볼 때. PIN은 넣지 않는다)
    router.get('/teams/:id', async (req, res) => {
        const params = validate(res, idParamsSchema, req.params);
        if (!params) return;
        const team = await Team.findById(params.id);
        if (!team) return sendError(res, 'NOT_FOUND', TEAM_NOT_FOUND);
        res.json(team);
    });

    // PIN 확인 (웹의 PIN 칸이 4자리를 다 넣으면 바로 부른다). 틀린 횟수는 팀별로 (lib/pin-guard)
    router.post('/teams/:id/check-pin', async (req, res) => {
        const params = validate(res, idParamsSchema, req.params);
        if (!params) return;
        const body = validate(res, pinCheckBodySchema, req.body);
        if (!body) return;
        const teamId = params.id;
        const { pin } = body;

        const target = pinTarget.team(teamId);
        const entry = { action: 'pin.check', target: { kind: 'team', id: teamId } } as const;
        if (guard.rejectIfBlocked(req, res, target)) {
            await activity(req, { ...entry, result: 'blocked' });
            return;
        }

        if (await pins.isMaster(pin)) {
            guard.record(req, res, target, true);
            await activity(req, { ...entry, pin: 'master', result: 'ok' });
            return res.json(true);
        }

        const team = await Team.findById(teamId).select('+pin');
        if (!team) {
            // 마스터 PIN도 아니었으니 틀린 시도로 센다 (없는 팀 id로 마스터 PIN을 찾지 못하게)
            guard.record(req, res, target, false);
            await activity(req, { ...entry, result: 'not-found' });
            return sendError(res, 'NOT_FOUND', TEAM_NOT_FOUND);
        }

        const via = await pins.which(pin, team.pin);
        guard.record(req, res, target, via !== null);
        await activity(req, {
            action: 'pin.check',
            target: { kind: 'team', id: team.id, name: team.name ?? undefined },
            ...(via && { pin: via }),
            result: via ? 'ok' : 'wrong-pin',
        });
        res.json(via !== null);
    });

    // 팀 삭제 (그 팀의 합주도 함께) → 204
    router.delete('/teams/:id', async (req, res) => {
        // id 형식이 아니면 400 (조건 없이 찾거나 지우지 않게, B-8)
        const params = validate(res, idParamsSchema, req.params);
        if (!params) return;
        const teamId = params.id;

        // PIN을 확인하려면 팀을 먼저 읽어야 한다 (B-5 O5의 "조회 한 번"은 PIN 확인 때문에 두 번으로)
        const team = await Team.findById(teamId).select('+pin');
        if (!team) return sendError(res, 'NOT_FOUND', TEAM_NOT_FOUND);

        const target = { kind: 'team', id: teamId, name: team.name ?? undefined };
        const via = await pinCheck.require(req, res, {
            guardTarget: pinTarget.team(teamId),
            stored: team.pin,
            entry: { action: 'team.delete', target },
        });
        if (!via) return;

        // 팀을 먼저 지운다: 합주 삭제가 실패해도 팀만 남는 일은 없다. 지운 합주도 기록에 남긴다
        await Team.findByIdAndDelete(teamId);
        const ensembles = await Ensemble.find({ teamId });
        await Ensemble.deleteMany({ teamId });
        await activity(req, {
            action: 'team.delete',
            target,
            before: { ...withoutPin(team), ensembles: ensembles.map((e) => withoutPin(e)) },
            pin: via,
            result: 'ok',
        });
        res.status(204).end();
    });

    // 팀 수정 (그 팀 합주의 teamName도 함께). 모든 칸을 받는다 (B-8 전: 빠진 필드는 지워졌다). PIN은 바꾸지 않는다
    router.put('/teams/:id', async (req, res) => {
        const params = validate(res, idParamsSchema, req.params);
        if (!params) return;
        const teamId = params.id;
        const existingTeam = await Team.findById(teamId).select('+pin');
        if (!existingTeam) return sendError(res, 'NOT_FOUND', TEAM_NOT_FOUND);

        // 팀이 있는지 먼저 본 뒤 본문을 검사한다 (없는 팀이면 본문과 관계없이 404: 웹의 "이미 삭제된 팀")
        const body = validate(res, teamUpdateBodySchema, req.body);
        if (!body) return;
        // 지난 날짜는 거절. 단, 지금 저장된 날짜 그대로면 받는다 (정리 작업 전에 다른 칸만 고치는 경우)
        if (body.due < kstDateString(new Date()) && body.due !== dueString(existingTeam.due)) {
            return sendInvalid(res, 'due', PAST_DUE);
        }

        const target = { kind: 'team', id: existingTeam.id, name: existingTeam.name ?? undefined };
        const via = await pinCheck.require(req, res, {
            guardTarget: pinTarget.team(teamId),
            stored: existingTeam.pin,
            entry: { action: 'team.update', target },
        });
        if (!via) return;

        const before = teamFields(existingTeam);
        existingTeam.name = body.name;
        existingTeam.desc = body.desc;
        existingTeam.type = body.type;
        existingTeam.due = new Date(body.due);

        await existingTeam.save();
        await Ensemble.updateMany({ teamId }, { $set: { teamName: body.name } });
        await activity(req, {
            action: 'team.update',
            target,
            before,
            after: teamFields(existingTeam),
            pin: via,
            result: 'ok',
        });
        res.json({ id: teamId });
    });

    return router;
}
