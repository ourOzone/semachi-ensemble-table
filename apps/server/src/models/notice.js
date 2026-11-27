import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema({
    content: String,
    publishDate: Date,
});

export const Notice = mongoose.model('Notice', noticeSchema);
