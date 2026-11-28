// 합주 API의 지금 동작 (GET /ensembles, POST /ensemble, DELETE /ensemble, GET /ensemble/:id, PUT /ensemble)
// "현재 동작:"은 이상해 보이지만 그대로 고정한 것. 고치는 단계는 docs/BACKEND_PLAN.md
import { describe, expect, test } from 'vitest';
import {
    api,
    ensembleDoc,
    findAll,
    findOne,
    freezeTime,
    insert,
    missingId,
    MASTER_PIN,
    teamDoc,
} from './helpers.ts';

describe('GET /ensembles', () => {
    // 지금 = KST 11/27 19:00. "오늘 0시"는 한국 날짜 기준 = 2026-11-26T15:00Z (D1, B-8).
    // 서버 시간대는 UTC로 둔다(vitest 설정): 운영 서버처럼 UTC여도 한국 날짜로 계산하는지 본다
    const NOW = '2026-11-27T10:00:00Z';

    async function names() {
        const res = await api().get('/ensembles');
        expect(res.status).toBe(200);
        return (res.body as { teamName: string }[]).map((e) => e.teamName);
    }

    test('저장된 필드 그대로 (실제 데이터 모양)', async () => {
        freezeTime(NOW);
        const teamId = missingId();
        const id = await insert('ensembles', ensembleDoc({ teamId }));
        const res = await api().get('/ensembles');
        expect(res.body).toEqual([
            {
                _id: id,
                teamId,
                teamName: '테스트밴드',
                startTime: 10,
                endTime: 13,
                day: 2,
                type: '무기한',
                due: '2099-12-31T00:00:00.000Z',
                nextDate: '2026-12-02T00:00:00.000Z',
                repeat: true,
                __v: 0,
            },
        ]);
    });

    test('반복 합주: 반복 종료 날짜(due)가 오늘(한국 날짜)보다 앞이면 뺀다. 없거나 null이어도 넣는다', async () => {
        freezeTime(NOW);
        // 웹은 due를 'YYYY-MM-DD'로 보내고, DB에는 그날 UTC 0시로 저장된다 (예: '2026-11-27' → 2026-11-27T00:00Z)
        await insert(
            'ensembles',
            ensembleDoc({ teamName: '계속', due: new Date('2099-12-31T00:00:00Z') }),
        );
        await insert('ensembles', ensembleDoc({ teamName: 'due 없음', due: undefined }));
        await insert('ensembles', ensembleDoc({ teamName: 'due null', due: null }));
        await insert(
            'ensembles',
            ensembleDoc({ teamName: '오늘 끝', due: new Date('2026-11-27T00:00:00Z') }),
        );
        await insert(
            'ensembles',
            ensembleDoc({ teamName: '어제 끝', due: new Date('2026-11-26T00:00:00Z') }),
        );
        // 반복 합주는 nextDate가 지났어도 넣는다 (다음 날짜는 웹이 계산)
        await insert(
            'ensembles',
            ensembleDoc({ teamName: '지난 nextDate', nextDate: new Date('2026-01-01T00:00:00Z') }),
        );
        expect(await names()).toEqual(['계속', 'due 없음', 'due null', '오늘 끝', '지난 nextDate']);
    });

    test('일회성 합주: 날짜(nextDate)가 오늘 0시(한국) 이후면 넣는다', async () => {
        freezeTime(NOW);
        const once = { repeat: false, type: '일회성' };
        await insert(
            'ensembles',
            ensembleDoc({
                ...once,
                teamName: '오늘 0시',
                nextDate: new Date('2026-11-26T15:00:00Z'), // KST 11/27 00:00
            }),
        );
        await insert(
            'ensembles',
            ensembleDoc({ ...once, teamName: '미래', nextDate: new Date('2026-12-10T09:00:00Z') }),
        );
        await insert(
            'ensembles',
            ensembleDoc({
                ...once,
                teamName: '어제',
                nextDate: new Date('2026-11-26T14:59:59.999Z'), // KST 11/26 23:59
            }),
        );
        // 일회성은 due와 관계없다 (nextDate는 미래)
        await insert(
            'ensembles',
            ensembleDoc({ ...once, teamName: '지난 due', due: new Date('2020-01-01T00:00:00Z') }),
        );
        expect(await names()).toEqual(['오늘 0시', '미래', '지난 due']);
    });

    test('서버가 UTC여도 KST 오전 9시 전에 시작하는 오늘 일회성 합주가 그날 내내 보이고, 다음 날 0시(KST)에 빠진다 (D1)', async () => {
        // B-8 전에는 "오늘 0시"가 서버 시간대(UTC)의 0시 = KST 09:00이라, 이 합주가 9시부터 빠졌다
        const once = { repeat: false, type: '일회성', teamName: 'KST 08:00 합주' };
        // KST 11/27 08:00 = 11/26 23:00Z
        await insert(
            'ensembles',
            ensembleDoc({ ...once, nextDate: new Date('2026-11-26T23:00:00Z') }),
        );
        freezeTime('2026-11-26T23:30:00Z'); // KST 11/27 08:30
        expect(await names()).toEqual(['KST 08:00 합주']);
        freezeTime('2026-11-27T00:30:00Z'); // KST 11/27 09:30
        expect(await names()).toEqual(['KST 08:00 합주']);
        freezeTime('2026-11-27T14:59:00Z'); // KST 11/27 23:59
        expect(await names()).toEqual(['KST 08:00 합주']);
        freezeTime('2026-11-27T15:00:00Z'); // KST 11/28 00:00
        expect(await names()).toEqual([]);
    });

    test('repeat가 없는 문서는 어느 쪽에도 들지 않아 빠진다', async () => {
        freezeTime(NOW);
        await insert('ensembles', ensembleDoc({ repeat: undefined }));
        expect(await names()).toEqual([]);
    });

    test('현재 동작: 형식이 깨진 데이터(endTime null)도 그대로 보낸다 (ISSUES P9, 웹이 거른다)', async () => {
        freezeTime(NOW);
        await insert('ensembles', ensembleDoc({ endTime: null, startTime: 26 }));
        const res = await api().get('/ensembles');
        expect(res.body[0]).toMatchObject({ startTime: 26, endTime: null });
    });
});

