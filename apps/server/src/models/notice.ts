import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema(
    {
        content: String,
        publishDate: Date,
    },
    // createdAt·updatedAt을 서버가 채운다 (O6)
    { timestamps: true },
);

export const Notice = mongoose.model('Notice', noticeSchema);
