// Express 앱 조립: 미들웨어 → API. 서버 시작(DB 연결·포트)은 main.ts, 테스트는 이것만 가져다 쓴다
import express from 'express';
import helmet from 'helmet';
import { pino, type Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { createActivityRecorder } from './lib/activity.ts';
import { createAdminSessions } from './lib/admin-session.ts';
import { createPinAuth } from './lib/pin-auth.ts';
import { createPinCheck } from './lib/pin-check.ts';
import { createPinGuard, type PinLimitOptions } from './lib/pin-guard.ts';
import { cors } from './middleware/cors.ts';
import { errorHandler, notFound } from './middleware/errors.ts';
import { visitor } from './middleware/visitor.ts';
import { adminRouter } from './routes/admin.ts';
import { ensemblesRouter } from './routes/ensembles.ts';
import { healthRouter } from './routes/health.ts';
import { notesRouter } from './routes/notes.ts';
import { noticesRouter } from './routes/notices.ts';
import { teamsRouter } from './routes/teams.ts';
import { visitsRouter } from './routes/visits.ts';

export interface AppOptions {
    /** 모든 PIN 확인에서 통과하는 관리자 PIN. 관리자가 바꾸면(DB) 그쪽이 먼저 (lib/pin-auth) */
    masterPin: string;
    /** 새 PIN을 해시로 저장 (기본 false: 운영 전환 전까지 옛 서버가 평문으로 비교, 사전 결정 10) */
    hashPins?: boolean;
    /** 다른 주소에서 이 서버를 부를 수 있게 허락할 웹 주소 (CORS). 없으면 허락하지 않음 */
    corsOrigins?: readonly string[];
    /** PIN 확인 시도 제한 (기본 15분에 대상별 10번·IP별 30번) */
    pinLimits?: PinLimitOptions;
    /** 프록시 뒤에서 진짜 사용자 IP를 읽기 위한 Express trust proxy 값 (기본 false) */
    trustProxy?: boolean | number | string;
    /** 이 서버가 어디인지 (production·beta·development). 활동 기록에 남긴다 (같은 DB를 쓰므로) */
    appEnv?: string;
    /** 운영 로그 (pino). 기본은 표준 출력에 JSON 한 줄씩 */
    logger?: Logger;
}

export function createApp({
    masterPin,
    corsOrigins = [],
    pinLimits,
    trustProxy = false,
    hashPins = false,
    appEnv = 'development',
    logger = pino(),
}: AppOptions) {
    const app = express();
    app.set('trust proxy', trustProxy);
    const guard = createPinGuard(pinLimits);
    const pins = createPinAuth({ envMasterPin: masterPin, hashNewPins: hashPins });
    const activity = createActivityRecorder({ env: appEnv, logger });
    const pinCheck = createPinCheck({ pins, guard, activity });
    const sessions = createAdminSessions();

    // 운영 로그 (B-7): 요청마다 한 줄 (메서드·주소·상태·걸린 시간). 본문·쿠키는 남기지 않는다 (PIN·방문자 id가 있어서)
    app.use(
        pinoHttp({
            logger,
            serializers: {
                req: (req: { method: string; url: string }) => ({
                    method: req.method,
                    url: req.url,
                }),
                res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
            },
            // 상태 검사(/health)는 자주 와서 남기지 않는다
            autoLogging: { ignore: (req) => req.url === '/health' },
        }),
    );

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

    app.use(visitsRouter({ activity }));
    app.use(teamsRouter({ pins, guard, pinCheck, activity }));
    app.use(ensemblesRouter({ pinCheck, activity }));
    app.use(notesRouter({ pins, guard, pinCheck, activity }));
    app.use(noticesRouter({ pins, guard, pinCheck, activity }));
    app.use(adminRouter({ pins, guard, pinCheck, activity, sessions }));

    // 어떤 라우트도 답하지 않은 요청 → 404 JSON, 처리 중 던져진 오류 → JSON (B-10 A1). 반드시 맨 뒤에
    app.use(notFound);
    app.use(errorHandler);

    return app;
}