describe('POST /ensemble', () => {
    // 웹이 보내는 모양 (B-8: teamName·day·type은 보내지 않는다). nextDate = KST 12/4(금) 18:00
    const body = {
        startTime: 20,
        endTime: 23,
        due: '2099-12-31',
        nextDate: '2026-12-04T09:00:00.000Z',
        repeat: true,
    };

    test('그 팀의 PIN이 맞으면 저장하고 { id }. teamName·day는 서버가 채운다 (B-8 D3)', async () => {
        const teamId = await insert('teams', teamDoc({ name: '진짜 이름', pin: '1234' }));
        const res = await api()
            .post('/ensemble')
            .send({ ...body, teamId, pin: '1234' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: expect.stringMatching(/^[0-9a-f]{24}$/) });
        const saved = await findOne('ensembles', res.body.id);
        expect(saved).toMatchObject({
            ...body,
            teamId,
            teamName: '진짜 이름',
            day: 4,
            due: new Date('2099-12-31T00:00:00.000Z'),
            nextDate: new Date(body.nextDate),
        });
        expect(saved).not.toHaveProperty('pin');
        expect(saved).not.toHaveProperty('type');
    });

    test('본문의 teamName·day·type은 쓰지 않는다 (B-8 D3)', async () => {
        const teamId = await insert('teams', teamDoc({ name: '진짜 이름', pin: '1234' }));
        const res = await api()
            .post('/ensemble')
            .send({ ...body, teamId, teamName: '가짜', day: 0, type: '무기한', pin: '1234' });
        const saved = await findOne('ensembles', res.body.id);
        expect(saved).toMatchObject({ teamName: '진짜 이름', day: 4 });
        expect(saved).not.toHaveProperty('type');
    });

    test('요일은 한국 날짜로: UTC로는 일요일 23시지만 한국은 월요일 8시 → day 0', async () => {
        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        const res = await api()
            .post('/ensemble')
            .send({ ...body, teamId, nextDate: '2026-11-29T23:00:00.000Z', pin: '1234' });
        expect((await findOne('ensembles', res.body.id))?.day).toBe(0);
    });

    test('PIN이 없거나 틀리면 403, 저장하지 않는다 (B-6 뒤 사용자 결정)', async () => {
        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        for (const pin of [undefined, '0000']) {
            const res = await api()
                .post('/ensemble')
                .send({ ...body, teamId, pin });
            expect([res.status, res.body]).toEqual([403, { error: 'Wrong PIN' }]);
        }
        expect(await findAll('ensembles')).toHaveLength(0);
    });

    test('마스터 PIN이면 어느 팀이든 저장', async () => {
        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        const res = await api()
            .post('/ensemble')
            .send({ ...body, teamId, pin: MASTER_PIN });
        expect(res.status).toBe(200);
        expect(await findOne('ensembles', res.body.id)).toMatchObject({ teamId });
    });

    test('팀이 없으면 마스터 PIN이어도 404, 저장하지 않는다 (B-8 B4, 이전: 마스터 PIN이면 저장)', async () => {
        for (const pin of ['1234', MASTER_PIN]) {
            const res = await api()
                .post('/ensemble')
                .send({ ...body, teamId: missingId(), pin });
            expect([res.status, res.body]).toEqual([404, { error: 'Team not found' }]);
        }
        expect(await findAll('ensembles')).toHaveLength(0);
    });

    test('팀이 없으면 PIN을 확인하지 않아 틀린 횟수에 들지 않는다', async () => {
        const res = await api()
            .post('/ensemble')
            .send({ ...body, teamId: missingId(), pin: '0000' });
        expect(res.status).toBe(404);
        expect(res.headers['pin-attempts']).toBeUndefined();
    });
});

