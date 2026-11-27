// 서버 시작: 환경변수(.env) 검사 → DB 연결 → 서버 실행. 앱 조립은 app.ts
// 설정이 틀리거나 DB에 연결하지 못하면 바로 끝낸다 (api.js는 연결에 실패해도 떠 있었다: O4)
import 'dotenv/config';
import dns from 'node:dns';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import mongoose from 'mongoose';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';

let config;
try {
    config = loadConfig();
} catch (error) {
    console.error(`설정 오류: ${(error as Error).message}`);
    process.exit(1);
}

if (config.dnsServers.length > 0) dns.setServers(config.dnsServers);

try {
    await mongoose.connect(config.mongoUri);
    console.log('DB 연결됨');
} catch (error) {
    console.error('DB에 연결하지 못했습니다:', error);
    process.exit(1);
}

const app = createApp(config);
const server = config.tls
    ? https.createServer(
          { key: fs.readFileSync(config.tls.keyFile), cert: fs.readFileSync(config.tls.certFile) },
          app,
      )
    : http.createServer(app);

server.listen(config.port, '0.0.0.0', () => {
    console.log(`${config.tls ? 'HTTPS' : 'HTTP'} 서버 실행 중: 포트 ${config.port}`);
});

// 종료 신호(Ctrl+C, Docker 정지): 새 요청을 받지 않고, 하던 요청을 마친 뒤 DB 연결을 닫고 끝낸다
let stopping = false;
function shutdown(signal: string) {
    if (stopping) return;
    stopping = true;
    console.log(`${signal}: 서버를 멈춥니다`);
    server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
    });
    server.closeIdleConnections();
    // 10초 안에 끝나지 않으면 그냥 끝낸다
    setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
