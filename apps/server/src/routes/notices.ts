// 공지 API: POST /notice, GET /notices, DELETE /notice, POST /check-notice-pin, GET /notice/:id
// 올리기·삭제는 요청 본문의 pin(마스터 PIN)을 서버가 확인한다. 틀리면 403 (B-6 B1)
// 마스터 PIN은 대상이 따로 없어 IP로만 센다
import express from 'express';
import { WRONG_PIN, type PinAuth } from '../lib/pin-auth.ts';
import { markPin, type PinLimit } from '../middleware/pin-limit.ts';
import { Notice } from '../models/notice.ts';

export function noticesRouter({ pins, pinLimit }: { pins: PinAuth; pinLimit: PinLimit }) {
    const router = express.Router();

    // 올리기 (올린 시각은 서버의 지금)
    router.post('/notice', ...pinLimit(), async (req, res) => {
        try {
            const { content, pin } = req.body;

            if (!content) {
                return res.status(400).json({ error: 'Content are required' });
            }

            const ok = await pins.isMaster(pin);
            markPin(req, res, ok);
            if (!ok) return res.status(403).json(WRONG_PIN);

            const publishDate = new Date();

            const newNotice = new Notice({ content, publishDate });
            await newNotice.save();

            res.status(201).json({ message: 'Notice created', id: newNotice._id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 목록 (최근 것부터)
    router.get('/notices', async (req, res) => {
        try {
            const notices = (await Notice.find()).reverse();

            res.status(200).json(notices);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 삭제
    router.delete('/notice', ...pinLimit(), async (req, res) => {
        try {
            const { id } = req.query;

            if (!id) {
                return res.status(400).json({ error: 'Notice ID is required' });
            }

            const ok = await pins.isMaster(req.body.pin);
            markPin(req, res, ok);
            if (!ok) return res.status(403).json(WRONG_PIN);

            const deleted = await Notice.findByIdAndDelete(id);

            if (!deleted) {
                return res.status(404).json({ error: 'Notice not found' });
            }

            res.status(200).json({ message: 'Notice deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 마스터 PIN 대조
    router.post('/check-notice-pin', ...pinLimit(), async (req, res) => {
        try {
            const { pin } = req.body;

            if (!pin) {
                return res.status(400).json({ error: 'Pin is required' });
            }

            const ok = await pins.isMaster(pin);
            markPin(req, res, ok);
            res.json(ok);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 존재 확인
    router.get('/notice/:id', async (req, res) => {
        const noticeId = req.params.id;

        try {
            const existingNotice = await Notice.findById(noticeId);

            if (existingNotice) {
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
