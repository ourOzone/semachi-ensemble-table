import axios from 'axios';
import { pinCheckResponseSchema } from '@/types';
import { postWithHeaders } from '.';

// PIN 확인 결과 (백엔드 개편 B-6). 서버는 맞음·틀림(boolean)과 함께, 틀리면 Pin-Attempts 헤더로 "틀린 횟수/한도"를 준다.
// 너무 많이 틀리면 429 + Retry-After(초) (B-5 S2: 같은 팀 15분에 10번, 같은 IP 전체 30번)

export interface PinAttempts {
    /** 지금까지 틀린 횟수 (이번 포함) */
    used: number;
    /** 이 횟수를 넘기면 잠시 막힌다 */
    limit: number;
}

export interface PinCheckResult {
    ok: boolean;
    /** 틀렸을 때만 (서버가 알려 줄 때) */
    attempts?: PinAttempts;
}

/** "7/10" → { used: 7, limit: 10 } */
export function parsePinAttempts(header: unknown): PinAttempts | undefined {
    if (typeof header !== 'string') return undefined;
    const match = /^(\d+)\/(\d+)$/.exec(header.trim());
    if (!match) return undefined;
    return { used: Number(match[1]), limit: Number(match[2]) };
}

/** 너무 많이 틀려 막힌 요청(429)이면 다시 해도 되기까지 남은 초, 아니면 null (헤더가 없으면 15분) */
export function pinBlockedSeconds(err: unknown): number | null {
    if (!axios.isAxiosError(err) || err.response?.status !== 429) return null;
    const seconds = Number(err.response.headers['retry-after']);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 15 * 60;
}

/** PIN 확인 API를 불러 맞음·틀림과 틀린 횟수를 돌려준다 */
export async function checkPin(endpoint: string, body: object): Promise<PinCheckResult> {
    const { data, headers } = await postWithHeaders<unknown>(endpoint, body);
    const ok = pinCheckResponseSchema.parse(data);
    return ok ? { ok } : { ok, attempts: parsePinAttempts(headers['pin-attempts']) };
}
