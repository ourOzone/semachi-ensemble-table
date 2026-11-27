import mongoose from 'mongoose';

const ensembleSchema = new mongoose.Schema({
    teamId: String,
    teamName: String,
    startTime: Number,
    endTime: Number,
    day: Number,
    type: String,
    due: Date,
    nextDate: Date,
    repeat: Boolean,
});

export const Ensemble = mongoose.model('Ensemble', ensembleSchema);
