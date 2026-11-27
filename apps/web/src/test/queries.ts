import { screen } from '@testing-library/react';

/**
 * Drawer를 제목으로 찾는다. (V-6: antd용 findEnabledButton·findDrawer 삭제, ISSUES E4)
 * shadcn Drawer(vaul)는 Radix Dialog 기반이라 role="dialog"이고, 접근성 이름은 DrawerTitle이다.
 */
export function findDialog(name: string | RegExp): Promise<HTMLElement> {
    return screen.findByRole('dialog', { name });
}
