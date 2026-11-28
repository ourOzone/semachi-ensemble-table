// PIN 틀린 횟수 세기·막기 (src/lib/pin-guard.ts). 테스트마다 새 앱으로 센다
// 대상별(팀·날적이 전체·마스터) 10번 — 맞추면 0으로 / IP 전체 30번 — 맞춰도 그대로
import { describe, expect, test } from 'vitest';
import { ipKey } from '../src/lib/pin-guard.ts';
import {
    ensembleBody,
    ensembleDoc,
    freshApi,
    insert,
    MASTER_PIN,
    missingId,
    teamBody,
    teamDoc,
} from './helpers.ts';

const TOO_MANY = { error: 'Too many PIN attempts' };
type Api = ReturnType<typeof freshApi>;

async function wrongTeamPin(api: Api, teamId: string, times: number) {
    for (let i = 0; i < times; i++) {
        const res = await api().post('/check-team-pin').send({ teamId, pin: '0000' });
        expect(res.body).toBe(false);
    }
}

describe('팀별로 센다', () => {
    test('같은 팀에 10번 틀리면 11번째부터 429, 맞는 PIN도 막힌다 (다시 해도 되는 때: Retry-After)', async () => {
        const api = freshApi();
        const id = await insert('teams', teamDoc({ pin: '1234' }));
        await wrongTeamPin(api, id, 10);

        const blocked = await api().post('/check-team-pin').send({ teamId: id, pin: '1234' });
        expect([blocked.status, blocked.body]).toEqual([429, TOO_MANY]);
        expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(890);
        expect(Number(blocked.headers['retry-after'])).toBeLessThanOrEqual(900);
    });

    test('맞추면 그 팀의 틀린 횟수는 처음부터 (오타 몇 번 뒤 맞추면 다시 10번)', async () => {
        const api = freshApi();
        const id = await insert('teams', teamDoc({ pin: '1234' }));
        await wrongTeamPin(api, id, 9);
        expect((await api().post('/check-team-pin').send({ teamId: id, pin: '1234' })).body).toBe(
            true,
        );

        const again = await api().post('/check-team-pin').send({ teamId: id, pin: '0000' });
        expect(again.headers['pin-attempts']).toBe('1/10');
    });

    test('다른 팀은 따로 센다, 다른 팀을 맞춰도 이 팀의 횟수는 그대로 (새 팀을 만들어 0으로 돌리지 못하게)', async () => {
        const api = freshApi();
        const victim = await insert('teams', teamDoc({ pin: '1234' }));
        const mine = await insert('teams', teamDoc({ pin: '5678' }));
        await wrongTeamPin(api, victim, 9);
        expect((await api().post('/check-team-pin').send({ teamId: mine, pin: '5678' })).body).toBe(
            true,
        );

        const tenth = await api().post('/check-team-pin').send({ teamId: victim, pin: '0001' });
        expect(tenth.headers['pin-attempts']).toBe('10/10');
        expect(
            (await api().post('/check-team-pin').send({ teamId: victim, pin: '0002' })).status,
        ).toBe(429);
        // 다른 팀은 그대로 된다
        expect((await api().post('/check-team-pin').send({ teamId: mine, pin: '5678' })).body).toBe(
            true,
        );
    });

    test('확인 API와 수정·삭제가 같은 팀이면 함께 센다', async () => {
        const api = freshApi();
        const id = await insert('teams', teamDoc({ pin: '1234' }));
        await wrongTeamPin(api, id, 2);
        const put = await api()
            .put(`/team?id=${id}`)
            .send(teamBody({ pin: '0000' }));
        expect([put.status, put.headers['pin-attempts']]).toEqual([403, '3/10']);
    });

    test('합주 잡기·수정·삭제는 그 합주 팀의 횟수로 센다 (합주 PIN = 팀 PIN)', async () => {
        const api = freshApi();
        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        const a = await insert('ensembles', ensembleDoc({ teamId }));
        const b = await insert('ensembles', ensembleDoc({ teamId }));
        await api().delete(`/ensemble?id=${a}`).send({ pin: '0000' });
        await api()
            .put(`/ensemble?id=${b}`)
            .send(ensembleBody({ pin: '0000' }));
        const add = await api()
            .post('/ensemble')
            .send(ensembleBody({ teamId, pin: '0000' }));
        expect([add.status, add.headers['pin-attempts']]).toEqual([403, '3/10']);
        const check = await api().post('/check-team-pin').send({ teamId, pin: '0000' });
        expect(check.headers['pin-attempts']).toBe('4/10');
    });

    test('기간이 지나면 다시 된다', async () => {
        const api = freshApi({ pinLimits: { windowMs: 300 } });
        const id = await insert('teams', teamDoc({ pin: '1234' }));
        await wrongTeamPin(api, id, 10);
        expect((await api().post('/check-team-pin').send({ teamId: id, pin: '1234' })).status).toBe(
            429,
        );
        await new Promise((r) => setTimeout(r, 400));
        expect((await api().post('/check-team-pin').send({ teamId: id, pin: '1234' })).body).toBe(
            true,
        );
    });
});

