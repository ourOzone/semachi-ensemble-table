// Express 앱 조립: 미들웨어 → API. 서버 시작(DB 연결·포트)은 main.ts, 테스트는 이것만 가져다 쓴다
import express from 'express';
import helmet from 'helmet';
import { createLogger } from './lib/log.ts';
import { createPinAuth } from './lib/pin-auth.ts';
import { cors } from './middleware/cors.ts';
import { createPinLimiters, type PinLimitOptions } from './middleware/pin-limit.ts';
import { visitor } from './middleware/visitor.ts';
import { adminRouter } from './routes/admin.ts';
import { ensemblesRouter } from './routes/ensembles.ts';
import { healthRouter } from './routes/health.ts';
import { notesRouter } from './routes/notes.ts';
import { noticesRouter } from './routes/notices.ts';
import { teamsRouter } from './routes/teams.ts';

export interface AppOptions {
    /** 모든 PIN 확인에서 통과하는 관리자 PIN. 관리자가 바꾸면(DB) 그쪽이 먼저 (lib/pin-auth) */
    masterPin: string;
    /** 새 PIN을 해시로 저장 (기본 false: 운영 전환 전까지 옛 서버가 평문으로 비교, 사전 결정 10) */
    hashPins?: boolean;
    /** 활동 로그 파일 경로 */
    logFile: string;
    /** 다른 주소에서 이 서버를 부를 수 있게 허락할 웹 주소 (CORS). 없으면 허락하지 않음 */
    corsOrigins?: readonly string[];
    /** PIN 확인 시도 제한 (기본 15분에 대상별 10번·IP별 30번) */
    pinLimits?: PinLimitOptions;
    /** 프록시 뒤에서 진짜 사용자 IP를 읽기 위한 Express trust proxy 값 (기본 false) */
    trustProxy?: boolean | number | string;
}

export function createApp({
    masterPin,
    logFile,
    corsOrigins = [],
    pinLimits,
    trustProxy = false,
    hashPins = false,
}: AppOptions) {
    const app = express();
    app.set('trust proxy', trustProxy);
    const log = createLogger(logFile);
    const pinLimit = createPinLimiters(pinLimits);
    const pins = createPinAuth({ envMasterPin: masterPin, hashNewPins: hashPins });

    // 보안 헤더 (O6): 브라우저가 응답을 다른 형식으로 짐작하지 않게, 다른 사이트의 iframe에 넣지 못하게, HTTPS만 쓰게 등.
    // 다른 사이트가 이 응답을 가져다 쓰는 것은 막되, 같은 사이트(semachi.net:8081, localhost끼리)는 허락한다
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));

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

    app.use(teamsRouter({ log, pins, pinLimit }));
    app.use(ensemblesRouter({ log, pins, pinLimit }));
    app.use(notesRouter({ log, pins, pinLimit }));
    app.use(noticesRouter({ pins, pinLimit }));
    app.use(adminRouter({ log, pins, pinLimit }));

    return app;
}
