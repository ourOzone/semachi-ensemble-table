import { useState, useCallback, useRef } from 'react';
import type { InputRef } from 'antd';
import type { Dayjs } from 'dayjs';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { checkTeamPin } from '@/api/team';
import { useTeamContext, useEnsembleContext, useDrawerContext } from '@/context';
import OkButton from '@/components/common/OkButton';
import PinInput from '@/components/common/PinInput';
import type { DrawerId, TimeSlot } from '@/types';
import type { CheckEnsembleExists, HandleSkipEnsemble } from './types';

const maxInput = 4;

interface SkipEnsembleDrawerProps {
    drawerId: DrawerId;
    checkEnsembleExists: CheckEnsembleExists;
    handleSkipEnsemble: HandleSkipEnsemble;
}

const SkipEnsembleDrawer = ({
    drawerId,
    checkEnsembleExists,
    handleSkipEnsemble,
}: SkipEnsembleDrawerProps) => {
    const { id: teamId, pin, setPin } = useTeamContext();
    const { id, repeat, nextDate, startTime, endTime } = useEnsembleContext();
    const [error, setError] = useState(false); // 4자리 다 입력했는데 틀린 경우에만 true
    const focusInputRef = useRef<InputRef>(null);

    const onClose = useCallback(() => {
        setPin('');
        setError(false);
    }, [setPin]);

    const handlePinChange = useCallback(
        async (id: string, teamId: string, value: string) => {
            const numeric = value.replace(/\D/g, '');
            if (numeric.length <= maxInput) {
                setPin(numeric);
                setError(true);

                if (numeric.length === maxInput) {
                    // 4자리 모두 입력한 경우
                    try {
                        if (await checkEnsembleExists(id)) {
                            // PIN 판별
                            const result = await checkTeamPin(teamId, numeric);
                            setError(!result);
                        }
                    } catch {
                        // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
                    }
                }
            }
        },
        [setPin],
    );

    const handleClickSkip = useCallback(
        (
            id: string,
            teamId: string,
            repeat: boolean,
            nextDate: Dayjs | null,
            startTime: TimeSlot | null,
            endTime: TimeSlot | null,
        ) => {
            setPin('');
            setError(false);
            handleSkipEnsemble(id, teamId, repeat, nextDate, startTime, endTime);
        },
        [handleSkipEnsemble, setPin],
    );

    return (
        <Drawer drawerId={drawerId} onClose={onClose} focusInputRef={focusInputRef}>
            <Title>PIN 입력해야 미룰 수 있어요 🔑</Title>
            <InputWrapper>
                <StyledInput
                    ref={focusInputRef}
                    value={pin}
                    type="password"
                    onChange={(e) => handlePinChange(id, teamId, e.target.value)}
                    inputMode="numeric"
                    controls={false}
                    placeholder="숫자 4자리"
                    error={error}
                    status={pin.length === maxInput && error ? 'error' : undefined}
                    onKeyDown={(e) => {
                        // Enter 키 누를시
                        if (e.key === 'Enter' && !error && pin.length === maxInput) {
                            handleClickSkip(id, teamId, repeat, nextDate, startTime, endTime);
                        }
                    }}
                />
            </InputWrapper>

            <OkButton
                label="다음 번에 안 해요"
                onClick={() => handleClickSkip(id, teamId, repeat, nextDate, startTime, endTime)}
                disabled={error || pin.length !== maxInput}
            />
        </Drawer>
    );
};

const Title = styled.span`
    font-size: 2.5rem;
    font-family: Bold;
`;

const InputWrapper = styled.div`
    margin: 4rem 0 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    align-items: center;
`;

interface StyledInputProps {
    /** 항상 PIN 문자열 (antd Input의 value 타입을 좁힘) */
    value: string;
    /** PIN 4자리를 다 입력했는데 틀린 경우 true */
    error: boolean;
    /** Input에는 없는 prop(InputNumber 전용)이라 효과 없이 DOM으로 전달됨 (3단계 정리 대상) */
    controls?: boolean;
}

const StyledInput = styled(PinInput)<StyledInputProps>`
    color: ${({ theme, value, error }) => (value.length === maxInput && error ? theme.danger : theme.title)};
`;

export default SkipEnsembleDrawer;
