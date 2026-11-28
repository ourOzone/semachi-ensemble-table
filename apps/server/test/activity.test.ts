// 활동 기록 (B-7, models/activity.ts·lib/activity.ts): 누가(방문자·IP·기기) 무엇을 어떤 PIN으로 했는지. PIN 값은 절대 없음
import { describe, expect, test } from 'vitest';
import { parseDevice } from '../src/lib/device.ts';
import {
    activities,
    api,
    ensembleBody,
    ensembleDoc,
    freshApi,
    insert,
    lastActivity,
    MASTER_PIN,
    missingId,
    teamBody,
    teamDoc,
} from './helpers.ts';

const VID = '0b8a5c7e-1f2d-4c3b-9a8e-7d6c5b4a3f21';
const IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
/** 기록에 남으면 안 되는 PIN (다른 값과 겹치지 않게 흔치 않은 숫자) */
const SECRET = '4826';

describe('누가', () => {
    test('POST /visits: 웹을 열 때 한 번. 방문자 id·IP·기기·서버(env)를 남긴다', async () => {
        const res = await api()
            .post('/visits')
            .set('Cookie', `semachi_vid=${VID}`)
            .set('User-Agent', IPHONE)
            .send({ path: '/' });
        expect(res.status).toBe(204);
        expect(await lastActivity()).toMatchObject({
            action: 'visit',
            visitorId: VID,
            ip: '127.0.0.1',
            env: 'test',
            userAgent: IPHONE,
            device: { kind: 'mobile', os: 'iOS 18.1', browser: 'Safari 18', model: 'Apple iPhone' },
            target: { kind: 'page', name: '/' },
            result: 'ok',
        });
    });

    test('목록 조회(GET /teams 등)는 기록하지 않는다 (이전: GET /teams가 "페이지 열기", O2)', async () => {
        await api().get('/teams');
        await api().get('/ensembles');
        expect(await activities()).toHaveLength(0);
    });

    test('기기 정보 풀기 (User-Agent)', () => {
        expect(
            parseDevice(
                'Mozilla/5.0 (Linux; Android 15; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            ),
        ).toMatchObject({ kind: 'mobile', os: 'Android 15', browser: 'Chrome 131' });
        expect(
            parseDevice(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            ),
        ).toMatchObject({ kind: 'desktop', browser: 'Chrome 131' });
        expect(parseDevice(undefined)).toEqual({});
    });
});

describe('무엇을 — 팀', () => {
    test('만들기: 만든 내용 (PIN 없이)', async () => {
        const res = await api()
            .post('/teams')
            .send(teamBody({ name: '새 팀', pin: SECRET }));
        expect(await lastActivity()).toMatchObject({
            action: 'team.create',
            target: { kind: 'team', id: res.body.id, name: '새 팀' },
            after: { name: '새 팀', desc: teamBody().desc, type: '교내 공연' },
            result: 'ok',
        });
    });

    test('수정: 바뀌기 전·후와 어떤 PIN으로 (팀 PIN = own, 마스터 PIN = master)', async () => {
        const id = await insert('teams', teamDoc({ name: '옛 이름', pin: SECRET }));
        await api()
            .put(`/teams/${id}`)
            .send(teamBody({ name: '새 이름', type: 'x', pin: SECRET }));
        expect(await lastActivity()).toMatchObject({
            action: 'team.update',
            target: { kind: 'team', id, name: '옛 이름' },
            before: { name: '옛 이름', type: '교내 공연' },
            after: { name: '새 이름', desc: teamBody().desc, type: 'x' },
            pin: 'own',
            result: 'ok',
        });

        await api()
            .put(`/teams/${id}`)
            .send(teamBody({ name: '또', pin: MASTER_PIN }));
        expect(await lastActivity()).toMatchObject({ action: 'team.update', pin: 'master' });
    });

    test('삭제: 지운 팀과 그 팀의 합주 전체 (지워져도 무엇이었는지 남게)', async () => {
        const id = await insert('teams', teamDoc({ name: '지울 팀', pin: SECRET }));
        await insert('ensembles', ensembleDoc({ teamId: id, startTime: 3 }));
        await api().delete(`/teams/${id}`).send({ pin: SECRET });
        const last = await lastActivity();
        expect(last).toMatchObject({
            action: 'team.delete',
            target: { kind: 'team', id, name: '지울 팀' },
            before: { name: '지울 팀', ensembles: [{ teamId: id, startTime: 3 }] },
            pin: 'own',
            result: 'ok',
        });
        expect(last?.before).not.toHaveProperty('pin');
    });

    test('PIN이 틀리면 wrong-pin, 막히면 blocked를 남기고 바꾸지 않는다', async () => {
        const fresh = freshApi({ pinLimits: { perTarget: 1 } });
        const id = await insert('teams', teamDoc({ pin: SECRET }));
        await fresh()
            .put(`/teams/${id}`)
            .send(teamBody({ pin: '0000' }));
        expect(await lastActivity()).toMatchObject({ action: 'team.update', result: 'wrong-pin' });
        expect(await lastActivity()).not.toHaveProperty('pin');

        expect(
            (
                await fresh()
                    .put(`/teams/${id}`)
                    .send(teamBody({ pin: SECRET }))
            ).status,
        ).toBe(429);
        expect(await lastActivity()).toMatchObject({ action: 'team.update', result: 'blocked' });
    });

    test('PIN 확인: 맞음(어떤 PIN)·틀림·없는 팀', async () => {
        const id = await insert('teams', teamDoc({ name: '팀', pin: SECRET }));
        await api().post(`/teams/${id}/check-pin`).send({ pin: SECRET });
        await api().post(`/teams/${id}/check-pin`).send({ pin: MASTER_PIN });
        await api().post(`/teams/${id}/check-pin`).send({ pin: '0000' });
        await api().post(`/teams/${missingId()}/check-pin`).send({ pin: '0000' });
        expect((await activities()).map((a) => [a.action, a.target.name, a.pin, a.result])).toEqual(
            [
                ['pin.check', '팀', 'own', 'ok'],
                ['pin.check', undefined, 'master', 'ok'],
                ['pin.check', '팀', undefined, 'wrong-pin'],
                ['pin.check', undefined, undefined, 'not-found'],
            ],
        );
    });
});

describe('무엇을 — 합주·날적이·공지', () => {
    test('합주 잡기·수정·삭제 (수정은 바뀌기 전·후)', async () => {
        const teamId = await insert('teams', teamDoc({ name: '팀', pin: SECRET }));
        const created = await api()
            .post('/ensembles')
            .send(ensembleBody({ teamId, pin: SECRET }));
        const id = created.body.id;
        await api()
            .put(`/ensembles/${id}`)
            .send(ensembleBody({ startTime: 20, endTime: 22, pin: SECRET }));
        await api().delete(`/ensembles/${id}`).send({ pin: SECRET });

        const [create, update, remove] = await activities();
        expect(create).toMatchObject({
            action: 'ensemble.create',
            target: { id, name: '팀' },
            pin: 'own',
        });
        expect(update).toMatchObject({
            action: 'ensemble.update',
            before: { startTime: 10, endTime: 13 },
            after: { startTime: 20, endTime: 22 },
        });
        expect(remove).toMatchObject({
            action: 'ensemble.delete',
            before: { teamId, startTime: 20 },
        });
    });

    test('날적이 남기기·지우기 (글 내용, 대상 이름은 앞 40자)', async () => {
        const long = '가'.repeat(50);
        const res = await api().post('/notes').send({ text: long, pin: SECRET });
        await api().delete(`/notes/${res.body.id}`).send({ pin: SECRET });
        const [create, remove] = await activities();
        expect(create).toMatchObject({
            action: 'note.create',
            target: { kind: 'note', name: `${'가'.repeat(40)}…` },
            after: { text: long },
        });
        expect(remove).toMatchObject({ action: 'note.delete', before: { text: long }, pin: 'own' });
    });

    test('공지 올리기·지우기 (마스터 PIN)', async () => {
        const res = await api().post('/notices').send({ content: '공지', pin: MASTER_PIN });
        await api().delete(`/notices/${res.body.id}`).send({ pin: MASTER_PIN });
        expect((await activities()).map((a) => [a.action, a.pin, a.result])).toEqual([
            ['notice.create', 'master', 'ok'],
            ['notice.delete', 'master', 'ok'],
        ]);
    });
});

test('PIN 값은 어떤 기록에도 남지 않는다', async () => {
    const teamId = await insert('teams', teamDoc({ pin: SECRET }));
    await api()
        .post('/teams')
        .send(teamBody({ pin: SECRET }));
    await api().post(`/teams/${teamId}/check-pin`).send({ pin: SECRET });
    await api()
        .put(`/teams/${teamId}`)
        .send(teamBody({ pin: SECRET }));
    await api().post('/notes').send({ text: '글', pin: SECRET });
    await api().delete(`/teams/${teamId}`).send({ pin: SECRET });
    const all = await activities();
    expect(all.length).toBeGreaterThanOrEqual(5);
    // 모든 값을 훑어 PIN과 같은 값이 없는지 (id·방문자 UUID 안에 우연히 같은 숫자가 섞일 수 있어 문자열 검색은 쓰지 않는다)
    const leaves: unknown[] = [];
    const walk = (value: unknown): void => {
        if (value && typeof value === 'object' && !(value instanceof Date)) {
            Object.values(value as Record<string, unknown>).forEach(walk);
        } else {
            leaves.push(value);
        }
    };
    all.forEach((doc) => walk({ ...doc, _id: undefined }));
    expect(leaves).not.toContain(SECRET);
    // pin 필드는 어떤 PIN이었는지(own·master)만
    expect(all.map((a) => a.pin).filter((pin) => pin !== undefined && pin !== null)).toEqual(
        expect.arrayContaining(['own']),
    );
    expect(
        all.every(
            (a) => a.pin === undefined || a.pin === null || ['own', 'master'].includes(a.pin),
        ),
    ).toBe(true);
});
