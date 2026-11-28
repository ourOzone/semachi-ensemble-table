// 관리자 API (B-7, routes/admin.ts): 마스터 PIN으로 로그인, 활동 기록 찾기·방문자·요약
import { describe, expect, test, vi } from 'vitest';
import { createAdminSessions } from '../src/lib/admin-session.ts';
import {
    apiError,
    activities,
    adminCookie,
    api,
    insert,
    lastActivity,
    MASTER_PIN,
    teamDoc,
} from './helpers.ts';

const A = '0b8a5c7e-1f2d-4c3b-9a8e-7d6c5b4a3f21';
const B = '1c9b6d8f-2e3a-4d4c-8b9f-8e7d6c5b4a32';
/** 응답의 Set-Cookie 목록 */
const setCookies = (res: { headers: Record<string, unknown> }) =>
    ([] as string[]).concat((res.headers['set-cookie'] as string[] | string | undefined) ?? []);
const visit = (vid: string, ua = 'agent-a') =>
    api().post('/visits').set('Cookie', `semachi_vid=${vid}`).set('User-Agent', ua).send({});

describe('로그인 (마스터 PIN)', () => {
    test('맞으면 관리자 쿠키(HttpOnly·Secure·SameSite=Strict, 12시간), 로그인 상태가 된다', async () => {
        expect((await api().get('/admin/session')).body).toEqual({ admin: false });
        const res = await api().post('/admin/login').send({ pin: MASTER_PIN });
        expect([res.status, res.body]).toEqual([200, { admin: true }]);
        const cookie = setCookies(res).find((c) => c.startsWith('semachi_admin='));
        expect(cookie).toMatch(/Max-Age=43200; Path=\/; HttpOnly; Secure; SameSite=Strict$/);

        const session = await api().get('/admin/session').set('Cookie', cookie!.split(';')[0]!);
        expect(session.body).toEqual({ admin: true });
        expect(await lastActivity()).toMatchObject({
            action: 'admin.login',
            pin: 'master',
            result: 'ok',
        });
    });

    test('틀리면 403, 틀린 시도로 남고 "마스터" 횟수로 센다', async () => {
        const res = await api().post('/admin/login').send({ pin: '0000' });
        expect([res.status, res.body, res.headers['pin-attempts']]).toEqual([
            403,
            apiError('WRONG_PIN'),
            '1/10',
        ]);
        expect(setCookies(res).join()).not.toContain('semachi_admin=');
        expect(await lastActivity()).toMatchObject({ action: 'admin.login', result: 'wrong-pin' });
    });

    test('로그아웃하면 쿠키를 지운다', async () => {
        const res = await api()
            .post('/admin/logout')
            .set('Cookie', await adminCookie());
        expect(setCookies(res).join()).toContain('semachi_admin=; Max-Age=0');
    });

    test('로그인하지 않았거나 쿠키를 고쳤으면 관리자 API는 401', async () => {
        const forged = `semachi_admin=${Date.now() + 1e9}.forged-signature`;
        for (const path of ['/admin/activities', '/admin/overview', `/admin/visitors/${A}`]) {
            expect((await api().get(path)).status).toBe(401);
            expect((await api().get(path).set('Cookie', forged)).status).toBe(401);
        }
        const change = await api()
            .put('/admin/master-pin')
            .send({ currentPin: MASTER_PIN, newPin: '1111' });
        expect([change.status, change.body]).toEqual([401, apiError('ADMIN_LOGIN_REQUIRED')]);
    });

    test('12시간이 지나면 다시 로그인', () => {
        vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-27T00:00:00Z') });
        const sessions = createAdminSessions();
        const headers: string[] = [];
        sessions.issue({ append: (_: string, value: string) => headers.push(value) } as never);
        const req = (cookie: string) => ({ headers: { cookie } }) as never;
        const cookie = headers[0]!.split(';')[0]!;
        expect(sessions.isAdmin(req(cookie))).toBe(true);
        vi.setSystemTime(new Date('2026-11-27T12:00:01Z'));
        expect(sessions.isAdmin(req(cookie))).toBe(false);
        // 다른 서버(다시 켠 서버)의 쿠키는 통하지 않는다 (서명 비밀이 켤 때마다 새로)
        vi.setSystemTime(new Date('2026-11-27T01:00:00Z'));
        expect(createAdminSessions().isAdmin(req(cookie))).toBe(false);
    });
});

