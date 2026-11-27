// 공지 API: POST /notice, GET /notices, DELETE /notice, POST /check-notice-pin, GET /notice/:id
// 올리기·삭제는 요청 본문의 pin(마스터 PIN)을 서버가 확인한다. 틀리면 403 (B-6 B1)
// 틀린 횟수는 "마스터" 하나로 센다 (관리자 화면과 같이). 하는 일마다 활동 기록 (B-7)
import express from 'express';
import { preview, type RecordActivity } from '../lib/activity.ts';
import type { PinAuth } from '../lib/pin-auth.ts';
import type { PinCheck } from '../lib/pin-check.ts';
import { pinTarget, type PinGuard } from '../lib/pin-guard.ts';
import { Notice } from '../models/notice.ts';

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

    // 올리기 (올린 시각은 서버의 지금)
    router.post('/notice', async (req, res) => {
        try {
            const { content } = req.body;

            if (!content) {
                return res.status(400).json({ error: 'Content are required' });
            }

            const via = await pinCheck.require(req, res, {
                guardTarget: pinTarget.master,
                stored: null,
                entry: {
                    action: 'notice.create',
                    target: { kind: 'notice', name: preview(content) },
                },
            });
            if (!via) return;

            const publishDate = new Date();

            const newNotice = new Notice({ content, publishDate });
            await newNotice.save();
            await activity(req, {
                action: 'notice.create',
                target: { kind: 'notice', id: newNotice.id, name: preview(content) },
                after: { content },
                pin: via,
                result: 'ok',
            });

            res.status(201).json({ message: 'Notice created', id: newNotice._id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 목록 (최근 것부터)
    router.get('/notices', async (_req, res) => {
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

            const target = { kind: 'notice', id: String(id) };
            const via = await pinCheck.require(req, res, {
                guardTarget: pinTarget.master,
                stored: null,
                entry: { action: 'notice.delete', target },
            });
            if (!via) return;

            const deleted = await Notice.findByIdAndDelete(id);

            if (!deleted) {
                return res.status(404).json({ error: 'Notice not found' });
            }

            await activity(req, {
                action: 'notice.delete',
                target: { ...target, name: preview(deleted.content) },
                before: { content: deleted.content },
                pin: via,
                result: 'ok',
            });
            res.status(200).json({ message: 'Notice deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // 마스터 PIN 대조
    router.post('/check-notice-pin', async (req, res) => {
        try {
            const { pin } = req.body;

            if (!pin) {
                return res.status(400).json({ error: 'Pin is required' });
            }

            const entry = { action: 'pin.check', target: { kind: 'master' } } as const;
            if (guard.rejectIfBlocked(req, res, pinTarget.master)) {
                await activity(req, { ...entry, result: 'blocked' });
                return;
            }
            const ok = await pins.isMaster(pin);
            guard.record(req, res, pinTarget.master, ok);
            await activity(req, {
                ...entry,
                ...(ok && { pin: 'master' }),
                result: ok ? 'ok' : 'wrong-pin',
            });
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
