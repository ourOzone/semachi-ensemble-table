// 날적이 API: GET /notes, DELETE /note, POST /note, GET /note/:id, POST /check-note-pin
// 현재 동작: 삭제가 PIN을 확인하지 않는다 (B1, B-6). 응답에 PIN이 들어 있다 (B3)
import express from 'express';
import type { Logger } from '../lib/log.ts';
import { Note } from '../models/note.ts';

export function notesRouter({ log, masterPin }: { log: Logger; masterPin: string }) {
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

        try {
            const existingNote = await Note.findById(noteId);

            if (!existingNote) {
                return res.status(404).json({ id: -1 });
            }

            log(req.visitorId, `deletenote_${existingNote.text}`);

            const deletedNote = await Note.findByIdAndDelete(noteId);

            if (deletedNote) {
                res.json({ id: noteId });
            } else {
                res.status(500).send('Internal Server Error');
            }
        } catch {
            res.status(500).send('Internal Server Error');
        }
    });

    // 추가 (개수 제한은 2026-11-26에 사용자가 없앴다)
    router.post('/note', async (req, res) => {
        try {
            const data = req.body;
            log(req.visitorId, `addnote_${data.text}`);

            const newNote = new Note({
                text: data.text,
                pin: data.pin,
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

            if (pin === masterPin) {
                return res.json(true);
            }

            const note = await Note.findById(noteId);

            if (!note) {
                return res.status(404).json({ error: 'Note not found' });
            }

            res.json(note.pin === pin);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}
