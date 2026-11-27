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
    settledLog,
    waitForLog,
    resetLog,
} from './helpers.ts';

const VID = '0b8a5c7e-1f2d-4c3b-9a8e-7d6c5b4a3f21';
const logLine = (action: string) =>
    new RegExp(`^${VID}_\\d{4}\\.\\d{2}\\.\\d{2}:\\d{2}:\\d{2}_${action}$`, 'm');

describe('GET /ensembles', () => {
    // 서버 시간대 UTC(vitest 설정). "오늘"은 서버 시간대의 0시 = 2026-11-27T00:00Z (KST 09:00)
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

    test('반복 합주: 반복 종료 날짜(due)가 오늘 0시보다 앞이면 뺀다. 없거나 null이어도 넣는다', async () => {
        freezeTime(NOW);
        await insert(
            'ensembles',
            ensembleDoc({ teamName: '계속', due: new Date('2099-12-31T00:00:00Z') }),
        );
        await insert('ensembles', ensembleDoc({ teamName: 'due 없음', due: undefined }));
        await insert('ensembles', ensembleDoc({ teamName: 'due null', due: null }));
        await insert(
            'ensembles',
            ensembleDoc({ teamName: '오늘 0시', due: new Date('2026-11-27T00:00:00Z') }),
        );
        await insert(
            'ensembles',
            ensembleDoc({ teamName: '어제 끝', due: new Date('2026-11-26T23:59:59.999Z') }),
        );
        // 반복 합주는 nextDate가 지났어도 넣는다 (다음 날짜는 웹이 계산)
        await insert(
            'ensembles',
            ensembleDoc({ teamName: '지난 nextDate', nextDate: new Date('2026-01-01T00:00:00Z') }),
        );
        expect(await names()).toEqual([
            '계속',
            'due 없음',
            'due null',
            '오늘 0시',
            '지난 nextDate',
        ]);
    });

    test('일회성 합주: 날짜(nextDate)가 오늘 0시 이후면 넣는다', async () => {
        freezeTime(NOW);
        const once = { repeat: false, type: '일회성' };
        await insert(
            'ensembles',
            ensembleDoc({
                ...once,
                teamName: '오늘 0시',
                nextDate: new Date('2026-11-27T00:00:00Z'),
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
                nextDate: new Date('2026-11-26T23:59:59.999Z'),
            }),
        );
        // 일회성은 due와 관계없다 (nextDate는 미래)
        await insert(
            'ensembles',
            ensembleDoc({ ...once, teamName: '지난 due', due: new Date('2020-01-01T00:00:00Z') }),
        );
        expect(await names()).toEqual(['오늘 0시', '미래', '지난 due']);
    });

    test('현재 동작 (서버 UTC): KST로 오늘 오전 9시 전에 시작하는 일회성 합주는 9시(UTC 0시)부터 빠진다 (D1)', async () => {
        const once = { repeat: false, type: '일회성', teamName: 'KST 08:00 합주' };
        // KST 11/27 08:00 = 11/26 23:00Z
        await insert(
            'ensembles',
            ensembleDoc({ ...once, nextDate: new Date('2026-11-26T23:00:00Z') }),
        );
        freezeTime('2026-11-26T23:30:00Z'); // KST 11/27 08:30
        expect(await names()).toEqual(['KST 08:00 합주']);
        freezeTime('2026-11-27T00:30:00Z'); // KST 11/27 09:30, 같은 날인데 빠진다
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

    test('로그에 남기지 않는다', async () => {
        await resetLog();
        await api().get('/ensembles');
        expect(await settledLog()).toBe('');
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

    test('저장하고 { id }', async () => {
        const res = await api().post('/ensemble').send(body);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: expect.stringMatching(/^[0-9a-f]{24}$/) });
        expect(await findOne('ensembles', res.body.id)).toMatchObject({
            ...body,
            due: new Date(body.due),
            nextDate: new Date(body.nextDate),
        });
    });

    test('현재 동작: 팀이 있는지 확인하지 않는다 (ISSUES B4), 범위·겹침 검사도 없다 (S5)', async () => {
        const res = await api()
            .post('/ensemble')
            .send({ ...body, teamId: missingId(), startTime: 99, endTime: -1, day: 9 });
        expect(res.status).toBe(200);
        expect(await findAll('ensembles')).toHaveLength(1);
    });

    test('현재 동작: 빈 본문도 저장한다', async () => {
        const res = await api().post('/ensemble').send({});
        expect(res.status).toBe(200);
        expect(Object.keys((await findOne('ensembles', res.body.id)) ?? {}).sort()).toEqual([
            '__v',
            '_id',
        ]);
    });

    test('숫자 칸에 숫자가 아닌 값이면 500 (텍스트)', async () => {
        const res = await api()
            .post('/ensemble')
            .send({ ...body, startTime: 'abc' });
        expect(res.status).toBe(500);
        expect(res.text).toBe('Internal Server Error');
    });

    test('addensemble_팀이름을 로그에 남긴다 (본문의 teamName)', async () => {
        await resetLog();
        await api().post('/ensemble').set('Cookie', `semachi_vid=${VID}`).send(body);
        await waitForLog(logLine('addensemble_테스트밴드'));
    });
});

describe('DELETE /ensemble?id=', () => {
    test('지우고 { id }', async () => {
        const id = await insert('ensembles', ensembleDoc());
        const keep = await insert('ensembles', ensembleDoc());
        const res = await api().delete(`/ensemble?id=${id}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id });
        expect((await findAll('ensembles')).map((e) => String(e._id))).toEqual([keep]);
    });

    test('없으면 404 { id: -1 } (id가 없어도), 형식이 잘못되면 500 (텍스트)', async () => {
        const missing = await api().delete(`/ensemble?id=${missingId()}`);
        expect([missing.status, missing.body]).toEqual([404, { id: -1 }]);
        expect((await api().delete('/ensemble')).status).toBe(404);
        const bad = await api().delete('/ensemble?id=abc');
        expect([bad.status, bad.text]).toEqual([500, 'Internal Server Error']);
    });

    test('deleteensemble_팀이름을 로그에 남긴다', async () => {
        const id = await insert('ensembles', ensembleDoc({ teamName: '지울 팀' }));
        await resetLog();
        await api().delete(`/ensemble?id=${id}`).set('Cookie', `semachi_vid=${VID}`);
        await waitForLog(logLine('deleteensemble_지울 팀'));
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
            .send({ ...body, teamName: '무시됨' });
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
        await api().put(`/ensemble?id=${id}`).send({});
        const saved = await findOne('ensembles', id);
        expect(Object.keys(saved ?? {}).sort()).toEqual(['__v', '_id', 'teamName']);
    });

    test('현재 동작: PIN 없이 바꾼다 (B1), 로그에 남기지 않는다', async () => {
        const id = await insert('ensembles', ensembleDoc());
        await resetLog();
        expect((await api().put(`/ensemble?id=${id}`).send(body)).status).toBe(200);
        expect(await settledLog()).toBe('');
    });

    test('본문 없이 보내면 모든 필드를 지운다 (빈 본문으로 본다)', async () => {
        const id = await insert('ensembles', ensembleDoc());
        expect((await api().put(`/ensemble?id=${id}`)).status).toBe(200);
        expect(Object.keys((await findOne('ensembles', id)) ?? {}).sort()).toEqual([
            '__v',
            '_id',
            'teamName',
        ]);
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
