import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDrawerStore } from './drawer';

// Drawer 스택 (3-9에 context/drawer에서 옮김. V-6: 호환용 useDrawerContext 별칭을 지우고 context 테스트에서 옮김)
describe('useDrawerStore', () => {
    it('openDrawer는 스택에 쌓고, closeDrawer는 맨 위 하나만 닫는다', () => {
        const { result } = renderHook(() => useDrawerStore());

        act(() => result.current.openDrawer('teamInfo'));
        act(() => result.current.openDrawer('addTeam'));
        expect(result.current.openedDrawers).toEqual(['teamInfo', 'addTeam']);

        act(() => result.current.closeDrawer());
        expect(result.current.openedDrawers).toEqual(['teamInfo']);
    });

    it('closeAllDrawers는 스택을 비운다', () => {
        const { result } = renderHook(() => useDrawerStore());

        act(() => result.current.openDrawer('notice'));
        act(() => result.current.openDrawer('addTeam'));
        act(() => result.current.closeAllDrawers());
        expect(result.current.openedDrawers).toEqual([]);
    });

    it('setOpenedDrawers는 스택을 통째로 바꾼다', () => {
        const { result } = renderHook(() => useDrawerStore());

        act(() => result.current.openDrawer('teamInfo'));
        act(() => result.current.openDrawer('addTeam'));
        act(() => result.current.setOpenedDrawers(['teamInfo']));
        expect(result.current.openedDrawers).toEqual(['teamInfo']);
    });

    it('컴포넌트 밖에서도 getState()로 읽고 바꿀 수 있고, 구독 중인 컴포넌트가 다시 렌더링된다', () => {
        const { result } = renderHook(() => useDrawerStore((state) => state.openedDrawers));

        act(() => useDrawerStore.getState().openDrawer('notice'));
        expect(result.current).toEqual(['notice']);
    });

    // 테스트끼리 상태가 이어지지 않도록 setup.ts가 매 테스트 뒤 초기화한다 (위 테스트에서 연 'notice'가 남지 않음)
    it('테스트가 끝나면 초기 상태로 돌아간다', () => {
        expect(useDrawerStore.getState().openedDrawers).toEqual([]);
    });
});
