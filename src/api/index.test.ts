import dayjs from 'dayjs';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { get, isNotFound, post } from '@/api';
import { deleteEnsemble, updateEnsemble } from '@/api/ensemble';
import { url } from '@/constants';
import { server } from '@/test/server';

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

        await updateEnsemble('e1', {
            teamId: 't1',
            repeat: true,
            nextDate,
            startTime: 2,
            endTime: 3,
            day: 4,
            type: '무기한',
            due: '2099-12-31',
        });
        await deleteEnsemble('e1');

        expect(requested).toEqual([`PUT ${url}/ensemble?id=e1`, `DELETE ${url}/ensemble?id=e1`]);
    });
});
