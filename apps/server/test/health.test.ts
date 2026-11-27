// GET /health : 배포 뒤 확인·Docker 상태 검사용 (B-3에서 추가)
import mongoose from 'mongoose';
import { expect, test, vi } from 'vitest';
import { api } from './helpers.ts';

test('DB에 연결돼 있으면 200 { status: "ok" }, 방문자 쿠키를 주지 않는다', async () => {
    const res = await api().get('/health');
    expect([res.status, res.body]).toEqual([200, { status: 'ok' }]);
    expect(res.headers['set-cookie']).toBeUndefined();
});

test('DB 연결이 끊겨 있으면 503', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(
        mongoose.ConnectionStates.disconnected,
    );
    const res = await api().get('/health');
    expect([res.status, res.body]).toEqual([503, { status: 'db-disconnected' }]);
});
