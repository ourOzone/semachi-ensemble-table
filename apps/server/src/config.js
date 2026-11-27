// 환경변수 읽기. 서버 시작(main.js)에서 한 번 읽는다
import { fileURLToPath } from 'node:url';

export function loadConfig(env = process.env) {
    return {
        /** MongoDB 연결 주소 */
        mongoUri: env.MONGO_DB,
        /** 모든 PIN 확인에서 통과하는 관리자 PIN */
        masterPin: env.MASTER_PIN,
        /** 활동 로그 파일. 없으면 apps/server/log.txt (api.js 시절과 같은 위치: 서버 폴더) */
        logFile: env.LOG_FILE || fileURLToPath(new URL('../log.txt', import.meta.url)),
    };
}
