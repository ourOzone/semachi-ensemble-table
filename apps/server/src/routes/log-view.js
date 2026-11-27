// GET / : 활동 로그 보기
// 현재 동작: 로그 전체를 누구에게나 HTML로 보여준다 (S1, B-5에서 삭제하고 관리자 보기는 B-7)
import express from 'express';
import fs from 'node:fs';

export function logViewRouter({ logFile }) {
    const router = express.Router();

    router.get('/', (req, res) => {
        fs.readFile(logFile, 'utf8', (err, data) => {
            if (err) {
                console.error('파일을 읽을 수 없습니다:', err);
                return res.status(500).send('Internal Server Error');
            }
            const lines = data.split('\n');
            res.status(200).send(lines.join('<br>'));
        });
    });

    return router;
}
