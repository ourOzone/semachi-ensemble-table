// PIN 확인 시도 횟수 제한 (B-5 S2). 4자리 PIN은 1만 개라, 제한이 없으면 프로그램으로 금방 찾는다
// - 틀린 시도만 센다 (맞으면 세지 않음). 라우트가 맞았을 때 res.locals.pinOk = true
// - 같은 IP에서 같은 대상(팀·날적이)에 15분 동안 10번, 같은 IP의 모든 PIN 확인 합쳐 30번 틀리면 15분까지 429
//   대상별로 세는 이유: 학교 와이파이처럼 여럿이 IP 하나를 쓰면, IP 하나로만 세면 서로 막힌다
//   IP 전체로도 세는 이유: 마스터 PIN은 어느 대상에서든 통과하므로, 대상을 바꿔 가며 찾는 것을 막는다
// - 방문자 쿠키는 기준으로 쓰지 않는다 (지우고 보내면 그만이라)
// - 프록시(Caddy) 뒤에서는 req.ip가 진짜 사용자 IP가 되도록 TRUST_PROXY를 정해야 한다 (B-11)
import type { RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';

export interface PinLimitOptions {
    /** 세는 기간 (ms, 기본 15분) */
    windowMs?: number;
    /** 같은 IP·같은 대상에서 틀려도 되는 횟수 (기본 10) */
    perTarget?: number;
    /** 같은 IP의 모든 PIN 확인에서 틀려도 되는 횟수 (기본 30) */
    perIp?: number;
}

export const PIN_LIMIT_ERROR = { error: 'Too many PIN attempts' };

const ipOf = (ip: string | undefined) => ipKeyGenerator(ip ?? 'unknown');

export function createPinLimiters({
    windowMs = 15 * 60 * 1000,
    perTarget = 10,
    perIp = 30,
}: PinLimitOptions = {}) {
    const common: Partial<Options> = {
        windowMs,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        requestWasSuccessful: (_req, res) => res.locals.pinOk === true,
        handler: (_req, res) => {
            res.status(429).json(PIN_LIMIT_ERROR);
        },
    };
    const byIp = rateLimit({
        ...common,
        limit: perIp,
        keyGenerator: (req) => ipOf(req.ip),
    });

    /** PIN 확인 라우트 앞에 둘 미들웨어. targetField: 요청 본문에서 대상 id가 든 필드 (없으면 IP로만) */
    return function pinLimit(targetField?: string): RequestHandler[] {
        if (!targetField) return [byIp];
        const byTarget = rateLimit({
            ...common,
            limit: perTarget,
            keyGenerator: (req) => `${ipOf(req.ip)}:${String(req.body?.[targetField] ?? '')}`,
        });
        return [byIp, byTarget];
    };
}

export type PinLimit = ReturnType<typeof createPinLimiters>;
