// 팀 API의 지금 동작 (GET /teams, POST /team, POST /check-team-pin, DELETE /team, DELETE /teams, PUT /team, GET /team/:id)
// "현재 동작:"은 이상해 보이지만 그대로 고정한 것. 고치는 단계는 docs/BACKEND_PLAN.md
import { describe, expect, test } from 'vitest';
import {
    api,
    ensembleDoc,
    findAll,
    findOne,
    insert,
    MASTER_PIN,
    missingId,
    settledLog,
    teamDoc,
    waitForLog,
    resetLog,
} from './helpers.ts';

const VID = '0b8a5c7e-1f2d-4c3b-9a8e-7d6c5b4a3f21';
const logLine = (action: string) =>
    new RegExp(`^${VID}_\\d{4}\\.\\d{2}\\.\\d{2}:\\d{2}:\\d{2}_${action}$`, 'm');

describe('GET /teams', () => {
    test('모든 팀을 넣은 순서대로, PIN만 빼고 저장된 필드 그대로 (B-6 B3)', async () => {
        const a = await insert('teams', teamDoc({ name: 'A' }));
        const b = await insert('teams', teamDoc({ name: 'B', type: '세마치공연(정기/연말)' }));
        const res = await api().get('/teams');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            {
                _id: a,
                name: 'A',
                desc: ['보컬', '기타', '베이스', '드럼', '키보드', '매니저', '셋리스트'],
                type: '교내 공연',
                publishDate: '2026-11-01T03:00:00.000Z',
                __v: 0,
            },
            expect.objectContaining({ _id: b, name: 'B', type: '세마치공연(정기/연말)' }),
        ]);
        expect(res.body[1]).not.toHaveProperty('pin');
    });

    test('빈 목록', async () => {
        const res = await api().get('/teams');
        expect(res.body).toEqual([]);
    });

    test('DB에 있으면 스키마에 없는 필드(due 등)도 그대로 보낸다', async () => {
        await insert('teams', teamDoc({ due: new Date('2026-12-31T00:00:00Z'), extra: 1 }));
        const res = await api().get('/teams');
        expect(res.body[0]).toMatchObject({ due: '2026-12-31T00:00:00.000Z', extra: 1 });
    });

    test('방문할 때마다 pageload를 로그에 남긴다 (O2)', async () => {
        await resetLog();
        await api().get('/teams').set('Cookie', `semachi_vid=${VID}`);
        await waitForLog(logLine('pageload'));
    });
});

describe('POST /team', () => {
    const body = {
        type: '교내 공연',
        name: '새 팀',
        desc: ['v', 'g', 'b', 'd', 'k', 'm', 'set'],
        pin: '4321',
        publishDate: '2026-11-27T01:02:03.000Z',
    };

    test('저장하고 { id }를 돌려준다. PIN은 해시 저장을 켜기 전까지 평문 (S4, 사전 결정 10)', async () => {
        const res = await api().post('/team').send(body);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: expect.stringMatching(/^[0-9a-f]{24}$/) });
        const saved = await findOne('teams', res.body.id);
        expect(saved).toMatchObject({ ...body, publishDate: new Date(body.publishDate) });
    });

    test('스키마에 없는 필드는 버린다 (due 포함)', async () => {
        const res = await api()
            .post('/team')
            .send({ ...body, due: '2026-12-31', extra: 1 });
        const saved = await findOne('teams', res.body.id);
        expect(saved).not.toHaveProperty('due');
        expect(saved).not.toHaveProperty('extra');
    });

    test('현재 동작: 검사 없이 빈 본문도 저장한다 (S5)', async () => {
        const res = await api().post('/team').send({});
        expect(res.status).toBe(200);
        const saved = await findOne('teams', res.body.id);
        expect(Object.keys(saved ?? {}).sort()).toEqual([
            '__v',
            '_id',
            'createdAt',
            'desc',
            'updatedAt',
        ]);
        expect(saved?.desc).toEqual([]);
    });

    test('형식이 맞지 않는 값(날짜)은 500 (텍스트)', async () => {
        const res = await api()
            .post('/team')
            .send({ ...body, publishDate: 'not a date' });
        expect(res.status).toBe(500);
        expect(res.text).toBe('Internal Server Error');
        expect(await findAll('teams')).toHaveLength(0);
    });

    test('숫자 PIN은 문자열로 바뀌어 저장된다', async () => {
        const res = await api()
            .post('/team')
            .send({ ...body, pin: 1234 });
        expect((await findOne('teams', res.body.id))?.pin).toBe('1234');
    });

    test('addteam_팀이름을 로그에 남긴다', async () => {
        await resetLog();
        await api().post('/team').set('Cookie', `semachi_vid=${VID}`).send(body);
        await waitForLog(logLine('addteam_새 팀'));
    });
});

