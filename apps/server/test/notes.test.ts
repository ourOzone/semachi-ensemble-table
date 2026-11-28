// 날적이(note) API의 동작 (GET·POST /notes, GET·DELETE /notes/:id, POST /notes/:id/check-pin)
// "현재 동작:"은 이상해 보이지만 그대로 고정한 것. 고치는 단계는 docs/BACKEND_PLAN.md
import { NOTE_TEXT_MAX } from '@semachi/shared';
import { describe, expect, test } from 'vitest';
import { apiError, api, findAll, findOne, insert, MASTER_PIN, missingId } from './helpers.ts';

const noteDoc = (over: Record<string, unknown> = {}) => ({
    text: '안녕',
    pin: '1234',
    __v: 0,
    ...over,
});

describe('GET /notes', () => {
    test('최근에 넣은 것부터, PIN만 빼고 저장된 필드 그대로 (B-6 B3)', async () => {
        const a = await insert('notes', noteDoc({ text: '먼저' }));
        const b = await insert('notes', noteDoc({ text: '나중' }));
        const res = await api().get('/notes');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            { _id: b, text: '나중', __v: 0 },
            { _id: a, text: '먼저', __v: 0 },
        ]);
    });

    test('개수 제한·자동 삭제 없음 (D4·D5 해결 후), 조회는', async () => {
        for (let i = 0; i < 120; i++) await insert('notes', noteDoc({ text: String(i) }));
        const res = await api().get('/notes');
        expect(res.body).toHaveLength(120);
        expect(await findAll('notes')).toHaveLength(120);
    });
});

describe('POST /notes', () => {
    test('저장하고 201 { id }. PIN은 평문 (S4)', async () => {
        const res = await api().post('/notes').send({ text: '한 줄', pin: '4321' });
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ id: expect.stringMatching(/^[0-9a-f]{24}$/) });
        expect(await findOne('notes', res.body.id)).toMatchObject({ text: '한 줄', pin: '4321' });
    });

    test('글은 앞뒤 공백을 빼고 저장한다. 200자까지 (웹과 같은 제한, B-8 S5)', async () => {
        const res = await api()
            .post('/notes')
            .send({ text: `  ${'가'.repeat(NOTE_TEXT_MAX)}\n `, pin: '4321' });
        expect(res.status).toBe(201);
        expect((await findOne('notes', res.body.id))?.text).toBe('가'.repeat(NOTE_TEXT_MAX));
    });

    test.each([
        ['빈 본문', {}],
        ['공백만', { text: ' \n ', pin: '1234' }],
        ['201자', { text: 'x'.repeat(NOTE_TEXT_MAX + 1), pin: '1234' }],
        ['글이 문자열이 아님', { text: 1, pin: '1234' }],
        ['PIN이 없음', { text: '글' }],
        ['PIN이 숫자 4자리가 아님', { text: '글', pin: '123' }],
        ['PIN이 숫자 4자리가 아님', { text: '글', pin: '12a4' }],
        ['PIN이 문자열이 아님', { text: '글', pin: 1234 }],
    ])('400, 저장하지 않는다 (B-8 S5, 이전: 검사 없이 저장): %s', async (_name, body) => {
        const res = await api().post('/notes').send(body);
        expect([res.status, res.body.error.code]).toEqual([400, 'INVALID_REQUEST']);
        expect(await findAll('notes')).toHaveLength(0);
    });
});

describe('DELETE /notes/:id', () => {
    test('지우고 204 (본문 없음, B-10)', async () => {
        const id = await insert('notes', noteDoc());
        const res = await api().delete(`/notes/${id}`).send({ pin: '1234' });
        expect([res.status, res.text]).toEqual([204, '']);
        expect(await findAll('notes')).toHaveLength(0);
    });

    test('PIN이 없거나 틀리면 403, 지우지 않는다. 마스터 PIN은 통과 (B-6 B1)', async () => {
        const id = await insert('notes', noteDoc({ pin: '1234' }));
        for (const body of [{}, { pin: '0000' }]) {
            const res = await api().delete(`/notes/${id}`).send(body);
            expect([res.status, res.body]).toEqual([403, apiError('WRONG_PIN')]);
        }
        expect(await findAll('notes')).toHaveLength(1);
        expect((await api().delete(`/notes/${id}`).send({ pin: MASTER_PIN })).status).toBe(204);
    });

    test('없으면 404, 형식이 아니면 400, id 없는 주소는 없는 경로 (B-10)', async () => {
        const missing = await api().delete(`/notes/${missingId()}`);
        expect([missing.status, missing.body]).toEqual([404, apiError('NOT_FOUND')]);
        expect((await api().delete('/notes')).status).toBe(404); // id 없는 주소는 없는 경로 (B-10);
        expect((await api().delete('/notes/abc')).status).toBe(400);
    });
});

describe('GET /notes/:id (한 글)', () => {
    test('있으면 그 글(PIN 없이), 없으면 404, 형식이 잘못되면 400 (B-10. 이전: 있는지만 true/false)', async () => {
        const id = await insert('notes', noteDoc());
        const ok = await api().get(`/notes/${id}`);
        expect([ok.status, ok.body._id]).toEqual([200, id]);
        expect(ok.body).not.toHaveProperty('pin');
        const missing = await api().get(`/notes/${missingId()}`);
        expect([missing.status, missing.body]).toEqual([404, apiError('NOT_FOUND')]);
        const bad = await api().get('/notes/abc');
        expect([bad.status, bad.body.error.code]).toEqual([400, 'INVALID_REQUEST']);
    });
});

describe('POST /notes/:id/check-pin', () => {
    test('글 PIN이 맞으면 true, 틀리면 false. 숫자로 보내면 400 (B-8. 이전: 문자열과 달라 false)', async () => {
        const id = await insert('notes', noteDoc({ pin: '1234' }));
        expect((await api().post(`/notes/${id}/check-pin`).send({ pin: '1234' })).body).toBe(true);
        expect((await api().post(`/notes/${id}/check-pin`).send({ pin: '0000' })).body).toBe(false);
        expect((await api().post(`/notes/${id}/check-pin`).send({ pin: 1234 })).status).toBe(400);
    });

    test('마스터 PIN이면 글을 찾지 않고 true (없는 글도)', async () => {
        expect(
            (await api().post(`/notes/${missingId()}/check-pin`).send({ pin: MASTER_PIN })).body,
        ).toBe(true);
    });

    test('pin이 없거나 id 형식이 아니면 400, 없는 글이면 404', async () => {
        const noPin = await api().post(`/notes/${missingId()}/check-pin`).send({});
        expect([noPin.status, noPin.body]).toEqual([
            400,
            apiError('INVALID_REQUEST', { issues: [{ path: 'pin', message: expect.any(String) }] }),
        ]);
        const missing = await api().post(`/notes/${missingId()}/check-pin`).send({ pin: '1234' });
        expect([missing.status, missing.body]).toEqual([404, apiError('NOT_FOUND')]);
        const bad = await api().post(`/notes/${'abc'}/check-pin`).send({ pin: '1234' });
        expect([bad.status, bad.body.error.code]).toEqual([400, 'INVALID_REQUEST']);
    });
});
