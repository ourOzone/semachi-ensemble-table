// 합주 API (B-10 A2: 복수형 경로 + 주소 안의 id)
//   GET    /ensembles       목록 (지난 것 빼고)
//   POST   /ensembles       잡기 (그 팀 PIN) → 201 { id }
//   GET    /ensembles/:id   한 합주 (없으면 404. 이전의 "있는지 확인" GET /ensemble/:id → true를 대신한다)
//   PUT    /ensembles/:id   수정 (미루기·바로 하기·반복으로 바꾸기도) → 200 { id }
//   DELETE /ensembles/:id   삭제 → 204
// (이전: POST /ensemble, PUT·DELETE /ensemble?id=, GET /ensemble/:id)
// 잡기·수정·삭제는 요청 본문의 pin(그 합주 팀의 PIN 또는 마스터 PIN)을 서버가 확인한다. 틀리면 403 (B-6)
// 틀린 횟수는 그 팀의 것으로 센다 (팀 PIN이므로). 하는 일마다 활동 기록 (B-7)
// teamName·day는 서버가 채운다: teamName = 그 팀의 이름, day = nextDate의 한국 요일 (B-8 D3). type은 없다 (B-8, 사용자 결정)
// 본문·id는 packages/shared의 스키마로 먼저 검사한다 (시간칸 0~29, 시작 ≤ 끝, 날짜 형식 등). 틀리면 400 (B-8 S5)
// 오류는 { error: { code, message } } (lib/errors). 처리 중 던져진 오류는 middleware/errors가 500으로 (B-10 A1)
import {
    ensembleCreateBodySchema,
    ensembleUpdateBodySchema,
    idParamsSchema,
} from '@semachi/shared';
import express from 'express';
import mongoose from 'mongoose';
import { withoutPin, type RecordActivity } from '../lib/activity.ts';
import { sendError } from '../lib/errors.ts';
import type { PinCheck } from '../lib/pin-check.ts';
import { pinTarget } from '../lib/pin-guard.ts';
import { kstDayIndex, startOfKstDay } from '../lib/time.ts';
import { validate } from '../lib/validate.ts';
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

const ENSEMBLE_NOT_FOUND = { message: '합주가 없습니다' };

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
    });

    // 합주 잡기 (B-6 뒤 사용자 결정: 잡을 때도 그 팀의 PIN)
    // 팀이 없으면 404 (B-8 B4, 이전: 마스터 PIN이면 없는 팀의 합주도 만들었다). 소모임·회의도 teams 컬렉션의 팀이다
    router.post('/ensembles', async (req, res) => {
        const data = validate(res, ensembleCreateBodySchema, req.body);
        if (!data) return;
        const team = await Team.findById(data.teamId).select('+pin');
        if (!team) {
            await activity(req, {
                action: 'ensemble.create',
                target: { kind: 'team', id: data.teamId },
                result: 'not-found',
            });
            return sendError(res, 'NOT_FOUND', { message: '팀이 없습니다' });
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
            due: new Date(data.due), // 'YYYY-MM-DD' → 그날 UTC 0시 (이전에 Mongoose가 바꾸던 것과 같음)
            nextDate: new Date(data.nextDate),
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
        res.status(201).json({ id: newEnsemble.id });
    });

    // 한 합주 (웹이 미루기 등을 누를 때 "아직 있는지" 볼 때)
    router.get('/ensembles/:id', async (req, res) => {
        const params = validate(res, idParamsSchema, req.params);
        if (!params) return;
        const ensemble = await Ensemble.findById(params.id);
        if (!ensemble) return sendError(res, 'NOT_FOUND', ENSEMBLE_NOT_FOUND);
        res.json(ensemble);
    });

    // 합주 삭제 → 204
    router.delete('/ensembles/:id', async (req, res) => {
        // id 형식이 아니면 400 (조건 없이 찾거나 지우지 않게, B-8)
        const params = validate(res, idParamsSchema, req.params);
        if (!params) return;
        const ensembleId = params.id;

        const existingEnsemble = await Ensemble.findById(ensembleId);
        if (!existingEnsemble) return sendError(res, 'NOT_FOUND', ENSEMBLE_NOT_FOUND);

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
        res.status(204).end();
    });

    // 합주 수정 (미루기·바로 하기·반복으로 바꾸기도 이 요청). 팀은 바꾸지 않는다 (B-8: 웹도 팀을 바꿀 수 없다)
    // 모든 칸을 받는다 (B-8 전: 본문에 빠진 필드는 지워졌다)
    router.put('/ensembles/:id', async (req, res) => {
        const params = validate(res, idParamsSchema, req.params);
        if (!params) return;
        const existingEnsemble = await Ensemble.findById(params.id);
        if (!existingEnsemble) return sendError(res, 'NOT_FOUND', ENSEMBLE_NOT_FOUND);

        // 합주가 있는지 먼저 본 뒤 본문을 검사한다 (없는 합주면 본문과 관계없이 404: 웹의 "이미 삭제된 합주")
        const body = validate(res, ensembleUpdateBodySchema, req.body);
        if (!body) return;

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
        existingEnsemble.startTime = body.startTime;
        existingEnsemble.endTime = body.endTime;
        existingEnsemble.day = kstDayIndex(new Date(body.nextDate));
        existingEnsemble.due = new Date(body.due);
        existingEnsemble.nextDate = new Date(body.nextDate);
        existingEnsemble.repeat = body.repeat;

        await existingEnsemble.save();
        await activity(req, {
            action: 'ensemble.update',
            target,
            before,
            after: ensembleFields(existingEnsemble.toObject()),
            pin: via,
            result: 'ok',
        });
        res.json({ id: existingEnsemble.id });
    });

    return router;
}
