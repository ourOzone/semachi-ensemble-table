// 서버 시작: 환경변수(.env) → 앱 → DB 연결 → HTTPS 실행. 앱 조립은 app.js
import 'dotenv/config';
import fs from 'node:fs';
import https from 'node:https';
import mongoose from 'mongoose';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';

const config = loadConfig();
const app = createApp(config);

// 현재 동작: 연결에 실패해도 서버는 그대로 뜬다 (O4)
mongoose
    .connect(config.mongoUri ?? '') // 없으면 연결이 실패한다 (api.js와 같음)
    .then(() => console.log('connected'))
    .catch(() => console.log('failed'));

const sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/semachi.net/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/semachi.net/fullchain.pem'),
};

https.createServer(sslOptions, app).listen(8081, '0.0.0.0', () => {
    console.log('HTTPS 서버 실행 중: https://semachi.net:8081');
});
