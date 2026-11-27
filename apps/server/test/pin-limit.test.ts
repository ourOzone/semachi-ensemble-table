// PIN 확인 시도 횟수 제한 (B-5 S2, src/middleware/pin-limit.ts). 테스트마다 새 앱으로 센다
import { describe, expect, test } from 'vitest';
import { freshApi, insert, MASTER_PIN, missingId, teamDoc } from './helpers.ts';

const TOO_MANY = { error: 'Too many PIN attempts' };

async function wrongTimes(
    api: ReturnType<typeof freshApi>,
    path: string,
    body: object,
    times: number,
) {
    for (let i = 0; i < times; i++) {
        const res = await api().post(path).send(body);
        expect(res.status).toBe(200);
    }
}

describe('같은 대상(팀·날적이)', () => {
    test('15분 동안 10번 틀리면 11번째부터 429, 맞는 PIN도 막힌다', async () => {
        const api = freshApi();
        const id = await insert('teams', teamDoc({ pin: '1234' }));
        await wrongTimes(api, '/check-team-pin', { teamId: id, pin: '0000' }, 10);

        const blocked = await api().post('/check-team-pin').send({ teamId: id, pin: '1234' });
        expect([blocked.status, blocked.body]).toEqual([429, TOO_MANY]);
        // 언제 다시 되는지 알려 준다 (표준 RateLimit 헤더)
        expect(blocked.headers['retry-after']).toBeDefined();
        expect(blocked.headers['ratelimit-policy']).toBeDefined();
    });

    test('맞는 PIN(마스터 PIN 포함)은 세지 않는다', async () => {
        const api = freshApi();
        const id = await insert('teams', teamDoc({ pin: '1234' }));
        for (let i = 0; i < 15; i++) {
            const pin = i % 2 ? '1234' : MASTER_PIN;
            const res = await api().post('/check-team-pin').send({ teamId: id, pin });
            expect([res.status, res.body]).toEqual([200, true]);
        }
        await wrongTimes(api, '/check-team-pin', { teamId: id, pin: '0000' }, 10);
    });

    test('다른 팀은 따로 센다 (여럿이 IP 하나를 써도 서로 막히지 않게)', async () => {
        const api = freshApi();
        const a = await insert('teams', teamDoc());
        const b = await insert('teams', teamDoc());
        await wrongTimes(api, '/check-team-pin', { teamId: a, pin: '0000' }, 10);
        expect((await api().post('/check-team-pin').send({ teamId: a, pin: '0000' })).status).toBe(
            429,
        );
        expect((await api().post('/check-team-pin').send({ teamId: b, pin: '1234' })).body).toBe(
            true,
        );
    });

    test('날적이 PIN도 같다', async () => {
        const api = freshApi();
        const id = await insert('notes', { text: '글', pin: '1234' });
        await wrongTimes(api, '/check-note-pin', { noteId: id, pin: '0000' }, 10);
        expect((await api().post('/check-note-pin').send({ noteId: id, pin: '1234' })).status).toBe(
            429,
        );
    });

    test('기간이 지나면 다시 된다', async () => {
        const api = freshApi({ pinLimits: { windowMs: 300 } });
        const id = await insert('teams', teamDoc({ pin: '1234' }));
        await wrongTimes(api, '/check-team-pin', { teamId: id, pin: '0000' }, 10);
        expect((await api().post('/check-team-pin').send({ teamId: id, pin: '1234' })).status).toBe(
            429,
        );
        await new Promise((r) => setTimeout(r, 400));
        expect((await api().post('/check-team-pin').send({ teamId: id, pin: '1234' })).body).toBe(
            true,
        );
    });
});

describe('같은 IP 전체', () => {
    test('모든 PIN 확인을 합쳐 30번 틀리면 막힌다 (대상을 바꿔 가며 마스터 PIN을 찾는 것)', async () => {
        const api = freshApi();
        for (let i = 0; i < 30; i++) {
            // 매번 다른(없는) 팀: 대상별 제한에는 걸리지 않는다
            const res = await api()
                .post('/check-team-pin')
                .send({ teamId: missingId(), pin: String(i) });
            expect(res.status).toBe(404);
        }
        const blocked = await api().post('/check-notice-pin').send({ pin: MASTER_PIN });
        expect([blocked.status, blocked.body]).toEqual([429, TOO_MANY]);
    });

    test('공지(마스터 PIN) 확인은 IP로만 센다', async () => {
        const api = freshApi();
        await wrongTimes(api, '/check-notice-pin', { pin: '0000' }, 30);
        expect((await api().post('/check-notice-pin').send({ pin: MASTER_PIN })).status).toBe(429);
    });

    test('프록시를 믿으면(TRUST_PROXY) X-Forwarded-For의 IP로 센다', async () => {
        const api = freshApi({ trustProxy: 1 });
        for (let i = 0; i < 30; i++) {
            await api()
                .post('/check-notice-pin')
                .set('X-Forwarded-For', '203.0.113.1')
                .send({ pin: '0000' });
        }
        const other = await api()
            .post('/check-notice-pin')
            .set('X-Forwarded-For', '203.0.113.2')
            .send({ pin: MASTER_PIN });
        expect([other.status, other.body]).toEqual([200, true]);
        const same = await api()
            .post('/check-notice-pin')
            .set('X-Forwarded-For', '203.0.113.1')
            .send({ pin: MASTER_PIN });
        expect(same.status).toBe(429);
    });
});
