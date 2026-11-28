// 환경변수 읽기·검사. 서버 시작(main.ts)에서 한 번 읽고, 꼭 필요한 값이 없으면 시작하지 않는다
export interface Config {
    /** MongoDB 연결 주소 (MONGO_DB, 필수) */
    mongoUri: string;
    /** 모든 PIN 확인에서 통과하는 관리자 PIN (MASTER_PIN, 필수) */
    masterPin: string;
    /** 서버 포트 (PORT, 기본 8081) */
    port: number;
    /** 이 서버가 어디인지 (APP_ENV: production·beta·development, 기본 development). 활동 기록에 남긴다 */
    appEnv: string;
    /** 운영 로그 수준 (LOG_LEVEL: fatal·error·warn·info·debug·silent, 기본 info) */
    logLevel: string;
    /** CORS로 허락할 웹 주소 (CORS_ORIGINS, 쉼표로 여러 개. 기본 없음: 웹과 API가 같은 주소) */
    corsOrigins: string[];
    /**
     * DB 주소를 찾을 DNS 서버 (DNS_SERVERS, 쉼표로 여러 개. 기본 없음: 컴퓨터 설정).
     * 윈도우에서 Node가 응답하지 않는 DNS(127.0.0.1)를 잡아 Atlas 주소(mongodb+srv)를 못 찾을 때 개발 서버가 정한다
     */
    dnsServers: string[];
    /** 새 PIN을 해시로 저장 (PIN_HASH=true, 기본 false). 운영 전환(B-14) 때 켜고 scripts/hash-pins.ts로 기존 PIN도 바꾼다 */
    hashPins: boolean;
    /**
     * 날짜 지난 팀·합주 정리 작업 (CLEANUP_ENABLED=true, 기본 false, B-9). 운영 서버 하나에서만 켠다:
     * 베타·내 PC 서버(pnpm dev:server)는 같은 DB를 쓰므로 켜면 같은 일을 두 번 하거나 실수로 운영 데이터를 지운다
     */
    cleanupEnabled: boolean;
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
        appEnv: env.APP_ENV || 'development',
        logLevel: env.LOG_LEVEL || 'info',
        corsOrigins: (env.CORS_ORIGINS ?? '')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
        trustProxy: parseTrustProxy(env.TRUST_PROXY),
        hashPins: env.PIN_HASH === 'true',
        cleanupEnabled: env.CLEANUP_ENABLED === 'true',
        dnsServers: (env.DNS_SERVERS ?? '')
            .split(',')
            .map((server) => server.trim())
            .filter(Boolean),
        tls: keyFile && certFile ? { keyFile, certFile } : undefined,
    };
}

function parseTrustProxy(value: string | undefined): boolean | number | string {
    if (!value || value === 'false') return false;
    if (value === 'true') return true;
    return /^\d+$/.test(value) ? Number(value) : value;
}
