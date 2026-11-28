// 공지 API (B-10 A2: 복수형 경로 + 주소 안의 id)
//   GET    /notices             목록 (최근 것부터)
//   POST   /notices             올리기 (마스터 PIN) → 201 { id }
//   GET    /notices/:id         한 공지 (없으면 404. 이전의 "있는지 확인" GET /notice/:id → true를 대신한다)
//   DELETE /notices/:id         삭제 (마스터 PIN) → 204
//   POST   /notices/check-pin   마스터 PIN 확인 { pin } → true/false
// (이전: POST /notice, DELETE /notice?id=, GET /notice/:id, POST /check-notice-pin)
// 올리기·삭제는 요청 본문의 pin(마스터 PIN)을 서버가 확인한다. 틀리면 403 (B-6 B1)
// 틀린 횟수는 "마스터" 하나로 센다 (관리자 화면과 같이). 하는 일마다 활동 기록 (B-7)
// 본문·id는 packages/shared의 스키마로 먼저 검사한다. 틀리면 400 (B-8 S5)
// 오류는 { error: { code, message } } (lib/errors). 처리 중 던져진 오류는 middleware/errors가 500으로 (B-10 A1)
import { idParamsSchema, noticeCreateBodySchema, pinCheckBodySchema } from '@semachi/shared';
import express from 'express';
import { preview, type RecordActivity } from '../lib/activity.ts';
import { sendError } from '../lib/errors.ts';
import type { PinAuth } from '../lib/pin-auth.ts';
import type { PinCheck } from '../lib/pin-check.ts';
import { pinTarget, type PinGuard } from '../lib/pin-guard.ts';
import { validate } from '../lib/validate.ts';
import { Notice } from '../models/notice.ts';

const NOTICE_NOT_FOUND = { message: '공지가 없습니다' };

export function noticesRouter({
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

    // 목록 (최근 것부터)
    router.get('/notices', async (_req, res) => {
        res.json((await Notice.find()).reverse());
    });

    // 올리기 (올린 시각은 서버의 지금)
    router.post('/notices', async (req, res) => {
        // 앞뒤 공백을 뺀 글이 비어 있으면 400 (B-8)
        const body = validate(res, noticeCreateBodySchema, req.body);
        if (!body) return;
        const { content } = body;

        const via = await pinCheck.require(req, res, {
            guardTarget: pinTarget.master,
            stored: null,
            entry: { action: 'notice.create', target: { kind: 'notice', name: preview(content) } },
        });
        if (!via) return;

        const newNotice = new Notice({ content, publishDate: new Date() });
        await newNotice.save();
        await activity(req, {
            action: 'notice.create',
            target: { kind: 'notice', id: newNotice.id, name: preview(content) },
            after: { content },
            pin: via,
            result: 'ok',
        });
        res.status(201).json({ id: newNotice.id });
    });

    // 마스터 PIN 대조 (/:id보다 먼저: "check-pin"을 id로 읽지 않게)
    router.post('/notices/check-pin', async (req, res) => {
        const body = validate(res, pinCheckBodySchema, req.body);
        if (!body) return;

        const entry = { action: 'pin.check', target: { kind: 'master' } } as const;
        if (guard.rejectIfBlocked(req, res, pinTarget.master)) {
            await activity(req, { ...entry, result: 'blocked' });
            return;
        }
        const ok = await pins.isMaster(body.pin);
        guard.record(req, res, pinTarget.master, ok);
        await activity(req, {
            ...entry,
            ...(ok && { pin: 'master' }),
            result: ok ? 'ok' : 'wrong-pin',
        });
        res.json(ok);
    });

    // 한 공지 (웹이 X를 누를 때 "아직 있는지" 볼 때)
    router.get('/notices/:id', async (req, res) => {
        const params = validate(res, idParamsSchema, req.params);
        if (!params) return;
        const notice = await Notice.findById(params.id);
        if (!notice) return sendError(res, 'NOT_FOUND', NOTICE_NOT_FOUND);
        res.json(notice);
    });

    // 삭제 → 204. 공지가 있는지 먼저 본다 (B-10: 다른 삭제와 같은 순서. 이전엔 PIN을 먼저 확인했다)
    router.delete('/notices/:id', async (req, res) => {
        const params = validate(res, idParamsSchema, req.params);
        if (!params) return;
        const notice = await Notice.findById(params.id);
        if (!notice) return sendError(res, 'NOT_FOUND', NOTICE_NOT_FOUND);

        const target = { kind: 'notice', id: notice.id, name: preview(notice.content) };
        const via = await pinCheck.require(req, res, {
            guardTarget: pinTarget.master,
            stored: null,
            entry: { action: 'notice.delete', target },
        });
        if (!via) return;

        await Notice.findByIdAndDelete(notice._id);
        await activity(req, {
            action: 'notice.delete',
            target,
            before: { content: notice.content },
            pin: via,
            result: 'ok',
        });
        res.status(204).end();
    });

    return router;
}