describe('POST /check-team-pin', () => {
    test('팀 PIN이 맞으면 true, 틀리면 false', async () => {
        const id = await insert('teams', teamDoc({ pin: '1234' }));
        expect((await api().post('/check-team-pin').send({ teamId: id, pin: '1234' })).body).toBe(
            true,
        );
        expect((await api().post('/check-team-pin').send({ teamId: id, pin: '0000' })).body).toBe(
            false,
        );
    });

    test('마스터 PIN이면 팀을 찾지 않고 true (없는 팀·잘못된 id도)', async () => {
        expect(
            (await api().post('/check-team-pin').send({ teamId: missingId(), pin: MASTER_PIN }))
                .body,
        ).toBe(true);
        expect(
            (await api().post('/check-team-pin').send({ teamId: 'abc', pin: MASTER_PIN })).body,
        ).toBe(true);
    });

    test('형식까지 같아야 맞다: 숫자 1234는 문자열 "1234"와 다르다', async () => {
        const id = await insert('teams', teamDoc({ pin: '1234' }));
        expect((await api().post('/check-team-pin').send({ teamId: id, pin: 1234 })).body).toBe(
            false,
        );
    });

    test('PIN이 없는 팀(옛 데이터)은 어떤 PIN이든 false', async () => {
        const id = await insert('teams', teamDoc({ pin: undefined }));
        expect((await api().post('/check-team-pin').send({ teamId: id, pin: '1234' })).body).toBe(
            false,
        );
    });

    test('teamId나 pin이 없으면 400', async () => {
        const res = await api().post('/check-team-pin').send({ teamId: missingId() });
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'Both teamId and pin are required' });
        expect((await api().post('/check-team-pin').send({ pin: '1234' })).status).toBe(400);
        expect(
            (await api().post('/check-team-pin').send({ teamId: missingId(), pin: '' })).status,
        ).toBe(400);
    });

    test('본문 없이 보내도 400 (빈 본문으로 본다)', async () => {
        const res = await api().post('/check-team-pin');
        expect([res.status, res.body]).toEqual([
            400,
            { error: 'Both teamId and pin are required' },
        ]);
    });

    test('없는 팀이면 404', async () => {
        const res = await api().post('/check-team-pin').send({ teamId: missingId(), pin: '1234' });
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Team not found' });
    });

    test('id 형식이 잘못되면 500 (JSON)', async () => {
        const res = await api().post('/check-team-pin').send({ teamId: 'abc', pin: '1234' });
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Internal Server Error' });
    });

    test('로그에 남기지 않는다 (시도 횟수 제한은 pin-limit.test.ts)', async () => {
        const id = await insert('teams', teamDoc({ pin: '1234' }));
        await resetLog();
        await api().post('/check-team-pin').send({ teamId: id, pin: '0000' });
        expect(await settledLog()).toBe('');
    });
});

describe('DELETE /team?id=', () => {
    test('팀과 그 팀의 합주를 지우고 { id } (다른 팀 합주는 그대로)', async () => {
        const id = await insert('teams', teamDoc());
        const other = await insert('teams', teamDoc({ name: '다른 팀' }));
        await insert('ensembles', ensembleDoc({ teamId: id }));
        await insert('ensembles', ensembleDoc({ teamId: id }));
        await insert('ensembles', ensembleDoc({ teamId: other }));

        const res = await api().delete(`/team?id=${id}`).send({ pin: '1234' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id });
        expect((await findAll('teams')).map((t) => String(t._id))).toEqual([other]);
        expect((await findAll('ensembles')).map((e) => e.teamId)).toEqual([other]);
    });

    test('PIN이 없거나 틀리면 403, 지우지 않는다. 마스터 PIN은 통과 (B-6 B1)', async () => {
        const id = await insert('teams', teamDoc({ pin: '1234' }));
        for (const body of [{}, { pin: '0000' }, { pin: 1234 }]) {
            const res = await api().delete(`/team?id=${id}`).send(body);
            expect([res.status, res.body]).toEqual([403, { error: 'Wrong PIN' }]);
        }
        expect(await findAll('teams')).toHaveLength(1);
        expect((await api().delete(`/team?id=${id}`).send({ pin: MASTER_PIN })).status).toBe(200);
    });

    test('없는 팀이면 404 { id: -1 }', async () => {
        const res = await api().delete(`/team?id=${missingId()}`);
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ id: -1 });
    });

    test('id가 없으면 404 { id: -1 }', async () => {
        const res = await api().delete('/team');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ id: -1 });
    });

    test('id 형식이 잘못되면 500 (텍스트)', async () => {
        const res = await api().delete('/team?id=abc');
        expect(res.status).toBe(500);
        expect(res.text).toBe('Internal Server Error');
    });

    test('deleteteam_팀이름을 로그에 남긴다', async () => {
        const id = await insert('teams', teamDoc({ name: '지울 팀' }));
        await resetLog();
        await api()
            .delete(`/team?id=${id}`)
            .set('Cookie', `semachi_vid=${VID}`)
            .send({ pin: '1234' });
        await waitForLog(logLine('deleteteam_지울 팀'));
    });
});

