import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDrawerStore } from '@/stores/drawer';
import { ContextProvider, useDrawerContext, useEnsembleContext, useTeamContext } from '.';

const wrapper = ContextProvider;

describe('context 훅', () => {
    it('Provider 밖에서 호출하면 에러를 낸다', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {}); // React의 에러 로그 숨김
        expect(() => renderHook(() => useTeamContext())).toThrow(/ContextProvider/);
    });
});

// Drawer 상태는 Zustand store(stores/drawer)로 옮겼다. useDrawerContext는 호환용 별칭이라 Provider 없이 동작한다
describe('useDrawerContext (stores/drawer)', () => {
    it('openDrawer는 스택에 쌓고, closeDrawer는 맨 위 하나만 닫는다', () => {
        const { result } = renderHook(() => useDrawerContext());

        act(() => result.current.openDrawer('teamInfo'));
        act(() => result.current.openDrawer('addTeam'));
        expect(result.current.openedDrawers).toEqual(['teamInfo', 'addTeam']);

        act(() => result.current.closeDrawer());
        expect(result.current.openedDrawers).toEqual(['teamInfo']);
    });

    it('closeAllDrawers는 스택을 비운다', () => {
        const { result } = renderHook(() => useDrawerContext());

        act(() => result.current.openDrawer('notice'));
        act(() => result.current.openDrawer('addTeam'));
        act(() => result.current.closeAllDrawers());
        expect(result.current.openedDrawers).toEqual([]);
    });

    it('setOpenedDrawers는 스택을 통째로 바꾼다', () => {
        const { result } = renderHook(() => useDrawerContext());

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

describe('TeamContext', () => {
    it('setTeamStates를 인자 없이 호출하면 초기값으로 되돌린다', () => {
        const { result } = renderHook(() => useTeamContext(), { wrapper });

        act(() => result.current.setTeamStates('id-1', '기타 팀', '비틀즈', ['a']));
        expect(result.current).toMatchObject({ id: 'id-1', name: '비틀즈', desc: ['a'] });

        act(() => result.current.setTeamStates());
        expect(result.current).toMatchObject({
            id: '',
            type: '',
            name: '',
            desc: ['', '', '', '', '', '', ''],
        });
    });
});

describe('EnsembleContext', () => {
    it('setEnsembleStates를 인자 없이 호출하면 선택값을 null로 되돌린다', () => {
        const { result } = renderHook(() => useEnsembleContext(), { wrapper });

        act(() => result.current.setEnsembleStates('e-1', true, null, 2, 5));
        expect(result.current).toMatchObject({ id: 'e-1', repeat: true, startTime: 2, endTime: 5 });

        act(() => result.current.setEnsembleStates());
        expect(result.current).toMatchObject({
            id: '',
            repeat: false,
            nextDate: null,
            startTime: null,
            endTime: null,
        });
    });
});
