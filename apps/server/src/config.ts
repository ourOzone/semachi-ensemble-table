// 환경변수 읽기·검사. 서버 시작(main.ts)에서 한 번 읽고, 꼭 필요한 값이 없으면 시작하지 않는다
import { fileURLToPath } from 'node:url';

export interface Config {
    /** MongoDB 연결 주소 (MONGO_DB, 필수) */
    mongoUri: string;
    /** 모든 PIN 확인에서 통과하는 관리자 PIN (MASTER_PIN, 필수) */
    masterPin: string;
    /** 서버 포트 (PORT, 기본 8081) */
    port: number;
    /** 활동 로그 파일 (LOG_FILE, 기본 apps/server/log.txt: api.js 시절과 같은 서버 폴더) */
    logFile: string;
    /** CORS로 허락할 웹 주소 (CORS_ORIGINS, 쉼표로 여러 개. 기본 없음: 웹과 API가 같은 주소) */
    corsOrigins: string[];
    /**
     * 프록시 뒤에서 진짜 사용자 IP를 읽기 위한 Express trust proxy (TRUST_PROXY, 기본 false).
     * 숫자면 앞에 있는 프록시 수(Caddy 하나면 1), true/false, 또는 주소 목록. PIN 시도 제한이 IP로 세므로 B-11에서 꼭 정한다
     */
    trustProxy: boolean | number | string;
    /**
     * HTTPS 인증서 파일 (TLS_KEY_FILE·TLS_CERT_FILE, 둘 다 있을 때만). 없으면 HTTP로 실행한다.
     * api.js는 /etc/letsencrypt/live/semachi.net/ 의 파일을 늘 직접 읽었다. 운영은 B-11부터 Caddy가 HTTPS를 맡는다
     */
    tls?: { keyFile: string; certFile: string };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
    const missing = ['MONGO_DB', 'MASTER_PIN'].filter((key) => !env[key]);
    if (missing.length > 0) {
        throw new Error(`환경변수가 없습니다: ${missing.join(', ')}`);
    }

    const port = Number(env.PORT ?? 8081);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`PORT가 올바른 포트 번호가 아닙니다: ${env.PORT}`);
    }

    const { TLS_KEY_FILE: keyFile, TLS_CERT_FILE: certFile } = env;
    if (Boolean(keyFile) !== Boolean(certFile)) {
        throw new Error('TLS_KEY_FILE과 TLS_CERT_FILE은 함께 정해야 합니다');
    }

    return {
        mongoUri: env.MONGO_DB!,
        masterPin: env.MASTER_PIN!,
        port,
        logFile: env.LOG_FILE || fileURLToPath(new URL('../log.txt', import.meta.url)),
        corsOrigins: (env.CORS_ORIGINS ?? '')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
        trustProxy: parseTrustProxy(env.TRUST_PROXY),
        tls: keyFile && certFile ? { keyFile, certFile } : undefined,
    };
}

function parseTrustProxy(value: string | undefined): boolean | number | string {
    if (!value || value === 'false') return false;
    if (value === 'true') return true;
    return /^\d+$/.test(value) ? Number(value) : value;
}