describe('DELETE /teams (B-5 B2에서 삭제)', () => {
    test('없는 경로라 404이고, 팀을 지우지 않는다', async () => {
        await insert('teams', teamDoc());
        const res = await api().delete('/teams');
        expect(res.status).toBe(404);
        expect(await findAll('teams')).toHaveLength(1);
    });
});

describe('PUT /team?id=', () => {
    test('이름·멤버·종류를 바꾸고, 그 팀 합주의 teamName도 바꾼다. 저장된 PIN·publishDate는 그대로', async () => {
        const id = await insert('teams', teamDoc({ name: '옛 이름' }));
        const e = await insert('ensembles', ensembleDoc({ teamId: id, teamName: '옛 이름' }));
        const other = await insert('ensembles', ensembleDoc({ teamName: '다른 팀' }));

        const res = await api()
            .put(`/team?id=${id}`)
            .send({
                name: '새 이름',
                desc: ['1', '2', '3', '4', '5', '6', '7'],
                type: '외부 공연',
                pin: MASTER_PIN, // 본문의 pin은 확인에만 쓰고 저장하지 않는다
            });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id });

        const saved = await findOne('teams', id);
        expect(saved).toMatchObject({
            name: '새 이름',
            desc: ['1', '2', '3', '4', '5', '6', '7'],
            type: '외부 공연',
            pin: '1234',
            publishDate: new Date('2026-11-01T03:00:00.000Z'),
        });
        expect((await findOne('ensembles', e))?.teamName).toBe('새 이름');
        expect((await findOne('ensembles', other))?.teamName).toBe('다른 팀');
    });

    test('현재 동작: 본문에 빠진 필드(name·desc·type)는 지워진다', async () => {
        const id = await insert('teams', teamDoc());
        const e = await insert('ensembles', ensembleDoc({ teamId: id }));
        await api().put(`/team?id=${id}`).send({ pin: '1234' });
        const saved = await findOne('teams', id);
        expect(Object.keys(saved ?? {}).sort()).toEqual([
            '__v',
            '_id',
            'pin',
            'publishDate',
            'updatedAt',
        ]);
        // 합주의 teamName은 그대로 (Mongoose가 $set의 undefined를 버린다)
        expect((await findOne('ensembles', e))?.teamName).toBe('테스트밴드');
    });

    test('PIN이 없거나 틀리면 403, 바꾸지 않는다 (B-6 B1)', async () => {
        const id = await insert('teams', teamDoc({ name: '그대로', pin: '1234' }));
        const res = await api().put(`/team?id=${id}`).send({ name: 'x', pin: '0000' });
        expect([res.status, res.body]).toEqual([403, { error: 'Wrong PIN' }]);
        expect((await api().put(`/team?id=${id}`).send({ name: 'x' })).status).toBe(403);
        expect((await findOne('teams', id))?.name).toBe('그대로');
    });

    test('없는 팀이면 404', async () => {
        const res = await api().put(`/team?id=${missingId()}`).send({ name: 'x' });
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Team not found' });
    });

    test('id가 없으면 404, 형식이 잘못되면 500 (JSON)', async () => {
        expect((await api().put('/team').send({ name: 'x' })).status).toBe(404);
        const bad = await api().put('/team?id=abc').send({ name: 'x' });
        expect(bad.status).toBe(500);
        expect(bad.body).toEqual({ error: 'Internal Server Error' });
    });

    test('modifyteam_바꾸기 전 이름을 로그에 남긴다', async () => {
        const id = await insert('teams', teamDoc({ name: '옛 이름' }));
        await resetLog();
        await api()
            .put(`/team?id=${id}`)
            .set('Cookie', `semachi_vid=${VID}`)
            .send({ name: '새 이름', pin: '1234' });
        await waitForLog(logLine('modifyteam_옛 이름'));
    });
});

describe('GET /team/:id (존재 확인)', () => {
    test('있으면 true, 없으면 404 false, 형식이 잘못되면 500', async () => {
        const id = await insert('teams', teamDoc());
        const ok = await api().get(`/team/${id}`);
        expect([ok.status, ok.body]).toEqual([200, true]);
        const missing = await api().get(`/team/${missingId()}`);
        expect([missing.status, missing.body]).toEqual([404, false]);
        const bad = await api().get('/team/abc');
        expect([bad.status, bad.body]).toEqual([500, { error: 'Internal Server Error' }]);
    });
});