describe('날적이는 전체를 하나로, 공지·관리자는 마스터로 센다', () => {
    test('다른 글이어도 날적이끼리 함께 센다', async () => {
        const api = freshApi();
        const a = await insert('notes', { text: 'a', pin: '1111' });
        const b = await insert('notes', { text: 'b', pin: '2222' });
        await api().post('/check-note-pin').send({ noteId: a, pin: '0000' });
        const res = await api().delete(`/note?id=${b}`).send({ pin: '0000' });
        expect([res.status, res.headers['pin-attempts']]).toEqual([403, '2/10']);
    });

    test('공지·관리자 화면은 "마스터"로 함께 센다 (10번)', async () => {
        const api = freshApi();
        for (let i = 0; i < 9; i++) await api().post('/check-notice-pin').send({ pin: '0000' });
        const admin = await api().post('/admin/login').send({ pin: '0000' });
        expect([admin.status, admin.headers['pin-attempts']]).toEqual([403, '10/10']);
        expect((await api().post('/check-notice-pin').send({ pin: MASTER_PIN })).status).toBe(429);
    });
});

describe('같은 IP 전체 (30번, 맞춰도 그대로)', () => {
    test('내 팀 PIN으로 0으로 돌려 가며 마스터 PIN을 찾아도 30번에서 막힌다', async () => {
        const api = freshApi();
        const mine = await insert('teams', teamDoc({ pin: '5678' }));
        for (let round = 0; round < 3; round++) {
            // 마스터 PIN 후보를 9번 넣고(틀림) 내 팀 PIN으로 팀 횟수를 0으로
            await wrongTeamPin(api, mine, 9);
            expect(
                (await api().post('/check-team-pin').send({ teamId: mine, pin: '5678' })).body,
            ).toBe(true);
        }
        // 27번 틀렸다: 3번 더 틀리면 IP 전체 한도
        const left = await api().post('/check-team-pin').send({ teamId: mine, pin: '0000' });
        expect(left.headers['pin-attempts']).toBe('28/30');
        await wrongTeamPin(api, mine, 2);
        const blocked = await api().post('/check-notice-pin').send({ pin: MASTER_PIN });
        expect([blocked.status, blocked.body]).toEqual([429, TOO_MANY]);
    });

    test('없는 팀 id로 마스터 PIN을 찾아도 틀린 시도로 센다', async () => {
        const api = freshApi();
        for (let i = 0; i < 30; i++) {
            const res = await api()
                .post('/check-team-pin')
                .send({ teamId: missingId(), pin: String(i) });
            expect(res.status).toBe(404);
        }
        expect((await api().post('/check-notice-pin').send({ pin: MASTER_PIN })).status).toBe(429);
    });

    test('IP 전체 한도가 더 빠듯하면 그쪽을 보여준다', async () => {
        const api = freshApi({ pinLimits: { perIp: 3 } });
        await api().post('/check-team-pin').send({ teamId: missingId(), pin: '0000' });
        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        const res = await api().post('/check-team-pin').send({ teamId, pin: '0000' });
        expect(res.headers['pin-attempts']).toBe('2/3');
    });

    test('프록시를 믿으면(TRUST_PROXY) X-Forwarded-For의 IP로 센다', async () => {
        const api = freshApi({ trustProxy: 1, pinLimits: { perTarget: 100 } });
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

describe('ipKey (세는 IP 단위)', () => {
    test('IPv4는 그대로, IPv4를 담은 IPv6는 IPv4로, IPv6는 앞 64비트', () => {
        expect(ipKey('203.0.113.1')).toBe('203.0.113.1');
        expect(ipKey('::ffff:127.0.0.1')).toBe('127.0.0.1');
        expect(ipKey('2001:db8:1:2:aaaa::1')).toBe('2001:db8:1:2::/64');
        expect(ipKey('2001:DB8:1:2:bbbb:cccc:dddd:eeee')).toBe('2001:db8:1:2::/64');
        expect(ipKey('2001:db8::1')).toBe('2001:db8:0:0::/64');
        expect(ipKey('::1')).toBe('0:0:0:0::/64');
        expect(ipKey(undefined)).toBe('unknown');
    });
});
