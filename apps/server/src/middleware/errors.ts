// 맨 뒤에 붙는 두 처리 (B-10 A1). app.ts에서 모든 라우터 다음에 등록한다
// - notFound: 어떤 라우트도 답하지 않은 요청 → 404 JSON (이전: Express 기본 HTML "Cannot GET …")
// - errorHandler: 처리 중 던져진 오류 → JSON. Express 5는 async 핸들러가 던진 오류도 여기로 넘겨 준다.
//   그래서 라우트마다 try/catch로 500을 쓰던 것을 지우고 여기 한곳에서 답한다
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { sendError } from '../lib/errors.ts';

export const notFound: RequestHandler = (_req, res) => {
    sendError(res, 'NOT_FOUND', { message: '없는 주소입니다' });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    // 요청 본문이 깨진 JSON이거나 너무 큼 (express.json이 던진다): 사용자 쪽 잘못이라 400
    const type = (err as { type?: string }).type;
    if (type === 'entity.parse.failed' || type === 'entity.too.large') {
        sendError(res, 'INVALID_REQUEST', { message: '요청 본문을 읽지 못했습니다' });
        return;
    }
    // 그 밖은 서버 쪽 문제: 운영 로그에 남기고(pino-http가 붙인 req.log) 500. 오류 내용은 응답에 넣지 않는다
    req.log.error({ err }, '요청을 처리하다 실패했습니다');
    if (res.headersSent) return;
    sendError(res, 'INTERNAL_ERROR');
};
