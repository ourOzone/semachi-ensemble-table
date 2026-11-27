// 관리자 API (B-6~): 지금은 마스터 PIN 바꾸기. 관리자 화면은 B-7
// PUT /admin/master-pin { currentPin, newPin }: 지금 마스터 PIN이 맞아야 바꾼다 (틀린 횟수는 "마스터"로)
// 바꾼 PIN은 DB(settings)에 해시로 남고, 같은 DB를 쓰는 새 서버(운영·베타)는 바로 따른다.
// 옛 서버(api.js)는 계속 .env의 MASTER_PIN을 쓴다 (운영 전환 B-14 전까지)
import express from 'express';
import type { Logger } from '../lib/log.ts';
import { MASTER_PIN_FORMAT, WRONG_PIN, type PinAuth } from '../lib/pin-auth.ts';
import { pinTarget, type PinGuard } from '../lib/pin-guard.ts';

export function adminRouter({ log, pins, guard }: { log: Logger; pins: PinAuth; guard: PinGuard }) {
    const router = express.Router();

    router.put('/admin/master-pin', async (req, res) => {
        try {
            const { currentPin, newPin } = req.body;

            if (typeof newPin !== 'string' || !MASTER_PIN_FORMAT.test(newPin)) {
                return res.status(400).json({ error: 'newPin must be 4 digits' });
            }

            if (guard.rejectIfBlocked(req, res, pinTarget.master)) return;
            const ok = await pins.isMaster(currentPin);
            guard.record(req, res, pinTarget.master, ok);
            if (!ok) return res.status(403).json(WRONG_PIN);

            await pins.changeMaster(newPin);
            log(req.visitorId, 'changemasterpin');
            res.json({ message: 'Master PIN changed' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}
