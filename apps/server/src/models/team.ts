import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
    name: String,
    desc: [String],
    type: String,
    publishDate: Date,
    pin: String,
});

export const Team = mongoose.model('Team', teamSchema);
