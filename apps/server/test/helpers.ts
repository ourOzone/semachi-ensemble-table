// 서버 테스트 도우미
import { readFileSync, writeFileSync } from 'node:fs';
import mongoose from 'mongoose';
import request from 'supertest';
import { expect, vi } from 'vitest';
import { createApp } from '../src/app.ts';

/** 테스트용 마스터 PIN. 실제 값(루트 .env)은 읽지 않는다 */
export const MASTER_PIN = '9999';

// 로그 파일은 setup.ts가 테스트 파일마다 만든 임시 파일
const app = createApp({ masterPin: MASTER_PIN, logFile: process.env.LOG_FILE! });

/** 앱에 요청을 보낸다 (실제 포트를 열지 않고 메모리 안에서) */
export const api = () => request(app);

/** DB 컬렉션에 직접 넣는다. 실제 데이터처럼 스키마와 다른 모양(빠진 필드, null 등)도 넣을 수 있다. undefined인 필드는 넣지 않는다 */
export async function insert(
    collection: 'teams' | 'ensembles' | 'notes' | 'notices',
    doc: Record<string, unknown>,
) {
    const defined = Object.fromEntries(Object.entries(doc).filter(([, v]) => v !== undefined));
    const { insertedId } = await mongoose.connection.collection(collection).insertOne(defined);
    return insertedId.toHexString();
}

/** DB 컬렉션에서 직접 읽는다 */
export function findAll(collection: 'teams' | 'ensembles' | 'notes' | 'notices') {
    return mongoose.connection.collection(collection).find().toArray();
}

export function findOne(collection: 'teams' | 'ensembles' | 'notes' | 'notices', id: string) {
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

// --- 로그 (app.js의 append_log: 응답을 보낸 뒤 파일을 읽고 다시 쓴다) ---

const logFile = () => process.env.LOG_FILE!;

export const readLog = () => readFileSync(logFile(), 'utf8');
export const writeLog = (content: string) => writeFileSync(logFile(), content);

/**
 * 로그를 비우고(또는 content로) 시작한다. 앞 테스트의 요청이 남긴 로그 쓰기가 끝나기를 먼저 기다린다:
 * append_log는 파일을 읽은 뒤 다시 쓰므로, 덜 끝난 쓰기가 있으면 비운 내용을 덮어쓰고 이번 줄도 사라질 수 있다 (O1)
 */
export async function resetLog(content = '') {
    await new Promise((r) => setTimeout(r, 50));
    writeLog(content);
}

/** 로그에 그 줄이 쓰일 때까지 기다린다 (응답 뒤에 비동기로 쓰인다). 문자열은 한 줄 전체, 정규식은 일부 */
export async function waitForLog(line: string | RegExp) {
    if (typeof line === 'string')
        await vi.waitFor(() => expect(readLog().split('\n')).toContain(line));
    else await vi.waitFor(() => expect(readLog()).toMatch(line));
}

/** 요청 뒤 로그 쓰기가 끝났을 만한 시간을 기다린 뒤 지금 로그를 돌려준다 (기록하지 않는 동작 확인용) */
export async function settledLog() {
    await new Promise((r) => setTimeout(r, 100));
    return readLog();
}
