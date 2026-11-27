// 공지 API의 지금 동작 (POST /notice, GET /notices, DELETE /notice, POST /check-notice-pin, GET /notice/:id)
// "현재 동작:"은 이상해 보이지만 그대로 고정한 것. 고치는 단계는 docs/BACKEND_PLAN.md
import { describe, expect, test } from 'vitest';
import {
    api,
    findAll,
    findOne,
    freezeTime,
    insert,
    MASTER_PIN,
    missingId,
    settledLog,
    resetLog,
} from './helpers.ts';

const noticeDoc = (over: Record<string, unknown> = {}) => ({
    content: '공지',
    publishDate: new Date('2026-11-01T03:00:00.000Z'),
    __v: 0,
    ...over,
});

describe('POST /notice', () => {
    test('201 { message, id }. 올린 시각(publishDate)은 서버의 지금', async () => {
        freezeTime('2026-11-27T05:06:07.000Z');
        const res = await api()
            .post('/notice')
            .send({ content: '새 공지', publishDate: '2000-01-01', pin: MASTER_PIN });
        expect(res.status).toBe(201);
        expect(res.body).toEqual({
            message: 'Notice created',
            id: expect.stringMatching(/^[0-9a-f]{24}$/),
        });
        expect(await findOne('notices', res.body.id)).toMatchObject({
            content: '새 공지',
            publishDate: new Date('2026-11-27T05:06:07.000Z'),
        });
    });

    test('마스터 PIN이 없거나 틀리면 403, 올리지 않는다 (B-6 B1). 로그에 남기지 않는다', async () => {
        await resetLog();
        for (const body of [{ content: '누구나' }, { content: '누구나', pin: '0000' }]) {
            const res = await api().post('/notice').send(body);
            expect([res.status, res.body]).toEqual([403, { error: 'Wrong PIN' }]);
        }
        expect(await findAll('notices')).toHaveLength(0);
        expect(await settledLog()).toBe('');
    });

    test('내용이 없거나 빈 문자열이면 400 (공백만 있는 글은 통과)', async () => {
        const res = await api().post('/notice').send({});
        expect([res.status, res.body]).toEqual([400, { error: 'Content are required' }]);
        expect((await api().post('/notice').send({ content: '' })).status).toBe(400);
        expect((await api().post('/notice').send({ content: '   ', pin: MASTER_PIN })).status).toBe(
            201,
        );
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

describe('DELETE /notice?id=', () => {
    test('지우고 200 { message }', async () => {
        const id = await insert('notices', noticeDoc());
        const res = await api().delete(`/notice?id=${id}`).send({ pin: MASTER_PIN });
        expect([res.status, res.body]).toEqual([200, { message: 'Notice deleted successfully' }]);
        expect(await findAll('notices')).toHaveLength(0);
    });

    test('마스터 PIN이 없거나 틀리면 403, 지우지 않는다 (B-6 B1). 로그에 남기지 않는다', async () => {
        const id = await insert('notices', noticeDoc());
        await resetLog();
        expect((await api().delete(`/notice?id=${id}`)).status).toBe(403);
        expect((await api().delete(`/notice?id=${id}`).send({ pin: '0000' })).status).toBe(403);
        expect(await findAll('notices')).toHaveLength(1);
        expect(await settledLog()).toBe('');
    });

    test('id가 없으면 400, 없는 공지면 404, 형식이 잘못되면 500 (JSON)', async () => {
        const noId = await api().delete('/notice');
        expect([noId.status, noId.body]).toEqual([400, { error: 'Notice ID is required' }]);
        const missing = await api().delete(`/notice?id=${missingId()}`).send({ pin: MASTER_PIN });
        expect([missing.status, missing.body]).toEqual([404, { error: 'Notice not found' }]);
        const bad = await api().delete('/notice?id=abc').send({ pin: MASTER_PIN });
        expect([bad.status, bad.body]).toEqual([500, { error: 'Internal Server Error' }]);
    });
});

describe('POST /check-notice-pin', () => {
    test('마스터 PIN이면 true, 아니면 false (숫자는 문자열과 다름)', async () => {
        expect((await api().post('/check-notice-pin').send({ pin: MASTER_PIN })).body).toBe(true);
        expect((await api().post('/check-notice-pin').send({ pin: '0000' })).body).toBe(false);
        expect(
            (
                await api()
                    .post('/check-notice-pin')
                    .send({ pin: Number(MASTER_PIN) })
            ).body,
        ).toBe(false);
    });

    test('pin이 없으면 400', async () => {
        const res = await api().post('/check-notice-pin').send({});
        expect([res.status, res.body]).toEqual([400, { error: 'Pin is required' }]);
    });
});

describe('GET /notice/:id (존재 확인)', () => {
    test('있으면 true, 없으면 404 false, 형식이 잘못되면 500', async () => {
        const id = await insert('notices', noticeDoc());
        const ok = await api().get(`/notice/${id}`);
        expect([ok.status, ok.body]).toEqual([200, true]);
        const missing = await api().get(`/notice/${missingId()}`);
        expect([missing.status, missing.body]).toEqual([404, false]);
        const bad = await api().get('/notice/abc');
        expect([bad.status, bad.body]).toEqual([500, { error: 'Internal Server Error' }]);
    });
});
