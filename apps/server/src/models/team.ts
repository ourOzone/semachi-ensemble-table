import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
    {
        name: String,
        desc: [String],
        type: String,
        publishDate: Date,
        pin: String,
    },
    // createdAt·updatedAt을 서버가 채운다 (O6, B-5부터 만들거나 바꾼 문서에만. 옛 서버는 이 필드를 무시한다)
    { timestamps: true },
);

export const Team = mongoose.model('Team', teamSchema);
