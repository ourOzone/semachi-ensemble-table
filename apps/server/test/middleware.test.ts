// 모든 요청에 걸리는 처리 (CORS·방문자 쿠키·요청 본문·로그 파일·GET /)의 지금 동작
// "현재 동작:"은 이상해 보이지만 그대로 고정한 것. 고치는 단계는 docs/BACKEND_PLAN.md
import { rmSync } from 'node:fs';
import { describe, expect, test, vi } from 'vitest';
import {
    ALLOWED_ORIGIN,
    api,
    freezeTime,
    readLog,
    settledLog,
    waitForLog,
    resetLog,
} from './helpers.ts';

const VID = '0b8a5c7e-1f2d-4c3b-9a8e-7d6c5b4a3f21';
const COOKIE_RE =
    /^semachi_vid=([0-9a-f-]{36}); Max-Age=31536000; Path=\/; HttpOnly; Secure; SameSite=None$/;

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

describe('방문자 쿠키 (semachi_vid)', () => {
    test('없으면 새 UUID를 1년짜리 쿠키로 준다', async () => {
        const res = await api().get('/notices');
        const cookie = res.headers['set-cookie']?.[0] ?? '';
        expect(cookie).toMatch(COOKIE_RE);
    });

    test('올바른 UUID가 있으면 그 값을 그대로 다시 준다 (만료 연장)', async () => {
        const res = await api().get('/notices').set('Cookie', `other=1; semachi_vid=${VID}`);
        expect(res.headers['set-cookie']?.[0]).toBe(
            `semachi_vid=${VID}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=None`,
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

    test('방문자 id가 로그에 남는다', async () => {
        await resetLog();
        await api().get('/teams').set('Cookie', `semachi_vid=${VID}`);
        await vi.waitFor(() => expect(readLog()).toContain(`${VID}_`));
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

describe('로그 파일 (append_log)', () => {
    test('한 줄 형식: 방문자id_KST시각(YYYY.MM.DD:HH:mm)_동작 (서버 시간대 UTC 기준)', async () => {
        await resetLog();
        freezeTime('2026-11-27T15:04:59Z'); // KST 11/28 00:04
        await api().get('/teams').set('Cookie', `semachi_vid=${VID}`);
        await waitForLog(`${VID}_2026.11.28:00:04_pageload`);
    });

    test('현재 동작: 서버 시간대가 이미 KST면 9시간을 한 번 더 더한다 (D1)', async () => {
        // getTime()은 UTC에 9시간을 더한 뒤 "서버 시간대"로 읽는다. 시간대는 실행 중에 바꿀 수 있다
        const tz = process.env.TZ;
        process.env.TZ = 'Asia/Seoul';
        try {
            await resetLog();
            freezeTime('2026-11-27T03:00:00Z'); // 실제 KST 12:00
            await api().get('/teams').set('Cookie', `semachi_vid=${VID}`);
            await waitForLog(`${VID}_2026.11.27:21:00_pageload`);
        } finally {
            process.env.TZ = tz;
        }
    });

    test('기존 내용 뒤에 줄을 붙인다 (빈 파일이면 첫 줄은 빈 줄)', async () => {
        await resetLog();
        await api().get('/teams').set('Cookie', `semachi_vid=${VID}`);
        await vi.waitFor(() =>
            expect(readLog()).toMatch(new RegExp(`^\\n${VID}_[0-9.:]+_pageload$`)),
        );

        await resetLog('첫 줄\n둘째 줄');
        await api().get('/teams').set('Cookie', `semachi_vid=${VID}`);
        await vi.waitFor(() =>
            expect(readLog()).toMatch(new RegExp(`^첫 줄\\n둘째 줄\\n${VID}_[0-9.:]+_pageload$`)),
        );
    });

    test('5만 줄이 차면 맨 앞 한 줄을 지우고 붙인다 (5만 줄 유지)', async () => {
        const lines = Array.from({ length: 50_000 }, (_, i) => `line${i}`);
        await resetLog(lines.join('\n'));
        await api().get('/teams').set('Cookie', `semachi_vid=${VID}`);
        await vi.waitFor(() => expect(readLog()).toContain('_pageload'));
        const after = readLog().split('\n');
        expect(after).toHaveLength(50_000);
        expect(after[0]).toBe('line1');
        expect(after.at(-2)).toBe('line49999');
    });

    test('로그 파일이 없으면 만들지 않고 콘솔에 오류만 남긴다 (요청은 성공)', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        rmSync(process.env.LOG_FILE!);
        try {
            const res = await api().get('/teams');
            expect(res.status).toBe(200);
            await vi.waitFor(() =>
                expect(error).toHaveBeenCalledWith('파일을 읽을 수 없습니다:', expect.anything()),
            );
            expect(() => readLog()).toThrow('ENOENT');
        } finally {
            await resetLog();
        }
    });
});

describe('GET / (로그 보기, B-5 S1에서 삭제)', () => {
    test('없는 경로라 404이고, 로그 내용을 보여주지 않는다', async () => {
        await resetLog('a_1_pageload');
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

    test('기록하지 않는 요청은 로그에 남지 않는다', async () => {
        await resetLog();
        await api().get('/notices');
        expect(await settledLog()).toBe('');
    });
});
