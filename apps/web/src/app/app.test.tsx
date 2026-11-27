import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { url } from '@/constants/index';
import { mockInitialData } from '@/test/fixtures';
import { renderApp } from '@/test/render';
import { server } from '@/test/server';

// App 전체 스모크 테스트: 실제 진입점과 같은 Provider 구성으로 렌더링하고, API는 MSW로 모킹한다.

// 허용하는 경고 목록. 여기 없는 경고가 생기면 테스트가 실패한다.
// 지금은 없음 (V-6: 옛 styled-components props·antd Drawer 경고가 옛 코드와 함께 사라짐, ISSUES V1·V4)
const KNOWN_WARNINGS: RegExp[] = [];

describe('App', () => {
    // React가 남기는 경고(호환성, deprecated API 등)를 수집한다.
    let consoleMessages: string[];

    const unexpectedWarnings = () =>
        consoleMessages.filter(
            (message) => !KNOWN_WARNINGS.some((pattern) => pattern.test(message)),
        );

    beforeEach(() => {
        consoleMessages = [];
        const capture = (...args: unknown[]) => {
            consoleMessages.push(args.map(String).join(' '));
        };
        vi.spyOn(console, 'error').mockImplementation(capture);
        vi.spyOn(console, 'warn').mockImplementation(capture);

        mockInitialData();
        server.use(http.get(`${url}/team/:id`, () => HttpResponse.json(true)));
    });

    it('API 데이터를 불러와 공지·팀·합주·메모를 표시한다', async () => {
        renderApp();

        // 팀 버튼 + 합주 블록
        expect(await screen.findAllByText('테스트밴드')).toHaveLength(2);
        expect(screen.getByText('첫 공지')).toBeInTheDocument();
        expect(screen.getByText('메모입니다')).toBeInTheDocument();
        expect(unexpectedWarnings()).toEqual([]);
    });

    it('팀을 클릭하면 팀 정보 Drawer가 열린다', async () => {
        const user = userEvent.setup();
        renderApp();

        // DOM 순서상 첫 번째가 팀 버튼(Teams), 두 번째가 합주 블록(Board)
        const [teamButton] = await screen.findAllByText('테스트밴드');
        await user.click(teamButton!);

        expect(await screen.findByText('보컬A')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '합주 잡기' })).toBeInTheDocument();
        expect(unexpectedWarnings()).toEqual([]);
    });
});
