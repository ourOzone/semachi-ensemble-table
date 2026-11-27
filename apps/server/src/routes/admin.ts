// 관리자 API (B-6~): 지금은 마스터 PIN 바꾸기. 관리자 화면은 B-7
// PUT /admin/master-pin { currentPin, newPin }: 지금 마스터 PIN이 맞아야 바꾼다 (틀린 시도는 IP로 센다)
// 바꾼 PIN은 DB(settings)에 해시로 남고, 같은 DB를 쓰는 새 서버(운영·베타)는 바로 따른다.
// 옛 서버(api.js)는 계속 .env의 MASTER_PIN을 쓴다 (운영 전환 B-14 전까지)
import express from 'express';
import type { Logger } from '../lib/log.ts';
import { MASTER_PIN_FORMAT, WRONG_PIN, type PinAuth } from '../lib/pin-auth.ts';
import { markPin, type PinLimit } from '../middleware/pin-limit.ts';

export function adminRouter({
    log,
    pins,
    pinLimit,
}: {
    log: Logger;
    pins: PinAuth;
    pinLimit: PinLimit;
}) {
    const router = express.Router();

    router.put('/admin/master-pin', ...pinLimit(), async (req, res) => {
        try {
            const { currentPin, newPin } = req.body;

            if (typeof newPin !== 'string' || !MASTER_PIN_FORMAT.test(newPin)) {
                return res.status(400).json({ error: 'newPin must be 4 digits' });
            }

            const ok = await pins.isMaster(currentPin);
            markPin(req, res, ok);
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
