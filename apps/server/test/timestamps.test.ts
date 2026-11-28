// 서버가 채우는 생성·수정 시각 (B-5 O6, Mongoose timestamps)와 합주 teamId 인덱스
import mongoose from 'mongoose';
import { expect, test } from 'vitest';
import { api, ensembleDoc, findOne, freezeTime, insert, MASTER_PIN, teamDoc } from './helpers.ts';

const desc = ['', '', '', '', '', '', ''];

test('만들면 createdAt·updatedAt이 서버의 지금, 고치면 updatedAt만 바뀐다', async () => {
    freezeTime('2026-11-27T01:00:00Z');
    const { body } = await api()
        .post('/team')
        .send({ name: '새 팀', desc, type: '교내 공연', pin: '1234' });
    expect(await findOne('teams', body.id)).toMatchObject({
        createdAt: new Date('2026-11-27T01:00:00Z'),
        updatedAt: new Date('2026-11-27T01:00:00Z'),
    });

    freezeTime('2026-11-28T02:00:00Z');
    await api()
        .put(`/team?id=${body.id}`)
        .send({ name: '바뀐 팀', desc, type: '교내 공연', pin: '1234' });
    expect(await findOne('teams', body.id)).toMatchObject({
        createdAt: new Date('2026-11-27T01:00:00Z'),
        updatedAt: new Date('2026-11-28T02:00:00Z'),
    });

    const list = await api().get('/teams');
    expect(list.body[0]).toMatchObject({
        createdAt: '2026-11-27T01:00:00.000Z',
        updatedAt: '2026-11-28T02:00:00.000Z',
    });
});

test('옛 문서(시각 없음)는 고칠 때 updatedAt만 생긴다 (createdAt은 모른다)', async () => {
    freezeTime('2026-11-28T02:00:00Z');
    const id = await insert('ensembles', ensembleDoc());
    await api().put(`/ensemble?id=${id}`).send({
        startTime: 1,
        endTime: 2,
        repeat: true,
        nextDate: '2026-11-30T00:00:00.000Z',
        due: '2099-12-31',
        pin: MASTER_PIN,
    });
    const saved = await findOne('ensembles', id);
    expect(saved?.updatedAt).toEqual(new Date('2026-11-28T02:00:00Z'));
    expect(saved).not.toHaveProperty('createdAt');
});

test('팀 이름을 바꾸면 그 팀 합주의 updatedAt도 바뀐다', async () => {
    const teamId = await insert('teams', teamDoc());
    const e = await insert('ensembles', ensembleDoc({ teamId }));
    freezeTime('2026-11-29T00:00:00Z');
    await api()
        .put(`/team?id=${teamId}`)
        .send({ name: '새 이름', desc, type: '교내 공연', pin: '1234' });
    expect(await findOne('ensembles', e)).toMatchObject({
        teamName: '새 이름',
        updatedAt: new Date('2026-11-29T00:00:00Z'),
    });
});

test('합주는 teamId로 찾으므로 인덱스가 있다', () => {
    const indexes = mongoose.model('Ensemble').schema.indexes();
    expect(indexes).toContainEqual([{ teamId: 1 }, expect.anything()]);
});
