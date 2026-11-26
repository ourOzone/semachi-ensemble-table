import { screen, waitFor } from '@testing-library/react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { get } from '@/api';
import { url } from '@/constants';
import { QUERY_ERROR_MESSAGE } from '@/lib/notify';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

/** 목록 두 개를 동시에 불러온다 (서버가 내려가면 여러 목록이 한꺼번에 실패한다) */
function TwoQueries() {
    useQuery({ queryKey: ['teams'], queryFn: () => get('/teams') });
    useQuery({ queryKey: ['ensembles'], queryFn: () => get('/ensembles') });
    return null;
}

async function waitAllSettled(queryClient: QueryClient) {
    await waitFor(() => {
        const queries = queryClient.getQueryCache().getAll();
        expect(queries).toHaveLength(2);
        expect(queries.every((q) => q.state.status !== 'pending')).toBe(true);
    });
}

describe('조회 실패 알림 (View 개편 V-1)', () => {
    it('조회가 여러 개 실패해도 알림은 하나만 띄운다', async () => {
        server.use(
            http.get(`${url}/teams`, () => new HttpResponse(null, { status: 500 })),
            http.get(`${url}/ensembles`, () => new HttpResponse(null, { status: 500 })),
        );

        const { queryClient } = renderWithProviders(<TwoQueries />);

        await waitAllSettled(queryClient);
        expect(await screen.findByText(QUERY_ERROR_MESSAGE)).toBeInTheDocument();
        expect(screen.getAllByText(QUERY_ERROR_MESSAGE)).toHaveLength(1);
    });

    it('조회가 성공하면 알림이 없다', async () => {
        server.use(
            http.get(`${url}/teams`, () => HttpResponse.json([])),
            http.get(`${url}/ensembles`, () => HttpResponse.json([])),
        );

        const { queryClient } = renderWithProviders(<TwoQueries />);

        await waitAllSettled(queryClient);
        expect(screen.queryByText(QUERY_ERROR_MESSAGE)).not.toBeInTheDocument();
    });
});
