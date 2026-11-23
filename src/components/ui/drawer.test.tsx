import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { findDialog } from '@/test/queries';
import { renderWithTheme } from '@/test/render';

// 단일 Drawer(사전 결정 2: vaul)가 테스트 환경(jsdom)에서 열고 닫히는지 확인한다.
// 기능 단계(V-2~)의 흐름 테스트가 이 동작에 기대므로 기반 작업에서 먼저 확인해 둔다.
function Example() {
    const [name, setName] = useState('');
    return (
        <Drawer>
            <DrawerTrigger asChild>
                <Button>열기</Button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerTitle>합주 추가</DrawerTitle>
                <DrawerDescription>시간을 골라요</DrawerDescription>
                <input aria-label="이름" value={name} onChange={(e) => setName(e.target.value)} />
                <DrawerClose asChild>
                    <Button>닫기</Button>
                </DrawerClose>
            </DrawerContent>
        </Drawer>
    );
}

describe('Drawer (vaul)', () => {
    it('열면 제목으로 찾을 수 있고, 안에서 입력할 수 있고, 닫으면 사라진다', async () => {
        const user = userEvent.setup();
        renderWithTheme(<Example />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '열기' }));

        const dialog = await findDialog('합주 추가');
        expect(dialog).toHaveAccessibleDescription('시간을 골라요');

        const input = within(dialog).getByRole('textbox', { name: '이름' });
        await user.type(input, '테스트밴드');
        expect(input).toHaveValue('테스트밴드');

        await user.click(within(dialog).getByRole('button', { name: '닫기' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
});
