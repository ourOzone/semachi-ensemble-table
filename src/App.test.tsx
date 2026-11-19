import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { url } from '@/constants';
import { ContextProvider } from '@/context';
import { renderWithTheme } from '@/test/render';
import { server } from '@/test/server';

// App 전체 스모크 테스트: 실제 진입점과 같은 Provider 구성으로 렌더링하고, API는 MSW로 모킹한다.

const teams = [
    {
        _id: 'team-1',
        type: '정규',
        name: '테스트밴드',
        desc: ['보컬A', '기타B', '베이스C', '드럼D', '키보드E', '매니저F', '셋리스트'],
    },
];
const ensembles = [
    {
        _id: 'ensemble-1',
        day: 0,
        startTime: 2,
        endTime: 3,
        teamId: 'team-1',
        teamName: '테스트밴드',
        repeat: true,
        nextDate: '2026-11-23',
        due: '2099-12-31',
    },
];
const notes = [{ _id: 'note-1', text: '메모입니다' }];
const notices = [{ _id: 'notice-1', content: '첫 공지\n둘째 줄' }];

// 기존 코드에서 이미 나던 경고 (React 18에서도 동일하게 발생함을 확인).
// View 개편(styled-components·antd 교체) 때 사라질 예정이며, 그 외의 경고가 새로 생기면 테스트가 실패한다.
const KNOWN_WARNINGS = [
    /React does not recognize the `%s` prop on a DOM element/, // styled-components props가 DOM으로 전달됨
    /Received `%s` for a non-boolean attribute/, // 위와 같음 (boolean props)
    /Each child in a list should have a unique "key" prop/, // TeamInfoDrawer의 key 없는 Fragment map
    /\[antd: Drawer\] `maskStyle` is deprecated/,
];

function renderApp() {
    return renderWithTheme(
        <ContextProvider>
            <App />
        </ContextProvider>,
    );
}

describe('App', () => {
    // React·antd가 남기는 경고(호환성, deprecated API 등)를 수집한다.
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

        server.use(
            http.get(`${url}/teams`, () => HttpResponse.json(teams)),
            http.get(`${url}/ensembles`, () => HttpResponse.json(ensembles)),
            http.get(`${url}/notes`, () => HttpResponse.json(notes)),
            http.get(`${url}/notices`, () => HttpResponse.json(notices)),
            http.get(`${url}/team/:id`, () => HttpResponse.json(teams[0])),
        );
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
        expect(screen.getByRole('button', { name: /합주 추가/ })).toBeInTheDocument();
        expect(unexpectedWarnings()).toEqual([]);
    });
});
