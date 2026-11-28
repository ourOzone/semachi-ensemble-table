// 합주의 옛 type 필드를 지우는 한 번짜리 스크립트 (B-8 D3, 사용자 결정). 운영 전환(B-14) 때 DB 백업 뒤에 실행한다
//
//   세어 보기만:   node --env-file=<.env 경로> scripts/remove-ensemble-type.ts
//   실제로 지우기: node --env-file=<.env 경로> scripts/remove-ensemble-type.ts --apply
//
// - 새 서버·옛 서버·옛 웹 모두 type을 읽지 않아 화면은 그대로다 (src/lib/ensemble-type-migration.ts)
// - 되돌리기: 백업에서 복원
// - 개수만 출력한다
import mongoose from 'mongoose';
import { removeEnsembleType } from '../src/lib/ensemble-type-migration.ts';

const apply = process.argv.includes('--apply');
const uri = process.env.MONGO_DB;
if (!uri) {
    console.error('MONGO_DB가 없습니다. --env-file로 .env를 넘겨 주세요');
    process.exit(1);
}

await mongoose.connect(uri);
const count = await removeEnsembleType(mongoose.connection.db!, { apply });
await mongoose.disconnect();

console.table([count]);
if (apply) {
    console.log(`합주 ${count.removed}개에서 type을 지웠습니다.`);
} else {
    console.log('세어 보기만 했습니다. 지우려면 백업한 뒤 --apply를 붙여 다시 실행하세요.');
}
