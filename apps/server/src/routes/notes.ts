// 날적이 API (B-10 A2: 복수형 경로 + 주소 안의 id)
//   GET    /notes                 목록 (최근 것부터)
//   POST   /notes                 남기기 → 201 { id }
//   GET    /notes/:id             한 글 (없으면 404. 이전의 "있는지 확인" GET /note/:id → true를 대신한다)
//   DELETE /notes/:id             삭제 (글 PIN) → 204
//   POST   /notes/:id/check-pin   PIN 확인 { pin } → true/false
// (이전: POST /note, DELETE /note?id=, GET /note/:id, POST /check-note-pin { noteId, pin })
// 삭제는 요청 본문의 pin(글 PIN 또는 마스터 PIN)을 서버가 확인한다. 틀리면 403 (B-6 B1)
// 틀린 횟수는 날적이 전체를 하나로 센다 (글이 자주 생기고 지워져서, 사용자 결정)
// 목록에는 PIN을 넣지 않는다 (모델의 select: false, B-6 B3). 하는 일마다 활동 기록 (B-7)
// 본문·id는 packages/shared의 스키마로 먼저 검사한다 (글 1 ~ 200자, 새 PIN 숫자 4자리 등). 틀리면 400 (B-8 S5)
// 오류는 { error: { code, message } } (lib/errors). 처리 중 던져진 오류는 middleware/errors가 500으로 (B-10 A1)
import { idParamsSchema, noteCreateBodySchema, pinCheckBodySchema } from '@semachi/shared';
import express from 'express';
import { preview, type RecordActivity } from '../lib/activity.ts';
import { sendError } from '../lib/errors.ts';
import type { PinAuth } from '../lib/pin-auth.ts';
import type { PinCheck } from '../lib/pin-check.ts';
import { pinTarget, type PinGuard } from '../lib/pin-guard.ts';
import { validate } from '../lib/validate.ts';
import { Note } from '../models/note.ts';

const NOTE_NOT_FOUND = { message: '글이 없습니다' };

export function notesRouter({
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
    router.get('/notes', async (_req, res) => {
        res.json((await Note.find()).reverse());
    });

    // 남기기 (PIN을 정하는 요청이라 확인하지 않는다. 개수 제한은 2026-11-26에 사용자가 없앴다)
    router.post('/notes', async (req, res) => {
        const data = validate(res, noteCreateBodySchema, req.body);
        if (!data) return;

        const newNote = new Note({ text: data.text, pin: await pins.forStorage(data.pin) });
        await newNote.save();
        await activity(req, {
            action: 'note.create',
            target: { kind: 'note', id: newNote.id, name: preview(newNote.text) },
            after: { text: newNote.text },
            result: 'ok',
        });
        res.status(201).json({ id: newNote.id });
    });

    // 한 글 (웹이 X를 누를 때 "아직 있는지" 볼 때. PIN은 넣지 않는다)
    router.get('/notes/:id', async (req, res) => {
        const params = validate(res, idParamsSchema, req.params);
        if (!params) return;
        const note = await Note.findById(params.id);
        if (!note) return sendError(res, 'NOT_FOUND', NOTE_NOT_FOUND);
        res.json(note);
    });

    // 삭제 → 204
    router.delete('/notes/:id', async (req, res) => {
        // id 형식이 아니면 400 (조건 없이 찾거나 지우지 않게, B-8)
        const params = validate(res, idParamsSchema, req.params);
        if (!params) return;
        const noteId = params.id;

        const note = await Note.findById(noteId).select('+pin');
        if (!note) return sendError(res, 'NOT_FOUND', NOTE_NOT_FOUND);

        const target = { kind: 'note', id: note.id, name: preview(note.text) };
        const via = await pinCheck.require(req, res, {
            guardTarget: pinTarget.note,
            stored: note.pin,
            entry: { action: 'note.delete', target },
        });
        if (!via) return;

        await Note.findByIdAndDelete(noteId);
        await activity(req, {
            action: 'note.delete',
            target,
            before: { text: note.text },
            pin: via,
            result: 'ok',
        });
        res.status(204).end();
    });

    // PIN 대조
    router.post('/notes/:id/check-pin', async (req, res) => {
        const params = validate(res, idParamsSchema, req.params);
        if (!params) return;
        const body = validate(res, pinCheckBodySchema, req.body);
        if (!body) return;
        const noteId = params.id;
        const { pin } = body;

        const entry = { action: 'pin.check', target: { kind: 'note', id: noteId } } as const;
        if (guard.rejectIfBlocked(req, res, pinTarget.note)) {
            await activity(req, { ...entry, result: 'blocked' });
            return;
        }

        if (await pins.isMaster(pin)) {
            guard.record(req, res, pinTarget.note, true);
            await activity(req, { ...entry, pin: 'master', result: 'ok' });
            return res.json(true);
        }

        const note = await Note.findById(noteId).select('+pin');
        if (!note) {
            // 마스터 PIN도 아니었으니 틀린 시도로 센다
            guard.record(req, res, pinTarget.note, false);
            await activity(req, { ...entry, result: 'not-found' });
            return sendError(res, 'NOT_FOUND', NOTE_NOT_FOUND);
        }

        const via = await pins.which(pin, note.pin);
        guard.record(req, res, pinTarget.note, via !== null);
        await activity(req, {
            action: 'pin.check',
            target: { kind: 'note', id: note.id, name: preview(note.text) },
            ...(via && { pin: via }),
            result: via ? 'ok' : 'wrong-pin',
        });
        res.json(via !== null);
    });

    return router;
}
