// 웹과 서버의 약속 (B-8): 서버가 API로 만든 데이터를 목록 API로 읽으면, 웹이 쓰는 응답 스키마(packages/shared)에 맞는다.
// 웹은 맞지 않는 항목을 화면에서 뺀다(api/index.ts의 getList). 그래서 여기서 깨지면 "만들었는데 안 보이는" 문제가 된다
import {
    apiErrorSchema,
    ensembleResponseSchema,
    noteResponseSchema,
    noticeResponseSchema,
    teamResponseSchema,
} from '@semachi/shared';
import { expect, test } from 'vitest';
import {
    api,
    ensembleBody,
    freezeTime,
    freshApi,
    insert,
    MASTER_PIN,
    teamBody,
    teamDoc,
} from './helpers.ts';

test('만든 팀·합주·날적이·공지가 목록 응답 스키마에 맞는다', async () => {
    freezeTime('2026-11-28T03:00:00Z');
    const team = await api()
        .post('/teams')
        .send(teamBody({ pin: '1234', publishDate: '2026-11-28T03:00:00.000Z' }));
    expect(team.status).toBe(201);
    for (const repeat of [true, false]) {
        const ensemble = await api()
            .post('/ensembles')
            .send(ensembleBody({ teamId: team.body.id, repeat, due: '2026-12-02', pin: '1234' }));
        expect(ensemble.status).toBe(201);
    }
    expect((await api().post('/notes').send({ text: '글', pin: '1234' })).status).toBe(201);
    expect((await api().post('/notices').send({ content: '공지', pin: MASTER_PIN })).status).toBe(
        201,
    );

    const lists = [
        ['/teams', teamResponseSchema, 1],
        ['/ensembles', ensembleResponseSchema, 2],
        ['/notes', noteResponseSchema, 1],
        ['/notices', noticeResponseSchema, 1],
    ] as const;
    for (const [path, schema, count] of lists) {
        const res = await api().get(path);
        expect(res.body).toHaveLength(count);
        for (const item of res.body) {
            const result = schema.safeParse(item);
            expect([path, result.success, result.error?.issues]).toEqual([path, true, undefined]);
        }
    }
});

test('모든 오류 응답이 공유 오류 스키마(apiErrorSchema)에 맞는다 (B-10 A1)', async () => {
    const teamId = await insert('teams', teamDoc({ pin: '1234' }));
    const guarded = freshApi({ pinLimits: { perTarget: 1 } });
    await guarded().post(`/teams/${teamId}/check-pin`).send({ pin: '0000' });
    const responses = [
        [400, await api().post('/teams').send({})],
        [401, await api().get('/admin/overview')],
        [403, await api().delete(`/teams/${teamId}`).send({ pin: '0000' })],
        [404, await api().get('/nope')],
        [429, await guarded().post(`/teams/${teamId}/check-pin`).send({ pin: '1234' })],
    ] as const;
    for (const [status, res] of responses) {
        expect(res.status).toBe(status);
        expect(apiErrorSchema.safeParse(res.body).success).toBe(true);
    }
});
