import mongoose from 'mongoose';

const ensembleSchema = new mongoose.Schema(
    {
        // 팀 삭제·수정이 teamId로 합주를 찾으므로 인덱스 (O6)
        teamId: { type: String, index: true },
        // teamName·day는 서버가 채운다 (B-8 D3, 이전: 웹이 보낸 값 그대로).
        // teamName = 그 팀의 이름 (팀 이름을 바꾸면 그 팀 합주의 teamName도 함께, routes/teams), day = nextDate의 한국 요일 (월 0 ~ 일 6).
        // 다른 값에서 나오는 값이지만 남겨 두는 이유: 운영 전환(B-14) 전까지 옛 웹이 이 둘을 읽고(합주표 칸·이름),
        // 팀이 없는 합주(옛 데이터)와 활동 기록에도 이름이 필요하다
        teamName: String,
        startTime: Number,
        endTime: Number,
        day: Number,
        // type('무기한'·'일회성')은 지웠다 (B-8 D3, 사용자 결정): repeat와 due로 모두 나타낸다.
        // 이미 저장된 type은 운영 전환(B-14) 때 scripts/remove-ensemble-type.ts로 지운다 (그 전까지는 목록 응답에 남아 있고 웹은 버린다)
        /** 반복 합주: 반복 종료 날짜 (그날 UTC 0시, 계속 반복은 2099-12-31). 일회성: 그 날짜 */
        due: Date,
        nextDate: Date,
        repeat: Boolean,
    },
    // createdAt·updatedAt을 서버가 채운다 (O6)
    { timestamps: true },
);

export const Ensemble = mongoose.model('Ensemble', ensembleSchema);
