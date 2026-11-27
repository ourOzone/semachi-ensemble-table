// 서버 시작 (백엔드 개편 B-2에서 api.js의 시작 부분을 옮김, 코드는 그대로)
// 환경변수(.env) → 앱 → DB 연결 → HTTPS 실행. 앱 조립은 app.js (테스트는 app.js만 가져다 쓴다)

// app.js가 처음 읽힐 때 MASTER_PIN을 읽으므로 .env를 먼저 읽는다 (api.js에서도 이 순서였다)
require('dotenv').config();

const mongoose = require('mongoose');
const fs = require('fs');
const https = require('https');
const app = require('./app');

//Mongo DB 연결
mongoose.connect(process.env.MONGO_DB)
  .then(() => console.log('connected'))
  .catch(() => console.log('failed'));

const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/semachi.net/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/semachi.net/fullchain.pem'),
};

https.createServer(sslOptions, app).listen(8081, '0.0.0.0', () => {
  console.log('HTTPS 서버 실행 중: https://semachi.net:8081');
});
