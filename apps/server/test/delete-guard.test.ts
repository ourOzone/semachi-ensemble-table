// 삭제 API에 id가 없거나 이상할 때 아무것도 지우지 않는지 (B-5 O5: 조회 없이 바로 지우게 바꾸기 전에 고정)
// 조건 없는 삭제가 되지 않게 라우트가 id를 먼저 본다 (Mongoose 9의 findByIdAndDelete(undefined)는 아무것도 지우지 않지만 그것에 기대지 않음)
// B-10 (A2): id는 주소 안에(/teams/:id). id 없는 주소(DELETE /teams)는 없는 경로라 404, 형식이 아니면 DB에 묻지 않고 400
import { expect, test } from 'vitest';
import { api, ensembleDoc, findAll, insert, MASTER_PIN, teamDoc } from './helpers.ts';

const cases = [
    { path: '/teams', collection: 'teams', doc: teamDoc() },
    { path: '/ensembles', collection: 'ensembles', doc: ensembleDoc() },
    { path: '/notes', collection: 'notes', doc: { text: '글', pin: '1234' } },
    { path: '/notices', collection: 'notices', doc: { content: '공지' } },
] as const;

for (const { path, collection, doc } of cases) {
    test(`DELETE ${path}: id 없는 주소는 404, 형식이 아니면 400. 있는 문서를 지우지 않는다`, async () => {
        await insert(collection, { ...doc });
        const checks: [string, number, string][] = [
            [path, 404, 'NOT_FOUND'],
            [`${path}/`, 404, 'NOT_FOUND'],
            [`${path}/abc`, 400, 'INVALID_REQUEST'],
            [`${path}?id=abc`, 404, 'NOT_FOUND'], // 옛 모양(?id=)은 이제 없는 경로
        ];
        for (const [url, status, code] of checks) {
            const res = await api().delete(url).send({ pin: MASTER_PIN });
            expect([url, res.status, res.body.error.code]).toEqual([url, status, code]);
        }
        expect(await findAll(collection)).toHaveLength(1);
    });
}
