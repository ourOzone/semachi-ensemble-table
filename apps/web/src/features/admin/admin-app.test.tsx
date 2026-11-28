import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { url } from '@/constants/index';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import AdminApp from './admin-app';
import { actionLabel, changes, formatDevice, isSystemAction, pinLabel } from './labels';

// 관리자 화면 (백엔드 개편 B-7): 마스터 PIN 로그인 → 요약·활동 기록·방문자·마스터 PIN 바꾸기
const A = '0b8a5c7e-1f2d-4c3b-9a8e-7d6c5b4a3f21';
const B = '1c9b6d8f-2e3a-4d4c-8b9f-8e7d6c5b4a32';

const activity = (over: Record<string, unknown> = {}) => ({
    _id: `a${Math.random()}`,
    at: '2026-11-27T05:03:22.000Z',
    env: 'production',
    visitorId: A,
    ip: '203.0.113.7',
    userAgent: 'agent',
    device: { kind: 'mobile', os: 'iOS 18.1', browser: 'Safari 18' },
    action: 'team.update',
    target: { kind: 'team', id: 't1', name: '테스트밴드' },
    before: { name: '옛 이름', type: '교내 공연' },
    after: { name: '새 이름', type: '교내 공연' },
    pin: 'own',
    result: 'ok',
    ...over,
});

const overview = {
    visitors24h: 12,
    pinFailures: [
        {
            visitorId: B,
            count: 7,
            blocked: 1,
            lastAt: '2026-11-27T05:00:00.000Z',
            ips: ['198.51.100.2'],
        },
    ],
    masterUses: [
        activity({
            action: 'notice.create',
            pin: 'master',
            target: { kind: 'notice', name: '공지' },
        }),
    ],
    masterPinSource: 'env',
};

function mockAdmin({ loggedIn }: { loggedIn: boolean }) {
    let admin = loggedIn;
    server.use(
        http.get(`${url}/admin/session`, () => HttpResponse.json({ admin })),
        http.post(`${url}/admin/login`, async ({ request }) => {
            const { pin } = (await request.json()) as { pin: string };
            if (pin !== '9999') {
                return HttpResponse.json(
                    { error: 'Wrong PIN' },
                    { status: 403, headers: { 'Pin-Attempts': '3/10' } },
                );
            }
            admin = true;
            return HttpResponse.json({ admin: true });
        }),
        http.post(`${url}/admin/logout`, () => {
            admin = false;
            return HttpResponse.json({ admin: false });
        }),
        http.get(`${url}/admin/overview`, () => HttpResponse.json(overview)),
    );
}

