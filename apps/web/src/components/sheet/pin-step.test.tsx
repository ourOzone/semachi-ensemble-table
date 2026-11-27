import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { parsePinAttempts } from '@/api/pin';
import { url } from '@/constants/index';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import PinStep from './pin-step';

// PIN 확인 결과 표시 (백엔드 개편 B-6): 맞은 PIN을 넘기기, 틀린 횟수 "(7/10)", 너무 많이 틀려 막혔을 때
function renderPinStep(onConfirm = vi.fn<(pin: string) => void>()) {
    renderWithProviders(<PinStep teamId="team-1" onConfirm={onConfirm} />);
    return { user: userEvent.setup(), onConfirm };
}

describe('PinStep', () => {
    it('맞으면 그 PIN으로 onConfirm (변경 요청에 담아 보낸다)', async () => {
        server.use(http.post(`${url}/check-team-pin`, () => HttpResponse.json(true)));
        const { user, onConfirm } = renderPinStep();
        await user.type(screen.getByLabelText('PIN 4자리'), '1234');
        await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('1234'));
    });

    it('틀리면 서버가 알려 준 틀린 횟수를 함께 보인다 (예: 7/10)', async () => {
        server.use(
            http.post(`${url}/check-team-pin`, () =>
                HttpResponse.json(false, { headers: { 'Pin-Attempts': '7/10' } }),
            ),
        );
        const { user, onConfirm } = renderPinStep();
        await user.type(screen.getByLabelText('PIN 4자리'), '0000');
        expect(
            await screen.findByText('PIN이 맞지 않아요. 다시 입력해 주세요 (7/10)'),
        ).toBeInTheDocument();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('서버가 횟수를 알려 주지 않으면 횟수 없이', async () => {
        server.use(http.post(`${url}/check-team-pin`, () => HttpResponse.json(false)));
        const { user } = renderPinStep();
        await user.type(screen.getByLabelText('PIN 4자리'), '0000');
        expect(
            await screen.findByText('PIN이 맞지 않아요. 다시 입력해 주세요'),
        ).toBeInTheDocument();
    });

    it('너무 많이 틀려 막히면(429) 다시 해도 되는 때까지 남은 분을 보인다 (알림 없이 그 자리에)', async () => {
        server.use(
            http.post(`${url}/check-team-pin`, () =>
                HttpResponse.json(
                    { error: 'Too many PIN attempts' },
                    { status: 429, headers: { 'Retry-After': '845' } },
                ),
            ),
        );
        const { user, onConfirm } = renderPinStep();
        await user.type(screen.getByLabelText('PIN 4자리'), '1234');
        expect(
            await screen.findByText('너무 많이 틀렸어요. 15분 뒤에 다시 입력해 주세요'),
        ).toBeInTheDocument();
        expect(
            screen.queryByText('PIN을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.'),
        ).toBeNull();
        expect(onConfirm).not.toHaveBeenCalled();
        // 칸은 비워 둔다 (다시 넣을 수 있게)
        expect(screen.getByLabelText('PIN 4자리')).toHaveValue('');
    });
});

describe('parsePinAttempts', () => {
    it('"7/10" → { used: 7, limit: 10 }, 형식이 다르면 없음', () => {
        expect(parsePinAttempts('7/10')).toEqual({ used: 7, limit: 10 });
        expect(parsePinAttempts(' 1/30 ')).toEqual({ used: 1, limit: 30 });
        for (const header of [undefined, '', '7', 'a/b', 7]) {
            expect(parsePinAttempts(header)).toBeUndefined();
        }
    });
});
