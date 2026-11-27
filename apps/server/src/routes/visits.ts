// POST /visits : 웹을 열 때 한 번 (B-7, O2). 이전에는 GET /teams가 "페이지 열기"를 기록해,
// 웹이 팀 목록을 다시 불러올 때마다(탭으로 돌아오기·변경 뒤) 기록이 쌓였다
import express from 'express';
import type { RecordActivity } from '../lib/activity.ts';

export function visitsRouter({ activity }: { activity: RecordActivity }) {
    const router = express.Router();

    router.post('/visits', async (req, res) => {
        const path = typeof req.body.path === 'string' ? req.body.path.slice(0, 100) : undefined;
        await activity(req, {
            action: 'visit',
            target: { kind: 'page', name: path },
            result: 'ok',
        });
        res.status(204).end();
    });

    return router;
}
