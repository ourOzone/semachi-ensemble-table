// 합주의 옛 type 필드('무기한'·'일회성')를 지우기 (백엔드 개편 B-8 D3, 사용자 결정). scripts/remove-ensemble-type.ts가 쓴다
// - 새 서버는 type을 쓰지도 읽지도 않는다 (repeat·due로 나타냄). 옛 서버(api.js)·옛 웹도 type을 읽지 않는다
//   → 언제 지워도 화면은 같지만, 사용자 결정대로 운영 전환(B-14)의 서버를 내린 시간에 백업 뒤 한 번 실행한다
// - 기본은 세어 보기만 (apply: false). 두 번 실행해도 같다 (이미 없으면 건너뜀)
// - 되돌리기: 백업(mongodump)에서 복원. type은 repeat에서 다시 만들 수도 있다 (repeat true → '무기한', false → '일회성')
import type mongoose from 'mongoose';

type Db = NonNullable<mongoose.Connection['db']>;

export interface EnsembleTypeCount {
    /** 합주 전체 */
    total: number;
    /** type이 있는 합주 (지울 것) */
    withType: number;
    /** 그중 repeat와 맞지 않는 것 (참고: 옛 데이터의 어긋남, 지우는 데 영향 없음) */
    mismatched: number;
    /** 실제로 지운 수 (apply일 때) */
    removed: number;
}

export async function removeEnsembleType(
    db: Db,
    { apply }: { apply: boolean },
): Promise<EnsembleTypeCount> {
    const ensembles = db.collection('ensembles');
    const withTypeFilter = { type: { $exists: true } };
    const count: EnsembleTypeCount = {
        total: await ensembles.countDocuments(),
        withType: await ensembles.countDocuments(withTypeFilter),
        mismatched: await ensembles.countDocuments({
            $or: [
                { repeat: true, type: { $exists: true, $ne: '무기한' } },
                { repeat: false, type: { $exists: true, $ne: '일회성' } },
            ],
        }),
        removed: 0,
    };
    if (apply) {
        const result = await ensembles.updateMany(withTypeFilter, { $unset: { type: '' } });
        count.removed = result.modifiedCount;
    }
    return count;
}
