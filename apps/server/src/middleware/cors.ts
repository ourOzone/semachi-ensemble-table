import type { RequestHandler } from 'express';

/**
 * CORS: 다른 주소의 웹이 이 서버를 부를 수 있게 허락하는 헤더.
 * 허락한 주소(allowedOrigins)에서 온 요청에만 답한다. 운영·베타는 웹과 API가 같은 주소라 필요 없고(사전 결정 5),
 * 개발(localhost:3000 → localhost:8081)이나 옮기는 동안의 옛 주소(semachi.net → :8081)에만 쓴다.
 * api.js는 어떤 주소든 쿠키와 함께 허락했다 (S3, B-5에서 바꿈)
 */
export function cors(allowedOrigins: readonly string[]): RequestHandler {
    const allowed = new Set(allowedOrigins);
    return (req, res, next) => {
        const origin = req.headers.origin;
        if (origin) {
            // 주소마다 답이 다르므로, 중간 캐시가 다른 주소의 답을 돌려주지 않게
            res.header('Vary', 'Origin');
            if (allowed.has(origin)) {
                // 쿠키가 브라우저에 저장되려면 Allow-Origin이 '*'이면 안 되므로 그 주소를 그대로 돌려준다
                res.header('Access-Control-Allow-Origin', origin);
                res.header('Access-Control-Allow-Credentials', 'true');
            }
        }
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        // 웹이 읽는 응답 헤더: PIN 틀린 횟수, 다시 해도 되는 때 (다른 주소에서 부를 때 브라우저는 이 목록만 보여준다)
        res.header('Access-Control-Expose-Headers', 'Pin-Attempts, Retry-After');
        next();
    };
}