describe('활동 기록 찾기 (GET /admin/activities)', () => {
    test('최근 것부터, 방문자·동작(앞부분)·결과로 거르고 before로 더 보기', async () => {
        await visit(A);
        await visit(B);
        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        await api()
            .post(`/teams/${teamId}/check-pin`)
            .set('Cookie', `semachi_vid=${A}`)
            .send({ pin: '0000' });
        const cookie = await adminCookie();
        const get = (query: string) =>
            api().get(`/admin/activities?${query}`).set('Cookie', cookie);

        const all = (await get('')).body.activities;
        expect(all.map((a: { action: string }) => a.action)).toEqual([
            'admin.login',
            'pin.check',
            'visit',
            'visit',
        ]);
        expect((await get(`visitorId=${A}`)).body.activities).toHaveLength(2);
        expect((await get('action=pin')).body.activities).toHaveLength(1);
        expect((await get('result=wrong-pin')).body.activities[0]).toMatchObject({ visitorId: A });

        const page = (await get('limit=2')).body.activities;
        expect(page).toHaveLength(2);
        const next = (await get(`limit=2&before=${page[1].at}`)).body.activities;
        expect(next.map((a: { action: string }) => a.action)).toEqual(['visit', 'visit']);
    });
});

describe('방문자 한 명 (GET /admin/visitors/:id)', () => {
    test('처음·마지막으로 본 때, IP·기기, 기록, 같은 IP나 같은 기기의 다른 방문자', async () => {
        vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-01T00:00:00Z') });
        await visit(A, 'agent-a');
        vi.setSystemTime(new Date('2026-11-20T00:00:00Z'));
        await visit(A, 'agent-a');
        await visit(B, 'agent-b'); // 같은 IP(테스트는 모두 127.0.0.1), 다른 기기
        vi.useRealTimers();

        const res = await api()
            .get(`/admin/visitors/${A}`)
            .set('Cookie', await adminCookie());
        expect(res.body).toMatchObject({
            visitorId: A,
            firstSeen: '2026-11-01T00:00:00.000Z',
            lastSeen: '2026-11-20T00:00:00.000Z',
            count: 2,
            ips: ['127.0.0.1'],
            devices: [{ userAgent: 'agent-a', count: 2 }],
        });
        expect(res.body.activities).toHaveLength(2);
        // (관리자 로그인도 같은 IP의 다른 방문자로 잡힌다)
        expect(res.body.related).toContainEqual(
            expect.objectContaining({ visitorId: B, sharedIps: ['127.0.0.1'], sameDevice: false }),
        );
    });

    test('기록이 없는 방문자는 404', async () => {
        const res = await api()
            .get(`/admin/visitors/${B}`)
            .set('Cookie', await adminCookie());
        expect(res.status).toBe(404);
    });
});

describe('요약 (GET /admin/overview)', () => {
    test('24시간 방문자, 최근 7일 PIN을 많이 틀린 방문자, 마스터 PIN 사용, 마스터 PIN이 어디서 오는지', async () => {
        await visit(A);
        await visit(B);
        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        for (let i = 0; i < 3; i++) {
            await api()
                .post(`/teams/${teamId}/check-pin`)
                .set('Cookie', `semachi_vid=${A}`)
                .send({ pin: '0000' });
        }
        await api()
            .post(`/teams/${teamId}/check-pin`)
            .set('Cookie', `semachi_vid=${B}`)
            .send({ pin: MASTER_PIN });

        const res = await api()
            .get('/admin/overview')
            .set('Cookie', await adminCookie());
        expect(res.body.visitors24h).toBeGreaterThanOrEqual(2);
        expect(res.body.pinFailures[0]).toMatchObject({
            visitorId: A,
            count: 3,
            blocked: 0,
            ips: ['127.0.0.1'],
        });
        // 마스터 PIN 사용: B의 팀 PIN 확인, 관리자 로그인
        expect(res.body.masterUses.map((a: { action: string }) => a.action)).toEqual([
            'admin.login',
            'pin.check',
        ]);
        expect(res.body.masterPinSource).toBe('env');
        expect((await activities()).length).toBeGreaterThan(0);
    });
});
