// 서버 테스트 도우미
import mongoose from 'mongoose';
import { pino } from 'pino';
import request from 'supertest';
import { vi } from 'vitest';
import { createApp, type AppOptions } from '../src/app.ts';

/** 테스트용 마스터 PIN. 실제 값(루트 .env)은 읽지 않는다 */
export const MASTER_PIN = '9999';

/** 테스트에서 CORS로 허락한 웹 주소 */
export const ALLOWED_ORIGIN = 'https://semachi.net';

const appOptions = {
    masterPin: MASTER_PIN,
    corsOrigins: [ALLOWED_ORIGIN, 'http://localhost:3000'],
    appEnv: 'test',
    // 운영 로그는 테스트 출력에 남기지 않는다
    logger: pino({ level: 'silent' }),
};
const app = createApp(appOptions);

/** 앱에 요청을 보낸다 (실제 포트를 열지 않고 메모리 안에서) */
export const api = () => request(app);

/** 새 앱 (PIN 시도 횟수처럼 앱이 기억하는 상태를 처음부터 보고 싶을 때) */
export function freshApi(options: Partial<AppOptions> = {}) {
    const fresh = createApp({ ...appOptions, ...options });
    return () => request(fresh);
}

type Collection = 'teams' | 'ensembles' | 'notes' | 'notices' | 'settings' | 'activities';

/** 관리자로 로그인해 쿠키("이름=값")를 돌려준다. 요청에 .set('Cookie', cookie) (B-7) */
export async function adminCookie(
    send: () => request.Agent | ReturnType<typeof request> = api,
    pin = MASTER_PIN,
) {
    const res = await send().post('/admin/login').send({ pin });
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const admin = cookies.find((c) => c.startsWith('semachi_admin='));
    if (!admin) throw new Error(`관리자 로그인 실패: ${res.status}`);
    return admin.split(';')[0]!;
}

/** DB 컬렉션에 직접 넣는다. 실제 데이터처럼 스키마와 다른 모양(빠진 필드, null 등)도 넣을 수 있다. undefined인 필드는 넣지 않는다 */
export async function insert(collection: Collection, doc: Record<string, unknown>) {
    const defined = Object.fromEntries(Object.entries(doc).filter(([, v]) => v !== undefined));
    const { insertedId } = await mongoose.connection.collection(collection).insertOne(defined);
    return insertedId.toHexString();
}

/** DB 컬렉션에서 직접 읽는다 */
export function findAll(collection: Collection) {
    return mongoose.connection.collection(collection).find().toArray();
}

export function findOne(collection: Collection, id: string) {
    return mongoose.connection
        .collection(collection)
        .findOne({ _id: new mongoose.Types.ObjectId(id) });
}

/** 있을 수 있지만 DB에 없는 id */
export const missingId = () => new mongoose.Types.ObjectId().toHexString();

/** 현재 시각만 고정한다 (타이머는 그대로 두어 DB 연결이 멈추지 않게) */
export function freezeTime(iso: string) {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(iso) });
}

/** 실제 데이터 모양의 팀 (웹 types/response.ts: 실제 응답으로 확인한 필드) */
export const teamDoc = (over: Record<string, unknown> = {}) => ({
    name: '테스트밴드',
    desc: ['보컬', '기타', '베이스', '드럼', '키보드', '매니저', '셋리스트'],
    type: '교내 공연',
    publishDate: new Date('2026-11-01T03:00:00.000Z'),
    pin: '1234',
    __v: 0,
    ...over,
});

export const ensembleDoc = (over: Record<string, unknown> = {}) => ({
    teamId: missingId(),
    teamName: '테스트밴드',
    startTime: 10,
    endTime: 13,
    day: 2,
    type: '무기한',
    due: new Date('2099-12-31T00:00:00.000Z'),
    nextDate: new Date('2026-12-02T00:00:00.000Z'),
    repeat: true,
    __v: 0,
    ...over,
});

// --- 활동 기록 (B-7, models/activity.ts) ---

/** 활동 기록 전체 (오래된 것부터) */
export async function activities(filter: Record<string, unknown> = {}) {
    return mongoose.connection.collection('activities').find(filter).sort({ at: 1 }).toArray();
}

/** 가장 최근 활동 기록 하나 */
export async function lastActivity() {
    return (await activities()).at(-1);
}
