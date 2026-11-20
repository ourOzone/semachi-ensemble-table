import { useState, useCallback, useRef } from 'react';
import type { InputRef } from 'antd';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { checkTeamPin } from '@/api/team';
import { useTeamContext } from '@/context';
import OkButton from '@/components/common/OkButton';
import PinInput from '@/components/common/PinInput';
import useMessage from '@/hooks/useMessage';
import type { DrawerId } from '@/types';
import type { CheckTeamExists, HandleDeleteTeam } from './types';

const maxInput = 4;

interface DeleteTeamDrawerProps {
    drawerId: DrawerId;
    checkTeamExists: CheckTeamExists;
    handleDeleteTeam: HandleDeleteTeam;
}

const DeleteTeamDrawer = ({
    drawerId,
    checkTeamExists,
    handleDeleteTeam,
}: DeleteTeamDrawerProps) => {
    const { id, pin, setPin } = useTeamContext();
    const [error, setError] = useState(false); // 4자리 다 입력했는데 틀린 경우에만 true
    const [message, contextHolder] = useMessage();
    const focusInputRef = useRef<InputRef>(null);

    const onClose = useCallback(() => {
        setPin('');
        setError(false);
    }, [setPin]);

    const handlePinChange = useCallback(
        async (value: string, id: string) => {
            const numeric = value.replace(/\D/g, '');
            if (numeric.length <= maxInput) {
                setPin(numeric);
                setError(true);

                if (numeric.length === maxInput) {
                    // 4자리 모두 입력한 경우
                    try {
                        if (await checkTeamExists(id)) {
                            // PIN 판별
                            const result = await checkTeamPin(id, numeric);
                            setError(!result);
                        }
                    } catch {
                        message.error(
                            '인터넷이 불안정하거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.',
                        );
                    }
                }
            }
        },
        [setPin],
    );

    return (
        <Drawer drawerId={drawerId} onClose={onClose} focusInputRef={focusInputRef}>
            <Title>PIN 입력해야 삭제돼요 🔑</Title>
            <InputWrapper>
                <StyledInput
                    ref={focusInputRef}
                    value={pin}
                    type="password"
                    onChange={(e) => handlePinChange(e.target.value, id)}
                    inputMode="numeric"
                    controls={false}
                    placeholder="숫자 4자리"
                    error={error}
                    status={pin.length === 4 && error ? 'error' : undefined}
                    onKeyDown={(e) => {
                        // Enter 키 누를시
                        if (e.key === 'Enter' && !error && pin.length === maxInput) {
                            handleDeleteTeam(id);
                        }
                    }}
                />
            </InputWrapper>
            <OkButton
                label="진짜 삭제해요"
                onClick={() => handleDeleteTeam(id)}
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

export default DeleteTeamDrawer;
