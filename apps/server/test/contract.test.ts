// 웹과 서버의 약속 (B-8): 서버가 API로 만든 데이터를 목록 API로 읽으면, 웹이 쓰는 응답 스키마(packages/shared)에 맞는다.
// 웹은 맞지 않는 항목을 화면에서 뺀다(api/index.ts의 getList). 그래서 여기서 깨지면 "만들었는데 안 보이는" 문제가 된다
import {
    ensembleResponseSchema,
    noteResponseSchema,
    noticeResponseSchema,
    teamResponseSchema,
} from '@semachi/shared';
import { expect, test } from 'vitest';
import { api, ensembleBody, freezeTime, MASTER_PIN, teamBody } from './helpers.ts';

test('만든 팀·합주·날적이·공지가 목록 응답 스키마에 맞는다', async () => {
    freezeTime('2026-11-28T03:00:00Z');
    const team = await api()
        .post('/team')
        .send(teamBody({ pin: '1234', publishDate: '2026-11-28T03:00:00.000Z' }));
    expect(team.status).toBe(200);
    for (const repeat of [true, false]) {
        const ensemble = await api()
            .post('/ensemble')
            .send(ensembleBody({ teamId: team.body.id, repeat, due: '2026-12-02', pin: '1234' }));
        expect(ensemble.status).toBe(200);
    }
    expect((await api().post('/note').send({ text: '글', pin: '1234' })).status).toBe(200);
    expect((await api().post('/notice').send({ content: '공지', pin: MASTER_PIN })).status).toBe(
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
