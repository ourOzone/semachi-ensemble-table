import { screen, waitFor } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * 문구로 버튼을 찾고, 활성화될 때까지 기다린다.
 * OkButton은 비활성일 때 visibility: hidden이라 접근성 이름이 비어 role로 찾을 수 없고,
 * PIN 서버 확인처럼 비동기로 활성화되는 경우가 많다.
 */
export async function findEnabledButton(label: string): Promise<HTMLButtonElement> {
    let button: HTMLButtonElement | null = null;
    await waitFor(() => {
        button = screen.getByText(label).closest('button');
        expect(button).toBeEnabled();
    });
    return button!;
}
