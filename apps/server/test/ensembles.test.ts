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
    const body = {
        teamId: '6650a1b2c3d4e5f607182930',
        teamName: '테스트밴드',
        startTime: 20,
        endTime: 23,
        day: 4,
        type: '무기한',
        due: '2099-12-31T00:00:00.000Z',
        nextDate: '2026-12-04T09:00:00.000Z',
        repeat: true,
    };

    test('그 팀의 PIN이 맞으면 저장하고 { id }. 저장된 값에 PIN은 없다', async () => {
        const teamId = await insert('teams', teamDoc({ pin: '1234' }));
        const res = await api()
            .post('/ensemble')
            .send({ ...body, teamId, pin: '1234' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: expect.stringMatching(/^[0-9a-f]{24}$/) });
        const saved = await findOne('ensembles', res.body.id);
        expect(saved).toMatchObject({
            ...body,
            teamId,
            due: new Date(body.due),
            nextDate: new Date(body.nextDate),
        });
        expect(saved).not.toHaveProperty('pin');
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

    test('마스터 PIN이면 저장 (팀이 없어도: ISSUES B4는 마스터 PIN일 때만 남는다)', async () => {
        const res = await api()
            .post('/ensemble')
            .send({ ...body, pin: MASTER_PIN });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: expect.stringMatching(/^[0-9a-f]{24}$/) });
        expect(await findOne('ensembles', res.body.id)).toMatchObject({
            ...body,
            due: new Date(body.due),
            nextDate: new Date(body.nextDate),
        });
    });

    test('없는 팀이면 마스터 PIN만 통과한다. 현재 동작: 범위·겹침 검사는 없다 (S5)', async () => {
        const badRange = { ...body, teamId: missingId(), startTime: 99, endTime: -1, day: 9 };
        expect(
            (
                await api()
                    .post('/ensemble')
                    .send({ ...badRange, pin: '1234' })
            ).status,
        ).toBe(403);
        const res = await api()
            .post('/ensemble')
            .send({ ...badRange, pin: MASTER_PIN });
        expect(res.status).toBe(200);
        expect(await findAll('ensembles')).toHaveLength(1);
    });

    test('현재 동작: 마스터 PIN만 있는 빈 본문도 저장한다', async () => {
        const res = await api().post('/ensemble').send({ pin: MASTER_PIN });
        expect(res.status).toBe(200);
        expect(Object.keys((await findOne('ensembles', res.body.id)) ?? {}).sort()).toEqual([
            '__v',
            '_id',
            'createdAt',
            'updatedAt',
        ]);
    });

    test('숫자 칸에 숫자가 아닌 값이면 500 (텍스트)', async () => {
        const res = await api()
            .post('/ensemble')
            .send({ ...body, startTime: 'abc', pin: MASTER_PIN });
        expect(res.status).toBe(500);
        expect(res.text).toBe('Internal Server Error');
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

    test('없으면 404 { id: -1 } (id가 없어도), 형식이 잘못되면 500 (텍스트)', async () => {
        const missing = await api().delete(`/ensemble?id=${missingId()}`);
        expect([missing.status, missing.body]).toEqual([404, { id: -1 }]);
        expect((await api().delete('/ensemble')).status).toBe(404);
        const bad = await api().delete('/ensemble?id=abc');
        expect([bad.status, bad.text]).toEqual([500, 'Internal Server Error']);
    });
});

describe('GET /ensemble/:id (존재 확인)', () => {
    test('있으면 true, 없으면 404 false, 형식이 잘못되면 500', async () => {
        const id = await insert('ensembles', ensembleDoc());
        const ok = await api().get(`/ensemble/${id}`);
        expect([ok.status, ok.body]).toEqual([200, true]);
        const missing = await api().get(`/ensemble/${missingId()}`);
        expect([missing.status, missing.body]).toEqual([404, false]);
        const bad = await api().get('/ensemble/abc');
        expect([bad.status, bad.body]).toEqual([500, { error: 'Internal Server Error' }]);
    });
});

describe('PUT /ensemble?id=', () => {
    const body = {
        teamId: '6650a1b2c3d4e5f607182930',
        startTime: 4,
        endTime: 7,
        day: 0,
        type: '일회성',
        due: '2026-12-31T00:00:00.000Z',
        nextDate: '2026-12-07T03:00:00.000Z',
        repeat: false,
    };

    test('teamId·시간·요일·종류·due·nextDate·repeat를 바꾼다. teamName은 그대로', async () => {
        const id = await insert('ensembles', ensembleDoc({ teamName: '그대로' }));
        const res = await api()
            .put(`/ensemble?id=${id}`)
            .send({ ...body, teamName: '무시됨', pin: MASTER_PIN });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: 'Ensemble updated successfully', id });
        expect(await findOne('ensembles', id)).toMatchObject({
            ...body,
            teamName: '그대로',
            due: new Date(body.due),
            nextDate: new Date(body.nextDate),
        });
    });

    test('현재 동작: 본문에 빠진 필드는 지워진다 (teamName만 남음)', async () => {
        const id = await insert('ensembles', ensembleDoc());
        await api().put(`/ensemble?id=${id}`).send({ pin: MASTER_PIN });
        const saved = await findOne('ensembles', id);
        expect(Object.keys(saved ?? {}).sort()).toEqual(['__v', '_id', 'teamName', 'updatedAt']);
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

    test('본문 없이 보내면 PIN이 없어 403 (빈 본문으로 본다)', async () => {
        const id = await insert('ensembles', ensembleDoc());
        expect((await api().put(`/ensemble?id=${id}`)).status).toBe(403);
    });

    test('id가 없으면 400, 없는 합주면 404, 형식이 잘못되면 500 (JSON)', async () => {
        const noId = await api().put('/ensemble').send(body);
        expect([noId.status, noId.body]).toEqual([400, { error: 'Ensemble ID is required' }]);
        const missing = await api().put(`/ensemble?id=${missingId()}`).send(body);
        expect([missing.status, missing.body]).toEqual([404, { error: 'Ensemble not found' }]);
        const bad = await api().put('/ensemble?id=abc').send(body);
        expect([bad.status, bad.body]).toEqual([500, { error: 'Internal Server Error' }]);
    });
});
