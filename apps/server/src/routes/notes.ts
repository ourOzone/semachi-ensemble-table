// 날적이 API: GET /notes, DELETE /note, POST /note, GET /note/:id, POST /check-note-pin
// 삭제는 요청 본문의 pin(글 PIN 또는 마스터 PIN)을 서버가 확인한다. 틀리면 403 (B-6 B1)
// 틀린 횟수는 날적이 전체를 하나로 센다 (글이 자주 생기고 지워져서, 사용자 결정)
// 목록에는 PIN을 넣지 않는다 (모델의 select: false, B-6 B3). 하는 일마다 활동 기록 (B-7)
// 본문·id는 packages/shared의 스키마로 먼저 검사한다 (글 1 ~ 200자, 새 PIN 숫자 4자리 등). 틀리면 400 (B-8 S5)
import {
    checkNotePinBodySchema,
    idParamsSchema,
    idQuerySchema,
    noteCreateBodySchema,
} from '@semachi/shared';
import express from 'express';
import { preview, type RecordActivity } from '../lib/activity.ts';
import type { PinAuth } from '../lib/pin-auth.ts';
import type { PinCheck } from '../lib/pin-check.ts';
import { pinTarget, type PinGuard } from '../lib/pin-guard.ts';
import { validate } from '../lib/validate.ts';
import { Note } from '../models/note.ts';

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
        try {
            const notes = await Note.find();
            res.json(notes.reverse());
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    });

    // 삭제
    router.delete('/note', async (req, res) => {
        // id가 없거나 형식이 아니면 400 (조건 없이 찾거나 지우지 않게, B-8. 이전: 없으면 404, 형식이 틀리면 500)
        const query = validate(res, idQuerySchema, req.query);
        if (!query) return;
        const noteId = query.id;

        try {
            const note = await Note.findById(noteId).select('+pin');

            if (!note) {
                return res.status(404).json({ id: -1 });
            }

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
            res.json({ id: noteId });
        } catch {
            res.status(500).send('Internal Server Error');
        }
    });

    // 추가 (PIN을 정하는 요청이라 확인하지 않는다. 개수 제한은 2026-11-26에 사용자가 없앴다)
    router.post('/note', async (req, res) => {
        try {
            const data = validate(res, noteCreateBodySchema, req.body);
            if (!data) return;

            const newNote = new Note({
                text: data.text,
                pin: await pins.forStorage(data.pin),
            });

            await newNote.save();
            await activity(req, {
                action: 'note.create',
                target: { kind: 'note', id: newNote.id, name: preview(newNote.text) },
                after: { text: newNote.text },
                result: 'ok',
            });
            res.send({ id: newNote._id });
        } catch {
            res.status(500).send('Internal Server Error');
        }
    });

    // 존재 확인
    router.get('/note/:id', async (req, res) => {
        // id 형식이 아니면 400 (B-8. 이전: 500)
        const params = validate(res, idParamsSchema, req.params);
        if (!params) return;

        try {
            const existingNote = await Note.findById(params.id);

            if (existingNote) {
                res.json(true);
            } else {
                res.status(404).json(false);
            }
        } catch {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // PIN 대조
    router.post('/check-note-pin', async (req, res) => {
        try {
            const body = validate(res, checkNotePinBodySchema, req.body);
            if (!body) return;
            const { noteId, pin } = body;

            const entry = {
                action: 'pin.check',
                target: { kind: 'note', id: noteId },
            } as const;
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
                return res.status(404).json({ error: 'Note not found' });
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
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}
