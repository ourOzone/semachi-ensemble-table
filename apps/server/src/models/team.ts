import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
    {
        name: String,
        desc: [String],
        type: String,
        publishDate: Date,
        // 목록·조회 응답에 넣지 않는다. PIN을 볼 때만 .select('+pin') (B-6 B3)
        pin: { type: String, select: false },
    },
    // createdAt·updatedAt을 서버가 채운다 (O6, B-5부터 만들거나 바꾼 문서에만. 옛 서버는 이 필드를 무시한다)
    { timestamps: true },
);

export const Team = mongoose.model('Team', teamSchema);
