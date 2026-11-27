// 기존 평문 PIN을 해시로 바꾸는 한 번짜리 스크립트 (B-6 S4). 운영 전환(B-14) 때 DB 백업 뒤에 실행한다
//
//   세어 보기만:   node --env-file=<.env 경로> scripts/hash-pins.ts
//   실제로 바꾸기: node --env-file=<.env 경로> scripts/hash-pins.ts --apply
//
// - 되돌릴 수 없다. 바꾼 뒤 옛 서버(api.js)는 PIN 확인이 모두 틀린다 → 새 서버로 바꾼 뒤에만
// - 바꾼 뒤 새 서버는 PIN_HASH=true로 켠다 (새로 만드는 PIN도 해시로). 꺼 두어도 확인은 된다 (평문·해시 둘 다 읽음)
// - PIN 값은 출력하지 않는다. 개수만
import mongoose from 'mongoose';
import { hashPlainPins } from '../src/lib/pin-migration.ts';

const apply = process.argv.includes('--apply');
const uri = process.env.MONGO_DB;
if (!uri) {
    console.error('MONGO_DB가 없습니다. --env-file로 .env를 넘겨 주세요');
    process.exit(1);
}

await mongoose.connect(uri);
const counts = await hashPlainPins(mongoose.connection.db!, { apply });
await mongoose.disconnect();

console.table(counts);
if (apply) {
    console.log('평문 PIN을 해시로 바꿨습니다. 서버를 PIN_HASH=true로 다시 켜 주세요.');
} else {
    console.log('세어 보기만 했습니다. 바꾸려면 백업한 뒤 --apply를 붙여 다시 실행하세요.');
}
