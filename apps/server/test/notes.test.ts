// 날적이(note) API의 지금 동작 (GET /notes, DELETE /note, POST /note, GET /note/:id, POST /check-note-pin)
// "현재 동작:"은 이상해 보이지만 그대로 고정한 것. 고치는 단계는 docs/BACKEND_PLAN.md
import { describe, expect, test } from 'vitest';
import { api, findAll, findOne, insert, MASTER_PIN, missingId } from './helpers.ts';

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

describe('POST /note', () => {
    test('저장하고 { id }. PIN은 평문 (S4)', async () => {
        const res = await api().post('/note').send({ text: '한 줄', pin: '4321' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: expect.stringMatching(/^[0-9a-f]{24}$/) });
        expect(await findOne('notes', res.body.id)).toMatchObject({ text: '한 줄', pin: '4321' });
    });

    test('현재 동작: 검사 없이 빈 본문·긴 글도 저장한다 (S5)', async () => {
        expect((await api().post('/note').send({})).status).toBe(200);
        expect(
            (
                await api()
                    .post('/note')
                    .send({ text: 'x'.repeat(10_000), pin: '1' })
            ).status,
        ).toBe(200);
        expect(await findAll('notes')).toHaveLength(2);
    });
});

describe('DELETE /note?id=', () => {
    test('지우고 { id }', async () => {
        const id = await insert('notes', noteDoc());
        const res = await api().delete(`/note?id=${id}`).send({ pin: '1234' });
        expect([res.status, res.body]).toEqual([200, { id }]);
        expect(await findAll('notes')).toHaveLength(0);
    });

    test('PIN이 없거나 틀리면 403, 지우지 않는다. 마스터 PIN은 통과 (B-6 B1)', async () => {
        const id = await insert('notes', noteDoc({ pin: '1234' }));
        for (const body of [{}, { pin: '0000' }]) {
            const res = await api().delete(`/note?id=${id}`).send(body);
            expect([res.status, res.body]).toEqual([403, { error: 'Wrong PIN' }]);
        }
        expect(await findAll('notes')).toHaveLength(1);
        expect((await api().delete(`/note?id=${id}`).send({ pin: MASTER_PIN })).status).toBe(200);
    });

    test('없으면 404 { id: -1 } (id가 없어도), 형식이 잘못되면 500 (텍스트)', async () => {
        const missing = await api().delete(`/note?id=${missingId()}`);
        expect([missing.status, missing.body]).toEqual([404, { id: -1 }]);
        expect((await api().delete('/note')).status).toBe(404);
        const bad = await api().delete('/note?id=abc');
        expect([bad.status, bad.text]).toEqual([500, 'Internal Server Error']);
    });
});

describe('GET /note/:id (존재 확인)', () => {
    test('있으면 true, 없으면 404 false, 형식이 잘못되면 500', async () => {
        const id = await insert('notes', noteDoc());
        const ok = await api().get(`/note/${id}`);
        expect([ok.status, ok.body]).toEqual([200, true]);
        const missing = await api().get(`/note/${missingId()}`);
        expect([missing.status, missing.body]).toEqual([404, false]);
        const bad = await api().get('/note/abc');
        expect([bad.status, bad.body]).toEqual([500, { error: 'Internal Server Error' }]);
    });
});

describe('POST /check-note-pin', () => {
    test('글 PIN이 맞으면 true, 틀리면 false (숫자는 문자열과 다름)', async () => {
        const id = await insert('notes', noteDoc({ pin: '1234' }));
        expect((await api().post('/check-note-pin').send({ noteId: id, pin: '1234' })).body).toBe(
            true,
        );
        expect((await api().post('/check-note-pin').send({ noteId: id, pin: '0000' })).body).toBe(
            false,
        );
        expect((await api().post('/check-note-pin').send({ noteId: id, pin: 1234 })).body).toBe(
            false,
        );
    });

    test('마스터 PIN이면 글을 찾지 않고 true', async () => {
        expect(
            (await api().post('/check-note-pin').send({ noteId: 'abc', pin: MASTER_PIN })).body,
        ).toBe(true);
    });

    test('noteId나 pin이 없으면 400, 없는 글이면 404, 형식이 잘못되면 500', async () => {
        const noPin = await api().post('/check-note-pin').send({ noteId: missingId() });
        expect([noPin.status, noPin.body]).toEqual([
            400,
            { error: 'Both noteId and pin are required' },
        ]);
        const missing = await api()
            .post('/check-note-pin')
            .send({ noteId: missingId(), pin: '1234' });
        expect([missing.status, missing.body]).toEqual([404, { error: 'Note not found' }]);
        const bad = await api().post('/check-note-pin').send({ noteId: 'abc', pin: '1234' });
        expect([bad.status, bad.body]).toEqual([500, { error: 'Internal Server Error' }]);
    });
});
