// 방문자 쿠키 (활동 추적용). 요청마다 req.visitorId를 정한다
import crypto from 'node:crypto';
import type { RequestHandler } from 'express';

const VISITOR_COOKIE = 'semachi_vid';
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1년 (초)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseCookies(header: string | undefined) {
    const cookies: Record<string, string> = {};
    if (!header) return cookies;

    for (const part of header.split(';')) {
        const idx = part.indexOf('=');
        if (idx < 0) continue;
        const key = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        try {
            cookies[key] = decodeURIComponent(value);
        } catch {
            cookies[key] = value;
        }
    }
    return cookies;
}

export const visitor: RequestHandler = (req, res, next) => {
    if (req.method === 'OPTIONS') return next();

    let visitorId = parseCookies(req.headers.cookie)[VISITOR_COOKIE];

    // 없거나 형식이 이상한 값(로그 조작 시도 등)이면 새로 발급
    if (!visitorId || !UUID_RE.test(visitorId)) {
        visitorId = crypto.randomUUID();
    }

    // 요청마다 만료 기간을 연장한다. SameSite=Lax: 같은 사이트(semachi.net·그 하위 주소, localhost끼리)의 요청에만 보낸다
    // (api.js는 None: 다른 사이트에서 부를 때도 보냈다. 웹과 API가 같은 주소가 되므로 필요 없다, B-5)
    res.setHeader(
        'Set-Cookie',
        `${VISITOR_COOKIE}=${visitorId}; Max-Age=${VISITOR_COOKIE_MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Lax`,
    );

    req.visitorId = visitorId;
    next();
};
