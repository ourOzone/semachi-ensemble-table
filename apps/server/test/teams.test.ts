// 팀 API의 동작 (GET /teams, POST /team, POST /check-team-pin, DELETE /team, DELETE /teams, PUT /team, GET /team/:id)
// "현재 동작:"은 이상해 보이지만 그대로 고정한 것. 고치는 단계는 docs/BACKEND_PLAN.md
import { SETLIST_MAX, TEAM_MEMBER_MAX, TEAM_NAME_MAX } from '@semachi/shared';
import { describe, expect, test } from 'vitest';
import {
    api,
    ensembleDoc,
    findAll,
    findOne,
    insert,
    MASTER_PIN,
    missingId,
    teamBody,
    teamDoc,
} from './helpers.ts';

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

    test('이름·팀원은 앞뒤 공백을 빼고 저장, 셋리스트는 그대로 (웹과 같음)', async () => {
        const res = await api()
            .post('/team')
            .send({ ...body, name: ' 새 팀 ', desc: [' v ', '', '', '', '', '', ' set\n'] });
        expect(await findOne('teams', res.body.id)).toMatchObject({
            name: '새 팀',
            desc: ['v', '', '', '', '', '', ' set\n'],
        });
    });

    test('길이 제한까지는 저장: 팀명 20자·팀원 12자·셋리스트 200자 (웹과 같은 값, B-8)', async () => {
        const desc = [
            ...Array<string>(6).fill('가'.repeat(TEAM_MEMBER_MAX)),
            'x'.repeat(SETLIST_MAX),
        ];
        const res = await api()
            .post('/team')
            .send({ ...body, name: '가'.repeat(TEAM_NAME_MAX), desc });
        expect(res.status).toBe(200);
    });

    test('옛 팀 종류도 그대로 받는다 (종류는 문자열이면 된다, 사용자 결정)', async () => {
        const res = await api()
            .post('/team')
            .send({ ...body, type: '세마치공연(정기/연말)' });
        expect((await findOne('teams', res.body.id))?.type).toBe('세마치공연(정기/연말)');
    });

    test.each([
        ['빈 본문', {}],
        ['팀명이 비었음', { name: '  ' }],
        ['팀명 21자', { name: '가'.repeat(TEAM_NAME_MAX + 1) }],
        ['종류가 비었음', { type: '' }],
        ['종류가 문자열이 아님', { type: 1 }],
        ['desc가 7칸이 아님', { desc: ['v'] }],
        ['desc가 비었음', { desc: [] }],
        ['팀원 13자', { desc: ['가'.repeat(TEAM_MEMBER_MAX + 1), '', '', '', '', '', ''] }],
        ['셋리스트 201자', { desc: ['', '', '', '', '', '', 'x'.repeat(SETLIST_MAX + 1)] }],
        ['PIN이 없음', { pin: undefined }],
        ['PIN이 숫자 4자리가 아님', { pin: '12345' }],
        ['PIN이 문자열이 아님', { pin: 1234 }],
        ['publishDate가 시각이 아님', { publishDate: 'not a date' }],
    ])(
        '400, 저장하지 않는다 (B-8 S5, 이전: 검사 없이 저장·날짜는 500): %s',
        async (_name, over) => {
            const res = await api()
                .post('/team')
                .send(Object.keys(over).length ? { ...body, ...over } : {});
            expect([res.status, res.body.error]).toEqual([400, 'Invalid request']);
            expect(await findAll('teams')).toHaveLength(0);
        },
    );

    test('400 본문에는 틀린 칸과 이유만 있고 받은 값은 없다', async () => {
        const res = await api()
            .post('/team')
            .send({ ...body, pin: '98765' });
        expect(res.body).toEqual({
            error: 'Invalid request',
            issues: [{ path: 'pin', message: '숫자 4자리가 아니다' }],
        });
        expect(JSON.stringify(res.body)).not.toContain('98765');
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

    test('마스터 PIN이면 팀을 찾지 않고 true (없는 팀도)', async () => {
        expect(
            (await api().post('/check-team-pin').send({ teamId: missingId(), pin: MASTER_PIN }))
                .body,
        ).toBe(true);
    });

    test('PIN을 숫자로 보내면 400 (B-8. 이전: 문자열 "1234"와 달라 false)', async () => {
        const id = await insert('teams', teamDoc({ pin: '1234' }));
        expect((await api().post('/check-team-pin').send({ teamId: id, pin: 1234 })).status).toBe(
            400,
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
        expect(res.body.error).toBe('Invalid request');
        expect((await api().post('/check-team-pin').send({ pin: '1234' })).status).toBe(400);
        expect(
            (await api().post('/check-team-pin').send({ teamId: missingId(), pin: '' })).status,
        ).toBe(400);
    });

    test('본문 없이 보내도 400 (빈 본문으로 본다)', async () => {
        const res = await api().post('/check-team-pin');
        expect([res.status, res.body.error]).toEqual([400, 'Invalid request']);
    });

    test('없는 팀이면 404', async () => {
        const res = await api().post('/check-team-pin').send({ teamId: missingId(), pin: '1234' });
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Team not found' });
    });

    test('id 형식이 잘못되면 마스터 PIN이어도 400 (B-8. 이전: 마스터 PIN이면 true, 아니면 500)', async () => {
        for (const pin of ['1234', MASTER_PIN]) {
            const res = await api().post('/check-team-pin').send({ teamId: 'abc', pin });
            expect([res.status, res.body.error]).toEqual([400, 'Invalid request']);
        }
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

    test('id가 없거나 형식이 아니면 400 (B-8. 이전: 없으면 404, 형식은 500)', async () => {
        expect((await api().delete('/team')).status).toBe(400);
        expect((await api().delete('/team?id=abc')).status).toBe(400);
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

    test('본문이 없거나 칸이 빠지면 400, 바꾸지 않는다 (B-8. 이전: 빠진 필드는 지워졌다)', async () => {
        const id = await insert('teams', teamDoc());
        for (const body of [{ pin: '1234' }, { name: '이름만', pin: '1234' }]) {
            const res = await api().put(`/team?id=${id}`).send(body);
            expect([res.status, res.body.error]).toEqual([400, 'Invalid request']);
        }
        expect(await findOne('teams', id)).toMatchObject({ name: '테스트밴드', type: '교내 공연' });
    });

    test('본문이 틀리면 PIN을 확인하지 않는다 (틀린 횟수에 들지 않음)', async () => {
        const id = await insert('teams', teamDoc());
        const res = await api().put(`/team?id=${id}`).send({ name: '', pin: '0000' });
        expect(res.status).toBe(400);
        expect(res.headers['pin-attempts']).toBeUndefined();
    });

    test('PIN이 없거나 틀리면 403, 바꾸지 않는다 (B-6 B1)', async () => {
        const id = await insert('teams', teamDoc({ name: '그대로', pin: '1234' }));
        const res = await api()
            .put(`/team?id=${id}`)
            .send(teamBody({ pin: '0000' }));
        expect([res.status, res.body]).toEqual([403, { error: 'Wrong PIN' }]);
        expect((await api().put(`/team?id=${id}`).send(teamBody())).status).toBe(403);
        expect((await findOne('teams', id))?.name).toBe('그대로');
    });

    test('없는 팀이면 (본문과 관계없이) 404', async () => {
        const res = await api().put(`/team?id=${missingId()}`).send({ name: 'x' });
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Team not found' });
    });

    test('id가 없거나 형식이 아니면 400 (B-8. 이전: 없으면 404, 형식은 500)', async () => {
        expect((await api().put('/team').send(teamBody())).status).toBe(400);
        expect((await api().put('/team?id=abc').send(teamBody())).status).toBe(400);
    });
});

describe('GET /team/:id (존재 확인)', () => {
    test('있으면 true, 없으면 404 false, 형식이 잘못되면 400 (B-8. 이전: 500)', async () => {
        const id = await insert('teams', teamDoc());
        const ok = await api().get(`/team/${id}`);
        expect([ok.status, ok.body]).toEqual([200, true]);
        const missing = await api().get(`/team/${missingId()}`);
        expect([missing.status, missing.body]).toEqual([404, false]);
        const bad = await api().get('/team/abc');
        expect([bad.status, bad.body.error]).toEqual([400, 'Invalid request']);
    });
});
