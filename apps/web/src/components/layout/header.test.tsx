import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';

// 베타 표시 (백엔드 개편 B-11). VITE_APP_ENV는 모듈을 읽을 때 정해지므로 바꾼 뒤 헤더를 새로 가져온다
async function renderHeader() {
    vi.resetModules();
    const { default: Header } = await import('./header');
    renderWithProviders(<Header />);
}

describe('헤더의 베타 표시', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('베타 빌드(VITE_APP_ENV=beta)면 제목 옆에 "베타"', async () => {
        vi.stubEnv('VITE_APP_ENV', 'beta');
        await renderHeader();
        expect(screen.getByText('세마치 합주판')).toBeInTheDocument();
        expect(screen.getByText('베타')).toBeInTheDocument();
    });

    it.each([['production'], ['']])('운영 빌드(%s)면 없음', async (value) => {
        vi.stubEnv('VITE_APP_ENV', value);
        await renderHeader();
        expect(screen.getByText('세마치 합주판')).toBeInTheDocument();
        expect(screen.queryByText('베타')).not.toBeInTheDocument();
    });
});
