// 기존 평문 PIN을 해시로 바꾸기 (B-6 S4). 한 번만 실행하는 스크립트(scripts/hash-pins.ts)가 쓴다
// - 운영 전환(B-14) 때만: 바꾸고 나면 옛 서버(api.js)는 평문으로 비교하므로 PIN 확인이 모두 틀린다
// - 되돌릴 수 없다 (해시에서 PIN을 되살릴 수 없음) → 실행 전에 DB 백업 (사전 결정 9)
// - 기본은 세어 보기만 (apply: false)
// - 이미 해시인 것은 건너뛴다 (두 번 실행해도 같음). 바꾸는 동안 PIN이 바뀐 문서는 건드리지 않는다
import type mongoose from 'mongoose';
import { hashPin, isHashedPin } from './pin.ts';

type Db = NonNullable<mongoose.Connection['db']>;

export const PIN_COLLECTIONS = ['teams', 'notes'] as const;

export interface PinMigrationCount {
    collection: (typeof PIN_COLLECTIONS)[number];
    /** 평문 PIN (바꿀 것) */
    plain: number;
    /** 이미 해시 */
    hashed: number;
    /** PIN이 없음 (옛 데이터) */
    empty: number;
    /** 실제로 바꾼 수 (apply일 때) */
    changed: number;
}

export async function hashPlainPins(db: Db, { apply }: { apply: boolean }) {
    const counts: PinMigrationCount[] = [];
    for (const collection of PIN_COLLECTIONS) {
        const docs = await db
            .collection(collection)
            .find({}, { projection: { pin: 1 } })
            .toArray();
        const count: PinMigrationCount = { collection, plain: 0, hashed: 0, empty: 0, changed: 0 };
        for (const doc of docs) {
            const pin: unknown = doc.pin;
            if (typeof pin !== 'string' || pin === '') {
                count.empty++;
            } else if (isHashedPin(pin)) {
                count.hashed++;
            } else {
                count.plain++;
                if (apply) {
                    // 읽은 뒤 PIN이 바뀌었으면(그새 다른 요청) 건드리지 않는다
                    const result = await db
                        .collection(collection)
                        .updateOne({ _id: doc._id, pin }, { $set: { pin: await hashPin(pin) } });
                    count.changed += result.modifiedCount;
                }
            }
        }
        counts.push(count);
    }
    return counts;
}
