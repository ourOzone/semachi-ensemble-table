// 삭제 API에 id가 없거나 비어 있을 때 아무것도 지우지 않는지 (B-5 O5: 조회 없이 바로 지우게 바꾸기 전에 고정)
// 조건 없는 삭제가 되지 않게 라우트가 id를 먼저 본다 (Mongoose 9의 findByIdAndDelete(undefined)는 아무것도 지우지 않지만 그것에 기대지 않음)
// B-8 (S5): id가 없거나 비었거나 형식이 아니면 DB에 묻지 않고 400 (이전: 팀·합주·날적이는 없으면 404·비면 500, 공지는 400)
import { expect, test } from 'vitest';
import { api, ensembleDoc, findAll, insert, MASTER_PIN, teamDoc } from './helpers.ts';

const cases = [
    { path: '/team', collection: 'teams', doc: teamDoc() },
    { path: '/ensemble', collection: 'ensembles', doc: ensembleDoc() },
    { path: '/note', collection: 'notes', doc: { text: '글', pin: '1234' } },
    { path: '/notice', collection: 'notices', doc: { content: '공지' } },
] as const;

for (const { path, collection, doc } of cases) {
    test(`DELETE ${path}: id가 없거나 비었거나 형식이 아니면 400. 있는 문서를 지우지 않는다`, async () => {
        await insert(collection, { ...doc });
        for (const url of [path, `${path}?id=`, `${path}?id=abc`, `${path}?id=a&id=b`]) {
            const res = await api().delete(url).send({ pin: MASTER_PIN });
            expect([url, res.status, res.body.error]).toEqual([url, 400, 'Invalid request']);
        }
        expect(await findAll(collection)).toHaveLength(1);
    });
}
