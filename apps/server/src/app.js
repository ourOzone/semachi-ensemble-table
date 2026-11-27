// Express 앱 조립: 미들웨어 → API. 서버 시작(DB 연결·포트)은 main.js, 테스트는 이것만 가져다 쓴다
import express from 'express';
import { createLogger } from './lib/log.js';
import { cors } from './middleware/cors.js';
import { visitor } from './middleware/visitor.js';
import { ensemblesRouter } from './routes/ensembles.js';
import { logViewRouter } from './routes/log-view.js';
import { notesRouter } from './routes/notes.js';
import { noticesRouter } from './routes/notices.js';
import { teamsRouter } from './routes/teams.js';

/**
 * @param {{ masterPin: string | undefined, logFile: string }} options
 *   masterPin: 모든 PIN 확인에서 통과하는 관리자 PIN, logFile: 활동 로그 파일 경로
 */
export function createApp({ masterPin, logFile }) {
    const app = express();
    const log = createLogger(logFile);

    // 요청 본문 (api.js에는 JSON 해석기가 두 개였다: body-parser와 express.json. 하나만 남김, B-3)
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors);
    app.use(visitor);

    app.use(logViewRouter({ logFile }));
    app.use(teamsRouter({ log, masterPin }));
    app.use(ensemblesRouter({ log }));
    app.use(notesRouter({ log, masterPin }));
    app.use(noticesRouter({ masterPin }));

    return app;
}
