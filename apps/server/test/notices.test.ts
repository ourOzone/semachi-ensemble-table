// 공지 API의 동작 (GET·POST /notices, GET·DELETE /notices/:id, POST /notices/check-pin)
// "현재 동작:"은 이상해 보이지만 그대로 고정한 것. 고치는 단계는 docs/BACKEND_PLAN.md
import { describe, expect, test } from 'vitest';
import {
    apiError,
    api,
    findAll,
    findOne,
    freezeTime,
    insert,
    MASTER_PIN,
    missingId,
} from './helpers.ts';

const noticeDoc = (over: Record<string, unknown> = {}) => ({
    content: '공지',
    publishDate: new Date('2026-11-01T03:00:00.000Z'),
    __v: 0,
    ...over,
});

describe('POST /notices', () => {
    test('201 { id }. 올린 시각(publishDate)은 서버의 지금', async () => {
        freezeTime('2026-11-27T05:06:07.000Z');
        const res = await api()
            .post('/notices')
            .send({ content: '새 공지', publishDate: '2000-01-01', pin: MASTER_PIN });
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ id: expect.stringMatching(/^[0-9a-f]{24}$/) });
        expect(await findOne('notices', res.body.id)).toMatchObject({
            content: '새 공지',
            publishDate: new Date('2026-11-27T05:06:07.000Z'),
        });
    });

    test('마스터 PIN이 없거나 틀리면 403, 올리지 않는다 (B-6 B1)', async () => {
        for (const body of [{ content: '누구나' }, { content: '누구나', pin: '0000' }]) {
            const res = await api().post('/notices').send(body);
            expect([res.status, res.body]).toEqual([403, apiError('WRONG_PIN')]);
        }
        expect(await findAll('notices')).toHaveLength(0);
    });

    test('내용이 없거나 비었거나 공백만 있으면 400 (B-8. 이전: 공백만 있는 글은 올라갔다)', async () => {
        for (const body of [
            {},
            { content: '' },
            { content: '   ', pin: MASTER_PIN },
            { content: 1 },
        ]) {
            const res = await api().post('/notices').send(body);
            expect([res.status, res.body.error.code]).toEqual([400, 'INVALID_REQUEST']);
        }
        expect(await findAll('notices')).toHaveLength(0);
    });

    test('앞뒤 공백을 빼고 저장한다. 길이 제한은 없다', async () => {
        const long = '공'.repeat(5000);
        const res = await api()
            .post('/notices')
            .send({ content: ` ${long}\n`, pin: MASTER_PIN });
        expect(res.status).toBe(201);
        expect((await findOne('notices', res.body.id))?.content).toBe(long);
    });
});

describe('GET /notices', () => {
    test('최근에 넣은 것부터, 저장된 필드 그대로', async () => {
        const a = await insert('notices', noticeDoc({ content: '먼저' }));
        const b = await insert('notices', noticeDoc({ content: '나중' }));
        const res = await api().get('/notices');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            { _id: b, content: '나중', publishDate: '2026-11-01T03:00:00.000Z', __v: 0 },
            { _id: a, content: '먼저', publishDate: '2026-11-01T03:00:00.000Z', __v: 0 },
        ]);
    });
});

describe('DELETE /notices/:id', () => {
    test('지우고 204 (본문 없음, B-10)', async () => {
        const id = await insert('notices', noticeDoc());
        const res = await api().delete(`/notices/${id}`).send({ pin: MASTER_PIN });
        expect([res.status, res.text]).toEqual([204, '']);
        expect(await findAll('notices')).toHaveLength(0);
    });

    test('마스터 PIN이 없거나 틀리면 403, 지우지 않는다 (B-6 B1)', async () => {
        const id = await insert('notices', noticeDoc());
        expect((await api().delete(`/notices/${id}`)).status).toBe(403);
        expect((await api().delete(`/notices/${id}`).send({ pin: '0000' })).status).toBe(403);
        expect(await findAll('notices')).toHaveLength(1);
    });

    test('id 없는 주소는 404, 형식이 아니면 400, 없는 공지면 404 (PIN보다 먼저, B-10)', async () => {
        const noId = await api().delete('/notices');
        expect([noId.status, noId.body.error.code]).toEqual([404, 'NOT_FOUND']); // id 없는 주소는 없는 경로 (B-10)
        for (const pin of [MASTER_PIN, '0000']) {
            const missing = await api().delete(`/notices/${missingId()}`).send({ pin });
            expect([missing.status, missing.body]).toEqual([404, apiError('NOT_FOUND')]);
        }
        const bad = await api().delete('/notices/abc').send({ pin: MASTER_PIN });
        expect([bad.status, bad.body.error.code]).toEqual([400, 'INVALID_REQUEST']);
    });
});

describe('POST /notices/check-pin', () => {
    test('마스터 PIN이면 true, 아니면 false. 숫자로 보내면 400 (B-8. 이전: 문자열과 달라 false)', async () => {
        expect((await api().post('/notices/check-pin').send({ pin: MASTER_PIN })).body).toBe(true);
        expect((await api().post('/notices/check-pin').send({ pin: '0000' })).body).toBe(false);
        expect(
            (
                await api()
                    .post('/notices/check-pin')
                    .send({ pin: Number(MASTER_PIN) })
            ).status,
        ).toBe(400);
    });

    test('pin이 없으면 400', async () => {
        const res = await api().post('/notices/check-pin').send({});
        expect([res.status, res.body.error.code]).toEqual([400, 'INVALID_REQUEST']);
    });
});

describe('GET /notices/:id (한 공지)', () => {
    test('있으면 그 공지, 없으면 404, 형식이 잘못되면 400 (B-10. 이전: 있는지만 true/false)', async () => {
        const id = await insert('notices', noticeDoc());
        const ok = await api().get(`/notices/${id}`);
        expect([ok.status, ok.body._id]).toEqual([200, id]);
        const missing = await api().get(`/notices/${missingId()}`);
        expect([missing.status, missing.body]).toEqual([404, apiError('NOT_FOUND')]);
        const bad = await api().get('/notices/abc');
        expect([bad.status, bad.body.error.code]).toEqual([400, 'INVALID_REQUEST']);
    });
});
