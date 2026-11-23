import { screen, waitFor, within } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * 문구로 버튼을 찾고, 활성화될 때까지 기다린다.
 * OkButton은 비활성일 때 visibility: hidden이라 접근성 이름이 비어 role로 찾을 수 없고,
 * PIN 서버 확인처럼 비동기로 활성화되는 경우가 많다.
 * 같은 문구가 화면 여러 곳에 있으면 container로 범위를 좁힌다.
 */
export async function findEnabledButton(
    label: string,
    container?: HTMLElement,
): Promise<HTMLButtonElement> {
    const queries = container ? within(container) : screen;
    let button: HTMLButtonElement | null = null;
    await waitFor(() => {
        button = queries.getByText(label).closest('button');
        expect(button).toBeEnabled();
    });
    return button!;
}

/** Drawer 안의 문구(제목 등)로 그 Drawer 영역을 찾는다 */
export async function findDrawer(text: string | RegExp): Promise<HTMLElement> {
    const element = await screen.findByText(text);
    const drawer = element.closest<HTMLElement>('.ant-drawer-content');
    expect(drawer).not.toBeNull();
    return drawer!;
}

/**
 * 새 UI(View 개편)의 Drawer를 제목으로 찾는다.
 * shadcn Drawer(vaul)는 Radix Dialog 기반이라 role="dialog"이고, 접근성 이름은 DrawerTitle이다.
 */
export function findDialog(name: string | RegExp): Promise<HTMLElement> {
    return screen.findByRole('dialog', { name });
}
