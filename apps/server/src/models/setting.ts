import mongoose from 'mongoose';

// 서버 설정 (B-6). _id가 설정 이름: 'masterPin'(마스터 PIN 해시, 관리자 화면에서 바꾼다)
// 옛 서버(api.js)는 이 컬렉션을 모른다: 운영 전환(B-14) 전까지 옛 서버는 .env의 MASTER_PIN을 쓴다
const settingSchema = new mongoose.Schema(
    {
        _id: String,
        value: String,
    },
    { timestamps: true },
);

export const Setting = mongoose.model('Setting', settingSchema);
