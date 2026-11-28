// PIN 저장·비교 (B-6): 해시, 전환 기간의 평문, 마스터 PIN 바꾸기, 틀린 횟수 헤더, 기존 PIN 바꾸기 스크립트
import mongoose from 'mongoose';
import { describe, expect, test } from 'vitest';
import { hashPin, isHashedPin, verifyPin } from '../src/lib/pin.ts';
import { hashPlainPins } from '../src/lib/pin-migration.ts';
import {
    ALLOWED_ORIGIN,
    api,
    findAll,
    findOne,
    freshApi,
    insert,
    MASTER_PIN,
    adminCookie,
    teamBody,
    teamDoc,
} from './helpers.ts';

describe('hashPin·verifyPin', () => {
    test('해시는 "scrypt$…" 형식이고 매번 다르다(소금). 맞는 PIN만 통과', async () => {
        const a = await hashPin('1234');
        const b = await hashPin('1234');
        expect(a).toMatch(/^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
        expect(a).not.toBe(b);
        expect(isHashedPin(a)).toBe(true);
        expect(await verifyPin('1234', a)).toBe(true);
        expect(await verifyPin('1235', a)).toBe(false);
    });

    test('전환 기간: 저장된 값이 평문이면 평문으로 비교', async () => {
        expect(isHashedPin('1234')).toBe(false);
        expect(await verifyPin('1234', '1234')).toBe(true);
        expect(await verifyPin('123', '1234')).toBe(false);
    });

    test('문자열이 아니거나 저장된 값이 없으면 틀림 (숫자 1234는 "1234"와 다름)', async () => {
        const hash = await hashPin('1234');
        for (const pin of [1234, undefined, null, {}])
            expect(await verifyPin(pin, hash)).toBe(false);
        expect(await verifyPin('1234', undefined)).toBe(false);
        expect(await verifyPin('1234', '')).toBe(false);
        expect(await verifyPin('1234', 'scrypt$깨진값')).toBe(false);
    });
});

describe('새 PIN 저장', () => {
    test('기본(전환 전)은 평문으로 저장한다 (옛 서버가 평문으로 비교하므로, 사전 결정 10)', async () => {
        const res = await api()
            .post('/team')
            .send(teamBody({ pin: '1234' }));
        expect((await findOne('teams', res.body.id))?.pin).toBe('1234');
    });

    test('해시 저장을 켜면(PIN_HASH) 팀·날적이 PIN을 해시로 저장하고, 그 PIN으로 확인·삭제된다', async () => {
        const hashed = freshApi({ hashPins: true });
        const team = await hashed()
            .post('/team')
            .send(teamBody({ pin: '1234' }));
        const stored = (await findOne('teams', team.body.id))?.pin;
        expect(isHashedPin(stored)).toBe(true);
        expect(
            (await hashed().post('/check-team-pin').send({ teamId: team.body.id, pin: '1234' }))
                .body,
        ).toBe(true);

        const note = await hashed().post('/note').send({ text: '글', pin: '5678' });
        expect(isHashedPin((await findOne('notes', note.body.id))?.pin)).toBe(true);
        const del = await hashed().delete(`/note?id=${note.body.id}`).send({ pin: '5678' });
        expect(del.status).toBe(200);
    });

    test('해시로 바꾼 PIN은 해시 저장을 꺼도 확인된다 (평문·해시 둘 다 읽음)', async () => {
        const id = await insert('teams', teamDoc({ pin: await hashPin('4321') }));
        expect((await api().post('/check-team-pin').send({ teamId: id, pin: '4321' })).body).toBe(
            true,
        );
        expect((await api().post('/check-team-pin').send({ teamId: id, pin: '0000' })).body).toBe(
            false,
        );
    });
});

describe('마스터 PIN 바꾸기 (PUT /admin/master-pin, 관리자로 로그인한 뒤)', () => {
    test('지금 마스터 PIN이 맞으면 바꾼다. DB에 해시로 남고, 이후 모든 PIN 확인이 새 PIN을 따른다', async () => {
        const res = await api()
            .put('/admin/master-pin')
            .set('Cookie', await adminCookie())
            .send({ currentPin: MASTER_PIN, newPin: '2580' });
        expect([res.status, res.body]).toEqual([200, { message: 'Master PIN changed' }]);

        const [setting] = await findAll('settings');
        expect(setting).toMatchObject({ _id: 'masterPin' });
        expect(isHashedPin(String(setting?.value))).toBe(true);

        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        expect((await api().post('/check-notice-pin').send({ pin: '2580' })).body).toBe(true);
        expect((await api().post('/check-team-pin').send({ teamId, pin: '2580' })).body).toBe(true);
        // 환경변수의 처음 마스터 PIN은 더 이상 통과하지 않는다
        expect((await api().post('/check-notice-pin').send({ pin: MASTER_PIN })).body).toBe(false);
        // 다시 바꿀 때는 새 PIN으로
        expect(
            (
                await api()
                    .put('/admin/master-pin')
                    .set('Cookie', await adminCookie(api, '2580'))
                    .send({ currentPin: '2580', newPin: '1357' })
            ).status,
        ).toBe(200);
        expect((await api().post('/check-notice-pin').send({ pin: '1357' })).body).toBe(true);
    });

    test('지금 마스터 PIN이 틀리면 403, 바꾸지 않는다', async () => {
        const res = await api()
            .put('/admin/master-pin')
            .set('Cookie', await adminCookie())
            .send({ currentPin: '0000', newPin: '2580' });
        expect([res.status, res.body]).toEqual([403, { error: 'Wrong PIN' }]);
        expect(await findAll('settings')).toHaveLength(0);
        expect((await api().post('/check-notice-pin').send({ pin: MASTER_PIN })).body).toBe(true);
    });

    test('새 PIN은 숫자 4자리 (웹의 PIN 칸이 4자리)', async () => {
        for (const newPin of ['123', '12345', 'abcd', 1234, undefined]) {
            const res = await api()
                .put('/admin/master-pin')
                .set('Cookie', await adminCookie())
                .send({ currentPin: MASTER_PIN, newPin });
            expect([res.status, res.body]).toEqual([400, { error: 'newPin must be 4 digits' }]);
        }
    });
});

describe('틀린 횟수 알려 주기 (Pin-Attempts 헤더, 웹의 "(7/10)")', () => {
    test('틀릴 때마다 "틀린 횟수/한도". 확인 API와 변경 API가 같은 팀이면 함께 센다', async () => {
        const fresh = freshApi();
        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        const wrong1 = await fresh().post('/check-team-pin').send({ teamId, pin: '0000' });
        expect(wrong1.headers['pin-attempts']).toBe('1/10');
        const wrong2 = await fresh().post('/check-team-pin').send({ teamId, pin: '0001' });
        expect(wrong2.headers['pin-attempts']).toBe('2/10');
        const wrongDelete = await fresh().delete(`/team?id=${teamId}`).send({ pin: '0002' });
        expect([wrongDelete.status, wrongDelete.headers['pin-attempts']]).toEqual([403, '3/10']);
    });

    test('맞으면 헤더가 없다', async () => {
        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        const res = await freshApi()().post('/check-team-pin').send({ teamId, pin: '1234' });
        expect(res.headers['pin-attempts']).toBeUndefined();
    });

    test('공지(마스터 PIN)는 "마스터"의 횟수로', async () => {
        const res = await freshApi()().post('/check-notice-pin').send({ pin: '0000' });
        expect(res.headers['pin-attempts']).toBe('1/10');
    });

    test('다른 주소의 웹(개발)도 읽을 수 있게 헤더를 연다 (CORS)', async () => {
        const res = await api()
            .post('/check-notice-pin')
            .set('Origin', ALLOWED_ORIGIN)
            .send({ pin: '0000' });
        expect(res.headers['access-control-expose-headers']).toBe('Pin-Attempts, Retry-After');
    });
});

describe('기존 평문 PIN을 해시로 (scripts/hash-pins.ts)', () => {
    async function seed() {
        await insert('teams', teamDoc({ pin: '1111' }));
        await insert('teams', teamDoc({ pin: await hashPin('2222') }));
        await insert('teams', teamDoc({ pin: undefined }));
        await insert('notes', { text: '글', pin: '3333' });
    }
    const db = () => mongoose.connection.db!;

    test('세어 보기만 하면 아무것도 바꾸지 않는다', async () => {
        await seed();
        expect(await hashPlainPins(db(), { apply: false })).toEqual([
            { collection: 'teams', plain: 1, hashed: 1, empty: 1, changed: 0 },
            { collection: 'notes', plain: 1, hashed: 0, empty: 0, changed: 0 },
        ]);
        expect((await findAll('teams')).map((t) => t.pin)).toContain('1111');
    });

    test('바꾸면 평문만 해시가 되고, 같은 PIN으로 확인된다. 두 번 실행해도 같다', async () => {
        await seed();
        const counts = await hashPlainPins(db(), { apply: true });
        expect(counts.map((c) => c.changed)).toEqual([1, 1]);
        const pins = [...(await findAll('teams')), ...(await findAll('notes'))]
            .map((doc) => doc.pin)
            .filter((pin) => pin !== undefined);
        expect(pins).toHaveLength(3);
        expect(pins.every((pin) => isHashedPin(pin))).toBe(true);
        const team = (await findAll('teams'))[0]!;
        const check = await api()
            .post('/check-team-pin')
            .send({ teamId: String(team._id), pin: '1111' });
        expect(check.body).toBe(true);

        const again = await hashPlainPins(db(), { apply: true });
        expect(again.map((c) => [c.plain, c.changed])).toEqual([
            [0, 0],
            [0, 0],
        ]);
    });
});
