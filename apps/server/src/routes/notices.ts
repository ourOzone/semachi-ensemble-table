// 공지 API: POST /notice, GET /notices, DELETE /notice, POST /check-notice-pin, GET /notice/:id
// 현재 동작: 올리기·삭제가 마스터 PIN을 확인하지 않는다 (B1, B-6)
import express from 'express';
import type { PinLimit } from '../middleware/pin-limit.ts';
import { Notice } from '../models/notice.ts';

export function noticesRouter({ masterPin, pinLimit }: { masterPin: string; pinLimit: PinLimit }) {
    const router = express.Router();

    // 올리기 (올린 시각은 서버의 지금)
    router.post('/notice', async (req, res) => {
        try {
            const { content } = req.body;

            if (!content) {
                return res.status(400).json({ error: 'Content are required' });
            }

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
    router.delete('/notice', async (req, res) => {
        try {
            const { id } = req.query;

            if (!id) {
                return res.status(400).json({ error: 'Notice ID is required' });
            }

            const notice = await Notice.findById(id);

            if (!notice) {
                return res.status(404).json({ error: 'Notice not found' });
            }

            await Notice.deleteOne({ _id: id });

            res.status(200).json({ message: 'Notice deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 마스터 PIN 대조
    // 대상이 없어 IP로만 센다
    router.post('/check-notice-pin', ...pinLimit(), async (req, res) => {
        try {
            const { pin } = req.body;

            if (!pin) {
                return res.status(400).json({ error: 'Pin is required' });
            }

            res.locals.pinOk = pin === masterPin;
            res.json(res.locals.pinOk);
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
