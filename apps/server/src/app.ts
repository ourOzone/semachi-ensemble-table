// Express 앱 조립: 미들웨어 → API. 서버 시작(DB 연결·포트)은 main.ts, 테스트는 이것만 가져다 쓴다
import express from 'express';
import { createLogger } from './lib/log.ts';
import { cors } from './middleware/cors.ts';
import { visitor } from './middleware/visitor.ts';
import { ensemblesRouter } from './routes/ensembles.ts';
import { healthRouter } from './routes/health.ts';
import { notesRouter } from './routes/notes.ts';
import { noticesRouter } from './routes/notices.ts';
import { teamsRouter } from './routes/teams.ts';

export interface AppOptions {
    /** 모든 PIN 확인에서 통과하는 관리자 PIN */
    masterPin: string;
    /** 활동 로그 파일 경로 */
    logFile: string;
    /** 다른 주소에서 이 서버를 부를 수 있게 허락할 웹 주소 (CORS). 없으면 허락하지 않음 */
    corsOrigins?: readonly string[];
}

export function createApp({ masterPin, logFile, corsOrigins = [] }: AppOptions) {
    const app = express();
    const log = createLogger(logFile);

    app.use(healthRouter());

    // 요청 본문 (api.js에는 JSON 해석기가 두 개였다: body-parser와 express.json. 하나만 남김, B-3)
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    // Express 5는 본문이 없으면 req.body가 undefined다. Express 4처럼 빈 객체로 둔다 (본문 없는 요청이 400 대신 500이 되지 않게)
    app.use((req, _res, next) => {
        req.body ??= {};
        next();
    });
    app.use(cors(corsOrigins));
    app.use(visitor);

    app.use(teamsRouter({ log, masterPin }));
    app.use(ensemblesRouter({ log }));
    app.use(notesRouter({ log, masterPin }));
    app.use(noticesRouter({ masterPin }));

    return app;
}
