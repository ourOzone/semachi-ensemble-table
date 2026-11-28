import mongoose from 'mongoose';

// 활동 기록 (B-7): 사용자가 무엇을 했는지 한 건씩. 관리자만 본다 (routes/admin.ts)
// 실명은 몰라도 "이 행동을 한 사람이 누구일지" 짐작할 수 있게: 방문자 id·IP·기기·어떤 PIN(팀 PIN인지 마스터 PIN인지, 값은 절대 없음)
// 1년 뒤 MongoDB가 자동으로 지운다 (TTL 인덱스). 기간을 바꾸면 운영 DB의 인덱스도 바꿔야 한다 (collMod)
export const ACTIVITY_RETENTION_DAYS = 365;

/** 무엇을 했는지 (action) */
export type ActivityAction =
    | 'visit'
    | 'team.create'
    | 'team.update'
    | 'team.delete'
    /** 정리 작업이 자동 삭제 날짜가 지난 팀(과 그 팀의 합주)을 지움 (B-9). 방문자·IP·기기 없음 */
    | 'team.expire'
    | 'ensemble.create'
    | 'ensemble.update'
    | 'ensemble.delete'
    /** 정리 작업이 날짜가 지난 합주(일회성) · 반복 종료 날짜가 지난 반복 합주를 지움 (B-9) */
    | 'ensemble.expire'
    | 'note.create'
    | 'note.delete'
    | 'notice.create'
    | 'notice.delete'
    | 'pin.check'
    | 'admin.login'
    | 'admin.master-pin';

/** 결과: 성공, PIN 틀림, 대상 없음, 너무 많이 틀려 막힘, 서버 오류 */
export type ActivityResult = 'ok' | 'wrong-pin' | 'not-found' | 'blocked' | 'error';

/** 어떤 PIN으로 통과했는지: 그 팀·글의 PIN(own) 또는 마스터 PIN (값은 남기지 않는다) */
export type PinKind = 'own' | 'master';

const activitySchema = new mongoose.Schema(
    {
        at: { type: Date, default: () => new Date() },
        /** 어느 서버에서 온 요청인지 (운영·베타·개발이 같은 DB를 쓴다: 사전 결정 10) */
        env: String,
        visitorId: String,
        ip: String,
        userAgent: String,
        /** User-Agent를 풀어 쓴 것 (lib/device.ts) */
        device: { kind: String, os: String, browser: String, model: String },
        action: String,
        /** 대상: 종류(team·ensemble·note·notice·master), id, 사람이 알아볼 이름(팀 이름·글 앞부분) */
        target: { kind: String, id: String, name: String },
        /** 바뀌기 전·후 (수정), 지운 내용 (삭제), 만든 내용 (만들기). PIN은 넣지 않는다 */
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed,
        pin: String,
        result: String,
    },
    { versionKey: false },
);

activitySchema.index({ at: 1 }, { expireAfterSeconds: ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 });
activitySchema.index({ visitorId: 1, at: -1 });
activitySchema.index({ ip: 1, at: -1 });
activitySchema.index({ 'target.id': 1, at: -1 });

export const Activity = mongoose.model('Activity', activitySchema);
