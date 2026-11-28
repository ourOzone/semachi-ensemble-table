// 합주의 옛 type 필드 지우기 (scripts/remove-ensemble-type.ts, B-8 D3). 메모리 DB로만 확인한다 (실행은 운영 전환 때)
import mongoose from 'mongoose';
import { expect, test } from 'vitest';
import { removeEnsembleType } from '../src/lib/ensemble-type-migration.ts';
import { ensembleDoc, findAll, insert } from './helpers.ts';

const db = () => mongoose.connection.db!;

async function seed() {
    await insert('ensembles', ensembleDoc({ repeat: true, type: '무기한' }));
    await insert('ensembles', ensembleDoc({ repeat: false, type: '일회성' }));
    // 옛 데이터의 어긋남: 반복인데 '일회성'
    await insert('ensembles', ensembleDoc({ repeat: true, type: '일회성' }));
    // 새 서버가 만든 합주 (type 없음)
    await insert('ensembles', ensembleDoc({ type: undefined }));
}

test('기본은 세어 보기만: DB를 바꾸지 않는다', async () => {
    await seed();
    expect(await removeEnsembleType(db(), { apply: false })).toEqual({
        total: 4,
        withType: 3,
        mismatched: 1,
        removed: 0,
    });
    expect((await findAll('ensembles')).filter((e) => 'type' in e)).toHaveLength(3);
});

test('--apply: type만 지우고 다른 필드는 그대로. 두 번 실행해도 같다', async () => {
    await seed();
    const before = await findAll('ensembles');
    expect((await removeEnsembleType(db(), { apply: true })).removed).toBe(3);

    const after = await findAll('ensembles');
    expect(after.every((e) => !('type' in e))).toBe(true);
    expect(after.map(({ type: _t, ...rest }) => rest)).toEqual(
        before.map(({ type: _t, ...rest }) => rest),
    );

    expect(await removeEnsembleType(db(), { apply: true })).toEqual({
        total: 4,
        withType: 0,
        mismatched: 0,
        removed: 0,
    });
});
