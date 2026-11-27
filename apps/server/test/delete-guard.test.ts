// 삭제 API에 id가 없거나 비어 있을 때 아무것도 지우지 않는지 (B-5 O5: 조회 없이 바로 지우게 바꾸기 전에 고정)
// 조건 없는 삭제가 되지 않게 라우트가 id를 먼저 본다 (Mongoose 9의 findByIdAndDelete(undefined)는 아무것도 지우지 않지만 그것에 기대지 않음)
import { expect, test } from 'vitest';
import { api, ensembleDoc, findAll, insert, teamDoc } from './helpers.ts';

const cases = [
    { path: '/team', collection: 'teams', doc: teamDoc() },
    { path: '/ensemble', collection: 'ensembles', doc: ensembleDoc() },
    { path: '/note', collection: 'notes', doc: { text: '글', pin: '1234' } },
] as const;

for (const { path, collection, doc } of cases) {
    test(`DELETE ${path}: id가 없으면 404, 비어 있으면 500. 있는 문서를 지우지 않는다`, async () => {
        await insert(collection, { ...doc });
        const none = await api().delete(path);
        expect([none.status, none.body]).toEqual([404, { id: -1 }]);
        const empty = await api().delete(`${path}?id=`);
        expect([empty.status, empty.text]).toEqual([500, 'Internal Server Error']);
        expect(await findAll(collection)).toHaveLength(1);
    });
}

test('DELETE /notice: id가 없거나 비어 있으면 400. 있는 공지를 지우지 않는다', async () => {
    await insert('notices', { content: '공지' });
    for (const url of ['/notice', '/notice?id=']) {
        const res = await api().delete(url);
        expect([res.status, res.body]).toEqual([400, { error: 'Notice ID is required' }]);
    }
    expect(await findAll('notices')).toHaveLength(1);
});
