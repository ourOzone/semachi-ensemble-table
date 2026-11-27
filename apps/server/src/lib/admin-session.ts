// 관리자 로그인 상태 (B-7). 마스터 PIN으로 로그인하면 서명한 쿠키를 준다 (사용자 결정: 관리자 화면은 마스터 PIN으로)
// - 쿠키 값: "만료 시각.서명". 서명 = HMAC(서버만 아는 비밀, 만료 시각). 값을 고치면 서명이 맞지 않아 거절된다
// - 비밀은 서버를 켤 때마다 새로 만든다 → 서버를 다시 켜면 다시 로그인 (따로 보관할 비밀값이 없다)
// - 쿠키는 자바스크립트로 읽을 수 없고(HttpOnly), HTTPS에서만(Secure), 같은 사이트 요청에만(SameSite=Strict)
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { parseCookies } from '../middleware/visitor.ts';

export const ADMIN_COOKIE = 'semachi_admin';

export interface AdminSessions {
    /** 로그인: 쿠키를 심는다 */
    issue(res: Response): void;
    /** 로그인한 요청인지 */
    isAdmin(req: Request): boolean;
    /** 로그아웃: 쿠키를 지운다 */
    clear(res: Response): void;
}

export function createAdminSessions({ hours = 12 }: { hours?: number } = {}): AdminSessions {
    const secret = randomBytes(32);
    const sign = (value: string) => createHmac('sha256', secret).update(value).digest('base64url');
    const cookie = (value: string, maxAge: number) =>
        `${ADMIN_COOKIE}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;

    return {
        issue(res) {
            const expires = String(Date.now() + hours * 60 * 60 * 1000);
            res.append('Set-Cookie', cookie(`${expires}.${sign(expires)}`, hours * 60 * 60));
        },
        isAdmin(req) {
            const value = parseCookies(req.headers.cookie)[ADMIN_COOKIE];
            const [expires, signature] = value?.split('.') ?? [];
            if (!expires || !signature || Number(expires) < Date.now()) return false;
            const expected = Buffer.from(sign(expires));
            const actual = Buffer.from(signature);
            return expected.length === actual.length && timingSafeEqual(expected, actual);
        },
        clear(res) {
            res.append('Set-Cookie', cookie('', 0));
        },
    };
}
