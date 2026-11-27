// 방문자 쿠키 (활동 추적용). 요청마다 req.visitorId를 정한다
import crypto from 'node:crypto';

const VISITOR_COOKIE = 'semachi_vid';
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1년 (초)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseCookies(header) {
    const cookies = {};
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

export function visitor(req, res, next) {
    if (req.method === 'OPTIONS') return next();

    let visitorId = parseCookies(req.headers.cookie)[VISITOR_COOKIE];

    // 없거나 형식이 이상한 값(로그 조작 시도 등)이면 새로 발급
    if (!visitorId || !UUID_RE.test(visitorId)) {
        visitorId = crypto.randomUUID();
    }

    // 요청마다 만료 기간을 연장한다
    res.setHeader(
        'Set-Cookie',
        `${VISITOR_COOKIE}=${visitorId}; Max-Age=${VISITOR_COOKIE_MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=None`,
    );

    req.visitorId = visitorId;
    next();
}
