// 날적이 API: GET /notes, DELETE /note, POST /note, GET /note/:id, POST /check-note-pin
// 삭제는 요청 본문의 pin(글 PIN 또는 마스터 PIN)을 서버가 확인한다. 틀리면 403 (B-6 B1)
// 틀린 횟수는 날적이 전체를 하나로 센다 (글이 자주 생기고 지워져서, 사용자 결정)
// 목록에는 PIN을 넣지 않는다 (모델의 select: false, B-6 B3)
import express from 'express';
import type { Logger } from '../lib/log.ts';
import { WRONG_PIN, type PinAuth } from '../lib/pin-auth.ts';
import { pinTarget, type PinGuard } from '../lib/pin-guard.ts';
import { Note } from '../models/note.ts';

export function notesRouter({ log, pins, guard }: { log: Logger; pins: PinAuth; guard: PinGuard }) {
    const router = express.Router();

    // 목록 (최근 것부터)
    router.get('/notes', async (req, res) => {
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
        const noteId = req.query.id;

        // id가 없으면 바로 404 (조건 없이 찾거나 지우지 않게)
        if (noteId === undefined) {
            return res.status(404).json({ id: -1 });
        }

        try {
            const note = await Note.findById(noteId).select('+pin');

            if (!note) {
                return res.status(404).json({ id: -1 });
            }

            if (guard.rejectIfBlocked(req, res, pinTarget.note)) return;
            const ok = await pins.matches(req.body.pin, note.pin);
            guard.record(req, res, pinTarget.note, ok);
            if (!ok) return res.status(403).json(WRONG_PIN);

            await Note.findByIdAndDelete(noteId);
            log(req.visitorId, `deletenote_${note.text}`);
            res.json({ id: noteId });
        } catch {
            res.status(500).send('Internal Server Error');
        }
    });

    // 추가 (PIN을 정하는 요청이라 확인하지 않는다. 개수 제한은 2026-11-26에 사용자가 없앴다)
    router.post('/note', async (req, res) => {
        try {
            const data = req.body;
            log(req.visitorId, `addnote_${data.text}`);

            const newNote = new Note({
                text: data.text,
                pin: await pins.forStorage(data.pin),
            });

            await newNote.save();
            res.send({ id: newNote._id });
        } catch {
            res.status(500).send('Internal Server Error');
        }
    });

    // 존재 확인
    router.get('/note/:id', async (req, res) => {
        const noteId = req.params.id;

        try {
            const existingNote = await Note.findById(noteId);

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
            const { noteId, pin } = req.body;

            if (!noteId || !pin) {
                return res.status(400).json({ error: 'Both noteId and pin are required' });
            }

            if (guard.rejectIfBlocked(req, res, pinTarget.note)) return;

            if (await pins.isMaster(pin)) {
                guard.record(req, res, pinTarget.note, true);
                return res.json(true);
            }

            const note = await Note.findById(noteId).select('+pin');

            if (!note) {
                // 마스터 PIN도 아니었으니 틀린 시도로 센다
                guard.record(req, res, pinTarget.note, false);
                return res.status(404).json({ error: 'Note not found' });
            }

            const ok = await pins.matches(pin, note.pin);
            guard.record(req, res, pinTarget.note, ok);
            res.json(ok);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}
