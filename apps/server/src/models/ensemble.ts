import mongoose from 'mongoose';

const ensembleSchema = new mongoose.Schema(
    {
        // 팀 삭제·수정이 teamId로 합주를 찾으므로 인덱스 (O6)
        teamId: { type: String, index: true },
        teamName: String,
        startTime: Number,
        endTime: Number,
        day: Number,
        type: String,
        due: Date,
        nextDate: Date,
        repeat: Boolean,
    },
    // createdAt·updatedAt을 서버가 채운다 (O6)
    { timestamps: true },
);

export const Ensemble = mongoose.model('Ensemble', ensembleSchema);
