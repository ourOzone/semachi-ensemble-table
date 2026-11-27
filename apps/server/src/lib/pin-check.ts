// 변경 API(수정·삭제·잡기·올리기)의 PIN 확인 한곳 (B-6·B-7): 막혔는지 → PIN 비교 → 틀린 횟수 → 활동 기록
// 맞으면 어떤 PIN(own·master)인지 돌려주고, 아니면 응답(429·403)을 보내고 null
import type { Request, Response } from 'express';
import type { PinKind } from '../models/activity.ts';
import type { ActivityEntry, RecordActivity } from './activity.ts';
import { WRONG_PIN, type PinAuth } from './pin-auth.ts';
import type { PinGuard } from './pin-guard.ts';

export interface PinCheck {
    /**
     * @param guardTarget 틀린 횟수를 셀 대상 (lib/pin-guard의 pinTarget)
     * @param stored 그 대상의 저장된 PIN. 없으면(마스터 PIN만 되는 곳, 팀이 없는 합주) null
     * @param entry 막히거나 틀렸을 때 남길 활동 기록 (결과는 여기서 채운다)
     */
    require(
        req: Request,
        res: Response,
        options: {
            /** 확인할 PIN (기본: 요청 본문의 pin) */
            pin?: unknown;
            guardTarget: string;
            stored: string | null | undefined;
            entry: Omit<ActivityEntry, 'result' | 'pin'>;
        },
    ): Promise<PinKind | null>;
}

export function createPinCheck({
    pins,
    guard,
    activity,
}: {
    pins: PinAuth;
    guard: PinGuard;
    activity: RecordActivity;
}): PinCheck {
    return {
        async require(req, res, { pin = req.body.pin, guardTarget, stored, entry }) {
            if (guard.rejectIfBlocked(req, res, guardTarget)) {
                await activity(req, { ...entry, result: 'blocked' });
                return null;
            }
            const via = await pins.which(pin, stored);
            guard.record(req, res, guardTarget, via !== null);
            if (!via) {
                await activity(req, { ...entry, result: 'wrong-pin' });
                res.status(403).json(WRONG_PIN);
                return null;
            }
            return via;
        },
    };
}
