import dayjs from 'dayjs';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { get, getList, isNotFound, post } from '@/api';
import { deleteEnsemble, getEnsembles, updateEnsemble } from '@/api/ensemble';
import { checkTeamPin } from '@/api/team';
import { url } from '@/constants';
import { ensembles as ensembleFixtures } from '@/test/fixtures';
import { server } from '@/test/server';
import { teamResponseSchema } from '@/types';

describe('api client', () => {
    it('GET 응답의 data를 그대로 반환한다', async () => {
        const teams = [{ _id: '1', type: '정규', name: '비틀즈', desc: [] }];
        server.use(http.get(`${url}/teams`, () => HttpResponse.json(teams)));

        await expect(get('/teams')).resolves.toEqual(teams);
    });

    it('POST 시 body를 JSON으로 전송한다', async () => {
        let received: unknown;
        server.use(
            http.post(`${url}/note`, async ({ request }) => {
                received = await request.json();
                return HttpResponse.json({ ok: true });
            }),
        );

        await post('/note', { text: '메모', pin: '1234' });

        expect(received).toEqual({ text: '메모', pin: '1234' });
    });

    it('요청이 실패하면 에러를 다시 던진다', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(http.get(`${url}/notices`, () => new HttpResponse(null, { status: 500 })));

        await expect(get('/notices')).rejects.toMatchObject({ response: { status: 500 } });
    });
});

describe('isNotFound', () => {
    it('서버가 404로 응답한 요청 에러만 true', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(
            http.get(`${url}/team/:id`, ({ params }) =>
                params.id === 'gone'
                    ? HttpResponse.json(false, { status: 404 })
                    : new HttpResponse(null, { status: 500 }),
            ),
        );

        const notFound = await get('/team/gone').catch((err: unknown) => err);
        const serverError = await get('/team/x').catch((err: unknown) => err);

        expect(isNotFound(notFound)).toBe(true);
        expect(isNotFound(serverError)).toBe(false);
        expect(isNotFound(new Error('404'))).toBe(false);
        expect(isNotFound(undefined)).toBe(false);
    });
});

describe('합주 수정·삭제 경로', () => {
    // P8: 경로 앞의 '/' 유무와 관계없이 baseURL과 합쳐진 최종 URL이 같아야 한다
    it('PUT·DELETE 모두 {url}/ensemble?id=로 보낸다', async () => {
        const requested: string[] = [];
        server.use(
            http.put(`${url}/ensemble`, ({ request }) => {
                requested.push(`PUT ${request.url}`);
                return HttpResponse.json({ id: 'e1', message: 'ok' });
            }),
            http.delete(`${url}/ensemble`, ({ request }) => {
                requested.push(`DELETE ${request.url}`);
                return HttpResponse.json({ id: 'e1' });
            }),
        );
        const nextDate = dayjs('2026-11-20');

        await updateEnsemble(
            'e1',
            {
                teamId: 't1',
                repeat: true,
                nextDate,
                startTime: 2,
                endTime: 3,
                day: 4,
                type: '무기한',
                due: '2099-12-31',
            },
            '1234',
        );
        await deleteEnsemble('e1', '1234');

        expect(requested).toEqual([`PUT ${url}/ensemble?id=e1`, `DELETE ${url}/ensemble?id=e1`]);
    });
});

describe('응답 검증 (Zod)', () => {
    const team = { _id: 't1', type: '기타 등등', name: '팀', desc: [], pin: '9876', __v: 0 };

    it('getList: 항목을 스키마로 검증하고, 모르는 필드(__v)는 버린다', async () => {
        server.use(http.get(`${url}/teams`, () => HttpResponse.json([team])));

        await expect(getList('/teams', teamResponseSchema)).resolves.toEqual([
            { _id: 't1', type: '기타 등등', name: '팀', desc: [], pin: '9876' },
        ]);
    });

    it('getList: 형식이 맞지 않는 항목만 빼고, 위치·이유만 경고한다 (값은 남기지 않음)', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const broken = { ...team, _id: 't2', name: null };
        server.use(http.get(`${url}/teams`, () => HttpResponse.json([team, broken])));

        const result = await getList('/teams', teamResponseSchema);

        expect(result.map(({ _id }) => _id)).toEqual(['t1']);
        expect(warn).toHaveBeenCalledTimes(1);
        const logged = JSON.stringify(warn.mock.calls);
        expect(logged).toContain('1번째 항목');
        expect(logged).toContain('name');
        expect(logged).not.toContain('9876'); // 응답의 PIN 값이 로그에 남지 않는다
    });

    it('getList: 응답이 배열이 아니면 에러 (조회 실패)', async () => {
        server.use(http.get(`${url}/teams`, () => HttpResponse.json({ error: 'x' })));

        await expect(getList('/teams', teamResponseSchema)).rejects.toBeInstanceOf(ZodError);
    });

    it('실제 서버에 있는 형태: endTime이 null인 합주는 빼고 나머지는 그대로', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const legacy = { ...ensembleFixtures[0]!, _id: 'legacy', startTime: 26, endTime: null };
        server.use(
            http.get(`${url}/ensembles`, () => HttpResponse.json([legacy, ...ensembleFixtures])),
        );

        const result = await getEnsembles();

        expect(result.map(({ _id }) => _id)).toEqual(ensembleFixtures.map(({ _id }) => _id));
    });

    it('PIN 확인 응답이 boolean이 아니면 에러 (이전에는 truthy면 맞는 PIN으로 처리됐다)', async () => {
        server.use(http.post(`${url}/check-team-pin`, () => HttpResponse.json({ ok: true })));

        await expect(checkTeamPin('t1', '1234')).rejects.toBeInstanceOf(ZodError);
    });
});
