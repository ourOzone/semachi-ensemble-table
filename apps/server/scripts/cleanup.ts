// 정리 작업을 손으로 한 번 돌리는 스크립트 (B-9). 운영 첫 실행(B-14) 전에 무엇이 지워질지 먼저 세어 보는 용도
//
//   세어 보기만:   node --env-file=<.env 경로> scripts/cleanup.ts
//   실제로 지우기: node --env-file=<.env 경로> scripts/cleanup.ts --apply
//
// - 지울 팀은 이름·자동 삭제 날짜·합주 수를, 합주는 개수만 보여 준다 (PIN 등 다른 값은 출력하지 않는다)
// - 서버(CLEANUP_ENABLED=true)는 매일 04:00에 같은 일을 한다. 이 스크립트는 서버를 켜기 전 확인·첫 실행용
// - 되돌리기: 백업(mongodump)에서 복원. 지운 내용은 활동 기록(team.expire·ensemble.expire)에도 남는다
import mongoose from 'mongoose';
import { pino } from 'pino';
import { cleanupExpired, summarize } from '../src/jobs/cleanup.ts';
import { createSystemActivityRecorder } from '../src/lib/activity.ts';

const apply = process.argv.includes('--apply');
const uri = process.env.MONGO_DB;
if (!uri) {
    console.error('MONGO_DB가 없습니다. --env-file로 .env를 넘겨 주세요');
    process.exit(1);
}

await mongoose.connect(uri);
const record = createSystemActivityRecorder({
    env: process.env.APP_ENV || 'script',
    logger: pino(),
});
const result = await cleanupExpired({ now: new Date(), apply, record });
await mongoose.disconnect();

if (result.teams.length > 0) {
    console.log(apply ? '지운 팀:' : '지울 팀:');
    console.table(result.teams.map(({ name, due, ensembles }) => ({ name, due, ensembles })));
}
console.table([summarize(result)]);
console.log(
    apply
        ? '지웠습니다. 지운 내용은 관리자 화면의 활동 기록(팀·합주 자동 삭제)에서 볼 수 있습니다.'
        : '세어 보기만 했습니다. 지우려면 백업한 뒤 --apply를 붙여 다시 실행하세요.',
);
