import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
    {
        name: String,
        desc: [String],
        type: String,
        publishDate: Date,
        /**
         * 팀 자동 삭제 날짜 (B-9): 이 날짜가 지나면(한국 날짜로 다음 날) 정리 작업이 팀과 그 팀의 합주를 지운다.
         * 'YYYY-MM-DD'로 받아 그날 UTC 0시로 저장한다 (합주 due와 같음). 계속 유지는 2099-12-31, 없으면(옛 팀) 계속 유지
         */
        due: Date,
        // 목록·조회 응답에 넣지 않는다. PIN을 볼 때만 .select('+pin') (B-6 B3)
        pin: { type: String, select: false },
    },
    // createdAt·updatedAt을 서버가 채운다 (O6, B-5부터 만들거나 바꾼 문서에만. 옛 서버는 이 필드를 무시한다)
    { timestamps: true },
);

export const Team = mongoose.model('Team', teamSchema);
