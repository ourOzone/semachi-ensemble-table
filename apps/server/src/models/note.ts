import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
    {
        text: String,
        // 목록·조회 응답에 넣지 않는다. PIN을 볼 때만 .select('+pin') (B-6 B3)
        pin: { type: String, select: false },
    },
    // createdAt·updatedAt을 서버가 채운다 (O6)
    { timestamps: true },
);

export const Note = mongoose.model('Note', noteSchema);
