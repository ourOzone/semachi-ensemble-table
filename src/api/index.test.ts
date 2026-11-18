import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { get, post } from '@/api';
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
