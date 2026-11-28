// PIN 틀린 횟수 세기·막기 (B-5 S2 → B-6 뒤 사용자 결정으로 다시 짬). 4자리 PIN은 1만 개라, 막지 않으면 프로그램으로 금방 찾는다
//
// 두 가지를 센다 (둘 다 "틀린 시도"만, 같은 IP 기준, 처음 틀린 때부터 15분 동안):
// 1. 대상별 (10번): 팀(team:<id>, 그 팀 합주의 수정·삭제·잡기 포함), 날적이(note, 날적이 전체를 하나로), 마스터(master, 공지·관리자)
//    → 그 대상의 PIN을 맞추면 그 대상의 횟수만 0으로 (오타 몇 번 뒤 맞추면 다시 처음부터)
// 2. IP 전체 (30번): 모든 PIN 확인을 합쳐서. **맞춰도 0으로 돌리지 않는다**
//    → 마스터 PIN은 어느 팀 PIN 자리에서든 통과하므로, "내 팀에서 마스터 PIN 후보를 넣다가 내 팀 PIN으로 0으로 돌리기"를
//      되풀이해 끝없이 찾는 것을 막는다. 평범하게 쓰면 15분에 30번 틀릴 일이 없다
// 한도에 닿으면 그 15분이 끝날 때까지 맞는 PIN도 확인하지 않고 429 (Retry-After: 남은 초).
// 틀리면 응답 헤더 Pin-Attempts: "틀린 횟수/한도" (둘 중 더 빠듯한 쪽). 웹이 "(7/10)"으로 보여준다
//
// - 서버 메모리에 둔다 (서버를 다시 켜면 처음부터). 서버가 여러 대(운영·베타)면 각자 센다
// - 방문자 쿠키는 기준으로 쓰지 않는다 (지우고 보내면 그만이라)
// - 프록시(Caddy) 뒤에서는 req.ip가 진짜 사용자 IP가 되도록 TRUST_PROXY를 정해야 한다 (B-11)
import net from 'node:net';
import type { Request, Response } from 'express';
import { sendError } from './errors.ts';

export interface PinLimitOptions {
    /** 세는 기간 (ms, 기본 15분): 처음 틀린 때부터 */
    windowMs?: number;
    /** 같은 IP·같은 대상에서 틀려도 되는 횟수 (기본 10) */
    perTarget?: number;
    /** 같은 IP의 모든 PIN 확인에서 틀려도 되는 횟수 (기본 30) */
    perIp?: number;
}

/** 틀린 횟수를 알려 주는 응답 헤더 */
export const PIN_ATTEMPTS_HEADER = 'Pin-Attempts';

/** 세는 대상 이름 */
export const pinTarget = {
    team: (teamId: unknown) => `team:${String(teamId)}`,
    note: 'note',
    master: 'master',
} as const;

interface Counter {
    failures: number;
    /** 이 시각(ms)이 지나면 처음부터 */
    resetAt: number;
}

export interface PinGuard {
    /** 막혀 있으면 429를 보내고 true (라우트는 바로 끝낸다). PIN을 확인하기 전에 부른다 */
    rejectIfBlocked(req: Request, res: Response, target: string): boolean;
    /** PIN 결과를 남긴다. 맞으면 그 대상 횟수를 0으로, 틀리면 대상·IP 전체에 하나씩 더하고 헤더로 알린다 */
    record(req: Request, res: Response, target: string, ok: boolean): void;
}

/**
 * IP를 세는 단위로: IPv4는 그대로, IPv4를 담은 IPv6(::ffff:1.2.3.4)는 IPv4로,
 * IPv6는 앞 64비트(한 집·한 기기가 보통 이 단위를 통째로 받는다. 끝자리만 바꿔 가며 피하지 못하게)
 */
export function ipKey(ip: string | undefined): string {
    if (!ip) return 'unknown';
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
    if (mapped) return mapped[1]!;
    if (!net.isIPv6(ip)) return ip;
    const [head = '', tail = ''] = ip.split('::');
    const headParts = head ? head.split(':') : [];
    const tailParts = tail ? tail.split(':') : [];
    const missing = ip.includes('::') ? 8 - headParts.length - tailParts.length : 0;
    const groups = [...headParts, ...Array<string>(missing).fill('0'), ...tailParts];
    return `${groups
        .slice(0, 4)
        .map((g) => g.toLowerCase())
        .join(':')}::/64`;
}

export function createPinGuard({
    windowMs = 15 * 60 * 1000,
    perTarget = 10,
    perIp = 30,
}: PinLimitOptions = {}): PinGuard {
    const counters = new Map<string, Counter>();

    const current = (key: string, now: number) => {
        const counter = counters.get(key);
        if (!counter) return undefined;
        if (now >= counter.resetAt) {
            counters.delete(key);
            return undefined;
        }
        return counter;
    };

    const fail = (key: string, now: number) => {
        const counter = current(key, now) ?? { failures: 0, resetAt: now + windowMs };
        counter.failures++;
        counters.set(key, counter);
        return counter;
    };

    // 지난 기록을 주기적으로 지운다 (메모리가 계속 늘지 않게). 서버가 끝날 때 기다리지 않게 unref
    setInterval(() => {
        const now = Date.now();
        for (const [key, counter] of counters) if (now >= counter.resetAt) counters.delete(key);
    }, windowMs).unref();

    const keysOf = (req: Request, target: string) => {
        const ip = ipKey(req.ip);
        return { ip: `ip|${ip}`, target: `target|${ip}|${target}` };
    };

    return {
        rejectIfBlocked(req, res, target) {
            const now = Date.now();
            const keys = keysOf(req, target);
            const blocked = [
                { counter: current(keys.target, now), limit: perTarget },
                { counter: current(keys.ip, now), limit: perIp },
            ].filter(({ counter, limit }) => counter && counter.failures >= limit);
            if (blocked.length === 0) return false;

            const until = Math.max(...blocked.map(({ counter }) => counter!.resetAt));
            res.setHeader('Retry-After', String(Math.ceil((until - now) / 1000)));
            sendError(res, 'TOO_MANY_PIN_ATTEMPTS');
            return true;
        },

        record(req, res, target, ok) {
            const now = Date.now();
            const keys = keysOf(req, target);
            if (ok) {
                counters.delete(keys.target);
                return;
            }
            const targetCount = { ...fail(keys.target, now), limit: perTarget };
            const ipCount = { ...fail(keys.ip, now), limit: perIp };
            const tightest = [targetCount, ipCount].sort(
                (a, b) => a.limit - a.failures - (b.limit - b.failures),
            )[0]!;
            res.setHeader(PIN_ATTEMPTS_HEADER, `${tightest.failures}/${tightest.limit}`);
        },
    };
}
