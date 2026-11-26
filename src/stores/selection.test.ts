import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { useEnsembleSelectionStore, useTeamSelectionStore } from './selection';

// 지금 보고 있는 팀·합주 (V-6: context/team·ensemble 테스트에서 옮김)

describe('useTeamSelectionStore', () => {
    it('setTeamStates를 인자 없이 호출하면 초기값으로 되돌린다', () => {
        const { setTeamStates } = useTeamSelectionStore.getState();

        setTeamStates('id-1', '기타 팀', '비틀즈', ['a']);
        expect(useTeamSelectionStore.getState()).toMatchObject({
            id: 'id-1',
            name: '비틀즈',
            desc: ['a'],
        });

        setTeamStates();
        expect(useTeamSelectionStore.getState()).toMatchObject({
            id: '',
            type: '',
            name: '',
            desc: ['', '', '', '', '', '', ''],
        });
    });
});

describe('useEnsembleSelectionStore', () => {
    it('setEnsembleStates를 인자 없이 호출하면 선택값을 null로 되돌린다', () => {
        const { setEnsembleStates } = useEnsembleSelectionStore.getState();

        setEnsembleStates('e-1', true, null, 2, 5);
        expect(useEnsembleSelectionStore.getState()).toMatchObject({
            id: 'e-1',
            repeat: true,
            startTime: 2,
            endTime: 5,
        });

        setEnsembleStates();
        expect(useEnsembleSelectionStore.getState()).toMatchObject({
            id: '',
            repeat: false,
            nextDate: null,
            startTime: null,
            endTime: null,
        });
    });

    it('setNextDate·setRepeat는 값, 또는 이전 값으로 계산하는 함수를 받는다 (미루기: 7일 뒤)', () => {
        const { setNextDate, setRepeat } = useEnsembleSelectionStore.getState();
        setNextDate(dayjs('2026-11-26'));
        setNextDate((prev) => dayjs(prev).add(7, 'day'));
        expect(useEnsembleSelectionStore.getState().nextDate?.format('YYYY-MM-DD')).toBe(
            '2026-12-03',
        );
        setRepeat(true);
        expect(useEnsembleSelectionStore.getState().repeat).toBe(true);
    });
});
