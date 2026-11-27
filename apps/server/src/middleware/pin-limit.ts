// PIN 시도 횟수 제한 (B-5 S2, B-6에서 변경 API까지). 4자리 PIN은 1만 개라, 제한이 없으면 프로그램으로 금방 찾는다
// - 틀린 시도만 센다. 라우트가 markPin(req, res, 맞음?)으로 알린다 (맞으면 세지 않음)
// - 같은 IP에서 같은 대상(팀·날적이·합주)에 15분 동안 10번, 같은 IP의 모든 PIN 합쳐 30번 틀리면 15분까지 429
//   대상별로 세는 이유: 학교 와이파이처럼 여럿이 IP 하나를 쓰면, IP 하나로만 세면 서로 막힌다
//   IP 전체로도 세는 이유: 마스터 PIN은 어느 대상에서든 통과하므로, 대상을 바꿔 가며 찾는 것을 막는다
//   같은 대상은 확인 API와 변경 API가 함께 센다 (예: check-team-pin과 PUT /team은 둘 다 "team:<id>")
// - 틀리면 응답 헤더 Pin-Attempts: "틀린 횟수/한도" (둘 중 더 빠듯한 쪽). 웹이 "(7/10)"으로 보여준다
// - 방문자 쿠키는 기준으로 쓰지 않는다 (지우고 보내면 그만이라)
// - 프록시(Caddy) 뒤에서는 req.ip가 진짜 사용자 IP가 되도록 TRUST_PROXY를 정해야 한다 (B-11)
import type { Request, RequestHandler, Response } from 'express';
import { ipKeyGenerator, rateLimit, type Options, type RateLimitInfo } from 'express-rate-limit';

export interface PinLimitOptions {
    /** 세는 기간 (ms, 기본 15분) */
    windowMs?: number;
    /** 같은 IP·같은 대상에서 틀려도 되는 횟수 (기본 10) */
    perTarget?: number;
    /** 같은 IP의 모든 PIN 확인에서 틀려도 되는 횟수 (기본 30) */
    perIp?: number;
}

export const PIN_LIMIT_ERROR = { error: 'Too many PIN attempts' };
/** 틀린 횟수를 알려 주는 응답 헤더 */
export const PIN_ATTEMPTS_HEADER = 'Pin-Attempts';

// 두 제한의 현재 상태를 req에 이 이름으로 둔다 (express-rate-limit의 requestPropertyName)
const IP_INFO = 'pinLimitIp';
const TARGET_INFO = 'pinLimitTarget';

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
        requestPropertyName: IP_INFO,
        keyGenerator: (req) => ipOf(req.ip),
    });
    // 대상별 제한은 하나: 라우트마다 정한 대상 이름(res.locals.pinTarget)으로 센다
    const byTarget = rateLimit({
        ...common,
        limit: perTarget,
        requestPropertyName: TARGET_INFO,
        keyGenerator: (req, res) => `${ipOf(req.ip)}:${String(res.locals.pinTarget)}`,
    });

    /** PIN을 받는 라우트 앞에 둘 미들웨어. target: 대상 이름 (예: req => `team:${req.body.teamId}`). 없으면 IP로만 */
    return function pinLimit(target?: (req: Request) => string): RequestHandler[] {
        if (!target) return [byIp];
        const setTarget: RequestHandler = (req, res, next) => {
            res.locals.pinTarget = target(req);
            next();
        };
        return [byIp, setTarget, byTarget];
    };
}

export type PinLimit = ReturnType<typeof createPinLimiters>;

/** 라우트가 PIN 결과를 알린다. 맞으면 세지 않고, 틀리면 몇 번째인지 헤더로 */
export function markPin(req: Request, res: Response, ok: boolean) {
    res.locals.pinOk = ok;
    if (ok) return;
    const infos = [TARGET_INFO, IP_INFO]
        .map((key) => (req as unknown as Record<string, RateLimitInfo | undefined>)[key])
        .filter((info): info is RateLimitInfo => info !== undefined);
    const tightest = infos.sort((a, b) => a.limit - a.used - (b.limit - b.used))[0];
    if (tightest) res.setHeader(PIN_ATTEMPTS_HEADER, `${tightest.used}/${tightest.limit}`);
}
