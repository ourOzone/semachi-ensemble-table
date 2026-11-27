// 환경변수 검사 (src/config.ts). 서버 시작(main.ts)이 이 결과로 시작하거나 바로 끝낸다
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { loadConfig } from '../src/config.ts';

const required = { MONGO_DB: 'mongodb://db/semachi', MASTER_PIN: '9999' };

describe('loadConfig', () => {
    test('필수 값만 있으면 나머지는 기본값: 포트 8081, 서버 폴더의 log.txt, HTTP', () => {
        const config = loadConfig(required);
        expect(config).toMatchObject({
            mongoUri: 'mongodb://db/semachi',
            masterPin: '9999',
            port: 8081,
        });
        expect(config.logFile).toBe(fileURLToPath(new URL('../log.txt', import.meta.url)));
        expect(config.tls).toBeUndefined();
    });

    test('MONGO_DB·MASTER_PIN이 없거나 비어 있으면 시작하지 않는다 (없는 이름을 모두 알려줌)', () => {
        expect(() => loadConfig({})).toThrow('환경변수가 없습니다: MONGO_DB, MASTER_PIN');
        expect(() => loadConfig({ ...required, MASTER_PIN: '' })).toThrow(
            '환경변수가 없습니다: MASTER_PIN',
        );
    });

    test('PORT·LOG_FILE을 바꿀 수 있다', () => {
        expect(loadConfig({ ...required, PORT: '3001', LOG_FILE: '/tmp/a.txt' })).toMatchObject({
            port: 3001,
            logFile: '/tmp/a.txt',
        });
    });

    test('TRUST_PROXY: 없으면 false, 숫자는 프록시 수, true/false, 그 밖은 주소 목록 그대로', () => {
        const trust = (TRUST_PROXY?: string) => loadConfig({ ...required, TRUST_PROXY }).trustProxy;
        expect(trust()).toBe(false);
        expect(trust('false')).toBe(false);
        expect(trust('true')).toBe(true);
        expect(trust('1')).toBe(1);
        expect(trust('loopback, uniquelocal')).toBe('loopback, uniquelocal');
    });

    test('CORS_ORIGINS: 쉼표로 여러 주소, 앞뒤 공백·빈 칸은 버림. 없으면 빈 목록', () => {
        expect(loadConfig(required).corsOrigins).toEqual([]);
        expect(
            loadConfig({
                ...required,
                CORS_ORIGINS: ' https://semachi.net, http://localhost:3000 ,',
            }).corsOrigins,
        ).toEqual(['https://semachi.net', 'http://localhost:3000']);
    });

    test('PORT가 포트 번호가 아니면 시작하지 않는다', () => {
        for (const PORT of ['abc', '0', '70000', '80.5']) {
            expect(() => loadConfig({ ...required, PORT })).toThrow(
                'PORT가 올바른 포트 번호가 아닙니다',
            );
        }
    });

    test('인증서 파일은 둘 다 있을 때만 HTTPS, 하나만 있으면 시작하지 않는다', () => {
        expect(
            loadConfig({ ...required, TLS_KEY_FILE: 'k.pem', TLS_CERT_FILE: 'c.pem' }).tls,
        ).toEqual({
            keyFile: 'k.pem',
            certFile: 'c.pem',
        });
        expect(() => loadConfig({ ...required, TLS_KEY_FILE: 'k.pem' })).toThrow(
            '함께 정해야 합니다',
        );
    });
});
