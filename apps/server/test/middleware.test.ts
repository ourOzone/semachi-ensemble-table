// 모든 요청에 걸리는 처리 (CORS·보안 헤더·방문자 쿠키·요청 본문·GET /)
// 옛 로그 파일(log.txt) 테스트는 B-7에서 활동 기록으로 바꾸며 지웠다 (activity.test.ts)
import { describe, expect, test } from 'vitest';
import { ALLOWED_ORIGIN, api } from './helpers.ts';

const VID = '0b8a5c7e-1f2d-4c3b-9a8e-7d6c5b4a3f21';
const COOKIE_RE =
    /^semachi_vid=([0-9a-f-]{36}); Max-Age=31536000; Path=\/; HttpOnly; Secure; SameSite=Lax$/;

describe('CORS (B-5 S3: 허락한 주소만)', () => {
    test('허락한 주소면 그 주소를 쿠키와 함께 허락한다', async () => {
        const res = await api().get('/notices').set('Origin', ALLOWED_ORIGIN);
        expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
        expect(res.headers['access-control-allow-credentials']).toBe('true');
        expect(res.headers['vary']).toContain('Origin');
        expect(res.headers['access-control-allow-methods']).toBe('GET,PUT,POST,DELETE');
        expect(res.headers['access-control-allow-headers']).toBe('Content-Type');
    });

    test('허락하지 않은 주소면 허락 헤더가 없다 (브라우저가 응답을 막는다)', async () => {
        const res = await api().get('/notices').set('Origin', 'https://evil.example');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
        expect(res.headers['access-control-allow-credentials']).toBeUndefined();
        expect(res.headers['vary']).toContain('Origin');
    });

    test('Origin이 없으면(같은 주소·서버끼리) 허락 헤더 없음, 메서드·헤더 목록은 있음', async () => {
        const res = await api().get('/notices');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
        expect(res.headers['access-control-allow-methods']).toBe('GET,PUT,POST,DELETE');
    });

    test('사전 요청(OPTIONS)은 Express가 200으로 답하고, 방문자 쿠키를 주지 않는다', async () => {
        const res = await api().options('/team').set('Origin', 'http://localhost:3000');
        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
        expect(res.headers['set-cookie']).toBeUndefined();
    });
});

describe('보안 헤더 (B-5 O6, helmet)', () => {
    test('모든 응답에 보안 헤더, 서버 종류(X-Powered-By)는 숨긴다', async () => {
        const res = await api().get('/notices');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
        expect(res.headers['strict-transport-security']).toContain('max-age=');
        expect(res.headers['content-security-policy']).toContain("default-src 'self'");
        // 같은 사이트(semachi.net:8081, localhost끼리)는 응답을 가져다 쓸 수 있게
        expect(res.headers['cross-origin-resource-policy']).toBe('same-site');
        expect(res.headers['x-powered-by']).toBeUndefined();
    });
});

describe('방문자 쿠키 (semachi_vid, B-5에서 SameSite=Lax)', () => {
    test('없으면 새 UUID를 1년짜리 쿠키로 준다', async () => {
        const res = await api().get('/notices');
        const cookie = res.headers['set-cookie']?.[0] ?? '';
        expect(cookie).toMatch(COOKIE_RE);
    });

    test('올바른 UUID가 있으면 그 값을 그대로 다시 준다 (만료 연장)', async () => {
        const res = await api().get('/notices').set('Cookie', `other=1; semachi_vid=${VID}`);
        expect(res.headers['set-cookie']?.[0]).toBe(
            `semachi_vid=${VID}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`,
        );
    });

    test('UUID 형식이 아니면 새로 발급한다', async () => {
        const res = await api().get('/notices').set('Cookie', 'semachi_vid=hacked_log_line');
        const id = COOKIE_RE.exec(res.headers['set-cookie']?.[0] ?? '')?.[1];
        expect(id).toBeDefined();
        expect(id).not.toBe('hacked_log_line');
    });

    test('대문자 UUID도 받아들인다', async () => {
        const upper = VID.toUpperCase();
        const res = await api().get('/notices').set('Cookie', `semachi_vid=${upper}`);
        expect(res.headers['set-cookie']?.[0]).toContain(`semachi_vid=${upper};`);
    });

    test('쿠키 값이 URL 인코딩돼 있으면 풀어서 읽는다', async () => {
        const res = await api()
            .get('/notices')
            .set('Cookie', `semachi_vid=${encodeURIComponent(VID)}`);
        expect(res.headers['set-cookie']?.[0]).toContain(`semachi_vid=${VID};`);
    });
});

describe('요청 본문', () => {
    test('JSON과 form(urlencoded) 모두 받는다', async () => {
        const json = await api().post('/check-notice-pin').send({ pin: '9999' });
        expect(json.body).toBe(true);
        const form = await api().post('/check-notice-pin').type('form').send('pin=9999');
        expect(form.body).toBe(true);
    });

    test('JSON 형식이 깨지면 Express 기본 오류 화면(HTML)으로 400', async () => {
        const res = await api()
            .post('/check-notice-pin')
            .set('Content-Type', 'application/json')
            .send('{"pin":');
        expect(res.status).toBe(400);
        expect(res.headers['content-type']).toContain('text/html');
    });
});

describe('GET / (로그 보기, B-5 S1에서 삭제)', () => {
    test('없는 경로라 404이고, 로그 내용을 보여주지 않는다', async () => {
        const res = await api().get('/');
        expect(res.status).toBe(404);
        expect(res.text).not.toContain('a_1_pageload');
    });
});

describe('없는 경로', () => {
    test('Express 기본 404 (HTML)', async () => {
        const res = await api().get('/nope');
        expect(res.status).toBe(404);
        expect(res.headers['content-type']).toContain('text/html');
    });
});