describe('합주 본문 검사 (B-8 S5): 틀리면 400, PIN을 확인하지 않고 저장하지 않는다', () => {
    const valid = {
        startTime: 20,
        endTime: 23,
        due: '2099-12-31',
        nextDate: '2026-12-04T09:00:00.000Z',
        repeat: true,
    };
    const invalid: [string, Record<string, unknown>][] = [
        ['시간칸이 0 ~ 29 밖', { startTime: -1 }],
        ['시간칸이 0 ~ 29 밖', { endTime: 30 }],
        ['시간칸이 정수가 아님', { startTime: 1.5 }],
        ['시간칸이 숫자가 아님', { startTime: 'abc' }],
        ['시작이 끝보다 뒤', { startTime: 24, endTime: 23 }],
        ['repeat가 불리언이 아님', { repeat: 'true' }],
        ['nextDate가 시각이 아님', { nextDate: '2026-12-04' }],
        ['due가 날짜가 아님', { due: '2099-12-31T00:00:00.000Z' }],
        ['due가 없는 날짜', { due: '2026-02-30' }],
        ['칸이 빠짐', { due: undefined }],
    ];

    test.each(invalid)('잡기: %s', async (_name, over) => {
        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        const res = await api()
            .post('/ensemble')
            .send({ ...valid, ...over, teamId, pin: '0000' });
        expect([res.status, res.body.error]).toEqual([400, 'Invalid request']);
        expect(res.headers['pin-attempts']).toBeUndefined();
        expect(await findAll('ensembles')).toHaveLength(0);
    });

    test.each(invalid)('수정: %s', async (_name, over) => {
        const id = await insert('ensembles', ensembleDoc());
        const res = await api()
            .put(`/ensemble?id=${id}`)
            .send({ ...valid, ...over, pin: MASTER_PIN });
        expect([res.status, res.body.error]).toEqual([400, 'Invalid request']);
        expect(await findOne('ensembles', id)).toMatchObject({ startTime: 10, endTime: 13 });
    });

    test('잡기: teamId가 없거나 형식이 아니면 400', async () => {
        for (const teamId of [undefined, 'abc', 123]) {
            const res = await api()
                .post('/ensemble')
                .send({ ...valid, teamId, pin: MASTER_PIN });
            expect(res.status).toBe(400);
        }
    });

    test('경계: 0 ~ 29, 시작 = 끝(30분)은 저장', async () => {
        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        for (const [startTime, endTime] of [
            [0, 0],
            [29, 29],
            [0, 29],
        ]) {
            const res = await api()
                .post('/ensemble')
                .send({ ...valid, startTime, endTime, teamId, pin: '1234' });
            expect(res.status).toBe(200);
        }
    });
});

describe('DELETE /ensemble?id=', () => {
    test('지우고 { id }', async () => {
        const id = await insert('ensembles', ensembleDoc());
        const keep = await insert('ensembles', ensembleDoc());
        // ensembleDoc의 팀은 DB에 없다: 마스터 PIN만 통과
        const res = await api().delete(`/ensemble?id=${id}`).send({ pin: MASTER_PIN });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id });
        expect((await findAll('ensembles')).map((e) => String(e._id))).toEqual([keep]);
    });

    test('그 합주 팀의 PIN이 맞아야 지운다. 없거나 틀리면 403 (B-6 B1)', async () => {
        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        const id = await insert('ensembles', ensembleDoc({ teamId }));
        for (const body of [{}, { pin: '0000' }]) {
            const res = await api().delete(`/ensemble?id=${id}`).send(body);
            expect([res.status, res.body]).toEqual([403, { error: 'Wrong PIN' }]);
        }
        expect(await findAll('ensembles')).toHaveLength(1);
        expect((await api().delete(`/ensemble?id=${id}`).send({ pin: '1234' })).status).toBe(200);
    });

    test('팀이 없는 합주(삭제된 팀)는 마스터 PIN만 통과', async () => {
        const id = await insert('ensembles', ensembleDoc({ teamId: 'not-an-object-id' }));
        expect((await api().delete(`/ensemble?id=${id}`).send({ pin: '1234' })).status).toBe(403);
        expect((await api().delete(`/ensemble?id=${id}`).send({ pin: MASTER_PIN })).status).toBe(
            200,
        );
    });

    test('없으면 404 { id: -1 }, id가 없거나 형식이 아니면 400 (B-8. 이전: 없으면 404, 형식은 500)', async () => {
        const missing = await api().delete(`/ensemble?id=${missingId()}`);
        expect([missing.status, missing.body]).toEqual([404, { id: -1 }]);
        expect((await api().delete('/ensemble')).status).toBe(400);
        const bad = await api().delete('/ensemble?id=abc');
        expect([bad.status, bad.body]).toEqual([
            400,
            { error: 'Invalid request', issues: [{ path: 'id', message: 'ObjectId가 아니다' }] },
        ]);
    });
});