describe('관리자 화면', () => {
    it('로그인: 틀리면 "(3/10)", 맞으면 요약 (24시간 방문자·PIN 많이 틀린 방문자·마스터 PIN 사용)', async () => {
        mockAdmin({ loggedIn: false });
        const user = userEvent.setup();
        renderWithProviders(<AdminApp />);

        await user.type(await screen.findByLabelText('PIN 4자리'), '0000');
        expect(await screen.findByText('PIN이 맞지 않아요 (3/10)')).toBeInTheDocument();

        await user.type(screen.getByLabelText('PIN 4자리'), '9999');
        expect(await screen.findByText('12명')).toBeInTheDocument();
        expect(screen.getByText('7번 틀림')).toBeInTheDocument();
        expect(screen.getByText('(막힘 1번)')).toBeInTheDocument();
        expect(screen.getByText('공지 올리기')).toBeInTheDocument();
        expect(screen.getByText('마스터 PIN')).toBeInTheDocument();
    });

    it('너무 많이 틀려 막히면 남은 분', async () => {
        server.use(
            http.get(`${url}/admin/session`, () => HttpResponse.json({ admin: false })),
            http.post(`${url}/admin/login`, () =>
                HttpResponse.json(
                    { error: 'Too many PIN attempts' },
                    { status: 429, headers: { 'Retry-After': '600' } },
                ),
            ),
        );
        const user = userEvent.setup();
        renderWithProviders(<AdminApp />);
        await user.type(await screen.findByLabelText('PIN 4자리'), '0000');
        expect(
            await screen.findByText('너무 많이 틀렸어요. 10분 뒤에 다시 입력해 주세요'),
        ).toBeInTheDocument();
    });

    it('활동 기록: 거르기, 자세히(바뀐 것·기기·IP), 방문자를 누르면 그 방문자와 같은 IP의 다른 방문자', async () => {
        mockAdmin({ loggedIn: true });
        const queries: string[] = [];
        server.use(
            http.get(`${url}/admin/activities`, ({ request }) => {
                queries.push(new URL(request.url).search);
                return HttpResponse.json({ activities: [activity()] });
            }),
            http.get(`${url}/admin/visitors/:id`, ({ params }) =>
                HttpResponse.json({
                    visitorId: params.id,
                    firstSeen: '2026-11-01T00:00:00.000Z',
                    lastSeen: '2026-11-27T05:03:22.000Z',
                    count: 3,
                    ips: ['203.0.113.7'],
                    devices: [
                        {
                            userAgent: 'agent',
                            device: { kind: 'mobile', os: 'iOS 18.1' },
                            count: 3,
                        },
                    ],
                    related: [
                        {
                            visitorId: B,
                            lastSeen: '2026-11-26T00:00:00.000Z',
                            count: 5,
                            sharedIps: ['203.0.113.7'],
                            sameDevice: true,
                        },
                    ],
                    activities: [activity()],
                }),
            ),
        );
        const user = userEvent.setup();
        renderWithProviders(<AdminApp />);

        await user.click(await screen.findByRole('tab', { name: '활동 기록' }));
        expect(await screen.findByText('팀 수정')).toBeInTheDocument();
        await user.selectOptions(screen.getByLabelText('동작'), 'team');
        await user.selectOptions(screen.getByLabelText('결과'), 'wrong-pin');
        await waitFor(() => expect(queries[queries.length - 1]).toContain('action=team'));
        expect(queries[queries.length - 1]).toContain('result=wrong-pin');

        await user.click(screen.getByRole('button', { name: '자세히' }));
        expect(screen.getByText(/옛 이름 →/)).toBeInTheDocument();
        expect(screen.getByText('새 이름')).toBeInTheDocument();
        expect(screen.getByText('모바일 · iOS 18.1 · Safari 18')).toBeInTheDocument();
        expect(screen.getByText('203.0.113.7')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: `방문자 ${A.slice(0, 8)}의 기록` }));
        const heading = await screen.findByRole('heading', { name: `방문자 ${A.slice(0, 8)}` });
        const detail = heading.closest('section')!;
        expect(within(detail).getByText('3건')).toBeInTheDocument();
        expect(
            within(detail).getByText(/같은 IP 203.0.113.7 · 같은 기기 · 5건/),
        ).toBeInTheDocument();
        await user.click(within(detail).getByRole('button', { name: '뒤로' }));
        expect(await screen.findByRole('tab', { name: '활동 기록' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });

    it('설정: 마스터 PIN 바꾸기 (지금 PIN + 새 PIN 두 번)', async () => {
        mockAdmin({ loggedIn: true });
        let body: unknown;
        server.use(
            http.put(`${url}/admin/master-pin`, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json({ message: 'Master PIN changed' });
            }),
        );
        const user = userEvent.setup();
        renderWithProviders(<AdminApp />);

        await user.click(await screen.findByRole('tab', { name: '설정' }));
        expect(await screen.findByText(/서버 설정\(\.env\)의 처음 PIN/)).toBeInTheDocument();
        await user.type(screen.getByLabelText('지금 마스터 PIN'), '9999');
        await user.type(screen.getByLabelText('새 PIN'), '2580');
        await user.type(screen.getByLabelText('새 PIN 한 번 더'), '2581');
        expect(screen.getByRole('button', { name: '새 PIN이 서로 달라요' })).toBeDisabled();
        await user.clear(screen.getByLabelText('새 PIN 한 번 더'));
        await user.type(screen.getByLabelText('새 PIN 한 번 더'), '2580');
        await user.click(screen.getByRole('button', { name: '바꾸기' }));

        expect(await screen.findByText('마스터 PIN을 바꿨어요.')).toBeInTheDocument();
        expect(body).toEqual({ currentPin: '9999', newPin: '2580' });
    });

    it('로그아웃하면 로그인 화면', async () => {
        mockAdmin({ loggedIn: true });
        const user = userEvent.setup();
        renderWithProviders(<AdminApp />);
        await user.click(await screen.findByRole('button', { name: '로그아웃' }));
        expect(await screen.findByText('마스터 PIN 4자리를 입력해 주세요')).toBeInTheDocument();
    });
});

describe('labels', () => {
    it('바뀐 것만, 어떤 PIN, 기기', () => {
        expect(changes({ name: 'A', type: 'x' }, { name: 'B', type: 'x' })).toEqual([
            { key: 'name', from: 'A', to: 'B' },
        ]);
        expect(pinLabel({ pin: 'own', target: { kind: 'note' } })).toBe('글 PIN');
        expect(pinLabel({ pin: 'own', target: { kind: 'team' } })).toBe('팀 PIN');
        expect(pinLabel({ pin: 'master', target: undefined })).toBe('마스터 PIN');
        expect(formatDevice({ kind: 'desktop', os: 'Windows 10', browser: 'Chrome 131' })).toBe(
            'PC · Windows 10 · Chrome 131',
        );
    });

    it('정리 작업의 자동 삭제 (백엔드 개편 B-9): 서버가 스스로 한 일', () => {
        expect(actionLabel('team.expire')).toBe('팀 자동 삭제');
        expect(actionLabel('ensemble.expire')).toBe('합주 자동 삭제');
        expect(isSystemAction('team.expire')).toBe(true);
        expect(isSystemAction('team.delete')).toBe(false);
    });
});
