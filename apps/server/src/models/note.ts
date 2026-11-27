import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
    {
        text: String,
        pin: String,
    },
    // createdAt·updatedAt을 서버가 채운다 (O6)
    { timestamps: true },
);

export const Note = mongoose.model('Note', noteSchema);