describe('GET /ensemble/:id (존재 확인)', () => {
    test('있으면 true, 없으면 404 false, 형식이 잘못되면 400 (B-8. 이전: 500)', async () => {
        const id = await insert('ensembles', ensembleDoc());
        const ok = await api().get(`/ensemble/${id}`);
        expect([ok.status, ok.body]).toEqual([200, true]);
        const missing = await api().get(`/ensemble/${missingId()}`);
        expect([missing.status, missing.body]).toEqual([404, false]);
        const bad = await api().get('/ensemble/abc');
        expect([bad.status, bad.body.error]).toEqual([400, 'Invalid request']);
    });
});

describe('PUT /ensemble?id=', () => {
    // 웹이 보내는 모양 (B-8). nextDate = KST 12/7(월) 12:00
    const body = {
        startTime: 4,
        endTime: 7,
        due: '2026-12-07',
        nextDate: '2026-12-07T03:00:00.000Z',
        repeat: false,
    };

    test('시간·due·nextDate·repeat를 바꾸고 day는 nextDate의 한국 요일로. 팀·teamName은 그대로 (B-8 D3)', async () => {
        const teamId = missingId();
        const id = await insert('ensembles', ensembleDoc({ teamId, teamName: '그대로', day: 2 }));
        const res = await api()
            .put(`/ensemble?id=${id}`)
            .send({
                ...body,
                teamId: missingId(),
                teamName: '무시됨',
                day: 5,
                type: '일회성',
                pin: MASTER_PIN,
            });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: 'Ensemble updated successfully', id });
        expect(await findOne('ensembles', id)).toMatchObject({
            ...body,
            teamId,
            teamName: '그대로',
            day: 0,
            due: new Date('2026-12-07T00:00:00.000Z'),
            nextDate: new Date(body.nextDate),
        });
    });

    test('그 합주 팀의 PIN이 맞아야 바꾼다. 없거나 틀리면 403 (B-6 B1)', async () => {
        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        const id = await insert('ensembles', ensembleDoc({ teamId, startTime: 10 }));
        expect((await api().put(`/ensemble?id=${id}`).send(body)).status).toBe(403);
        expect(
            (
                await api()
                    .put(`/ensemble?id=${id}`)
                    .send({ ...body, pin: '0000' })
            ).status,
        ).toBe(403);
        expect((await findOne('ensembles', id))?.startTime).toBe(10);
        expect(
            (
                await api()
                    .put(`/ensemble?id=${id}`)
                    .send({ ...body, pin: '1234' })
            ).status,
        ).toBe(200);
    });

    test('본문이 없거나 칸이 빠지면 400, 바꾸지 않는다 (B-8. 이전: 빠진 필드는 지워졌다)', async () => {
        const id = await insert('ensembles', ensembleDoc());
        expect((await api().put(`/ensemble?id=${id}`)).status).toBe(400);
        const { due: _due, ...noDue } = body;
        expect(
            (
                await api()
                    .put(`/ensemble?id=${id}`)
                    .send({ ...noDue, pin: MASTER_PIN })
            ).status,
        ).toBe(400);
        expect(await findOne('ensembles', id)).toMatchObject({ startTime: 10, type: '무기한' });
    });

    test('id가 없거나 형식이 아니면 400, 없는 합주면 (본문과 관계없이) 404', async () => {
        const noId = await api().put('/ensemble').send(body);
        expect([noId.status, noId.body.error]).toEqual([400, 'Invalid request']);
        const bad = await api().put('/ensemble?id=abc').send(body);
        expect([bad.status, bad.body.error]).toEqual([400, 'Invalid request']);
        for (const send of [body, {}]) {
            const missing = await api().put(`/ensemble?id=${missingId()}`).send(send);
            expect([missing.status, missing.body]).toEqual([404, { error: 'Ensemble not found' }]);
        }
    });
});
