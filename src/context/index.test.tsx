import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContextProvider, useDrawerContext, useEnsembleContext, useTeamContext } from '.';

const wrapper = ContextProvider;

describe('context 훅', () => {
    it('Provider 밖에서 호출하면 에러를 낸다', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {}); // React의 에러 로그 숨김
        expect(() => renderHook(() => useDrawerContext())).toThrow(/ContextProvider/);
    });
});

describe('DrawerContext', () => {
    it('openDrawer는 스택에 쌓고, closeDrawer는 맨 위 하나만 닫는다', () => {
        const { result } = renderHook(() => useDrawerContext(), { wrapper });

        act(() => result.current.openDrawer('teamInfo'));
        act(() => result.current.openDrawer('updateTeam1'));
        expect(result.current.openedDrawers).toEqual(['teamInfo', 'updateTeam1']);

        act(() => result.current.closeDrawer());
        expect(result.current.openedDrawers).toEqual(['teamInfo']);
    });

    it('closeAllDrawers는 스택을 비운다', () => {
        const { result } = renderHook(() => useDrawerContext(), { wrapper });

        act(() => result.current.openDrawer('notice'));
        act(() => result.current.openDrawer('addNotice'));
        act(() => result.current.closeAllDrawers());
        expect(result.current.openedDrawers).toEqual([]);
    });
});

describe('TeamContext', () => {
    it('setTeamStates를 인자 없이 호출하면 초기값으로 되돌린다', () => {
        const { result } = renderHook(() => useTeamContext(), { wrapper });

        act(() => result.current.setTeamStates('id-1', '기타 등등', '비틀즈', ['a'], '1234'));
        expect(result.current).toMatchObject({ id: 'id-1', name: '비틀즈', pin: '1234' });

        act(() => result.current.setTeamStates());
        expect(result.current).toMatchObject({
            id: '',
            type: '',
            name: '',
            desc: ['', '', '', '', '', '', ''],
            pin: '',
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
