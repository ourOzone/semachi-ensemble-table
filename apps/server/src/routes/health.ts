// GET /health : 서버가 살아 있고 DB에 연결돼 있는지 (배포 뒤 확인·Docker 상태 검사용, O4)
// 방문자 쿠키·로그 없이 답한다 (app.ts에서 다른 미들웨어보다 먼저)
import express from 'express';
import mongoose from 'mongoose';

export function healthRouter() {
    const router = express.Router();

    router.get('/health', (_req, res) => {
        const connected = mongoose.connection.readyState === mongoose.ConnectionStates.connected;
        res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'db-disconnected' });
    });

    return router;
}
