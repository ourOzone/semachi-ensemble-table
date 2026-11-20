import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { useTeamContext, useDrawerContext } from '@/context';
import type { InputRef } from 'antd';
import type { DrawerId } from '@/types';
import type { HandleAddTeam } from '../types';
import OkButton from '@/components/common/OkButton';
import PinInput from '@/components/common/PinInput';

const maxInput = 4;

interface AddTeamDrawer5Props {
    drawerId: DrawerId;
    handleAddTeam: HandleAddTeam;
}

const AddTeamDrawer5 = ({ drawerId, handleAddTeam }: AddTeamDrawer5Props) => {
    const { type, name, desc, pin, setPin } = useTeamContext();
    const { openDrawer } = useDrawerContext();
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState(true);
    const focusInputRef = useRef<InputRef>(null);

    const handleClick = useCallback(
        (type: string, name: string, desc: string[], pin: string) => {
            // await하지 않아 저장 성공 여부와 관계없이 완료 화면(addTeam6)을 연다 (3단계 정리 대상)
            handleAddTeam(type, name, desc, pin);
            setConfirmPin('');
            setError(true);
            openDrawer('addTeam6');
        },
        [handleAddTeam, openDrawer],
    );

    const onClose = useCallback(() => {
        setPin('');
        setConfirmPin('');
        setError(true);
    }, [setPin]);

    const handlePinChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const numeric = e.target.value.replace(/\D/g, '');
            if (numeric.length <= maxInput) {
                setPin(numeric);
                setConfirmPin('');
                setError(true);
            }
        },
        [setPin],
    );

    const handleConfirmChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const numeric = e.target.value.replace(/\D/g, '');
            if (numeric.length <= maxInput) {
                setConfirmPin(numeric);
                setError(pin !== numeric);
            }
        },
        [pin],
    );

    const isConfirmVisible = pin.length === maxInput;
    const isConfirmError = confirmPin.length === maxInput && error;

    return (
        <Drawer drawerId={drawerId} onClose={onClose} focusInputRef={focusInputRef}>
            <Title>PIN 만들어요 🔑</Title>
            <InputWrapper>
                <PinInput
                    ref={focusInputRef}
                    value={pin}
                    type="password"
                    onChange={handlePinChange}
                    inputMode="numeric"
                    placeholder="숫자 4자리"
                />
                <ConfirmInput
                    value={confirmPin}
                    type="password"
                    onChange={handleConfirmChange}
                    inputMode="numeric"
                    placeholder="한 번 더"
                    $visible={isConfirmVisible}
                    $error={error}
                    status={isConfirmError ? 'error' : undefined}
                    onKeyDown={(e) => {
                        // Enter 키 누를시
                        if (e.key === 'Enter' && !error && confirmPin.length === maxInput) {
                            handleClick(type, name, desc, pin);
                        }
                    }}
                />
            </InputWrapper>
            <OkButton
                onClick={() => handleClick(type, name, desc, pin)}
                disabled={error || confirmPin.length !== maxInput}
                label="완료"
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

interface ConfirmInputProps {
    /** 항상 PIN 문자열 (antd Input의 value 타입을 좁힘) */
    value: string;
    $visible: boolean;
    /** 첫 PIN과 다르면 true */
    $error: boolean;
}

const ConfirmInput = styled(PinInput)<ConfirmInputProps>`
    color: ${({ theme, $error, value }) =>
        value?.length === maxInput && $error ? theme.danger : theme.title};

    transition:
        opacity 0.3s ease,
        visibility 0.3s ease;
    opacity: ${({ $visible }) => ($visible ? 1 : 0)};
    visibility: ${({ $visible }) => ($visible ? 'visible' : 'hidden')};
`;

export default AddTeamDrawer5;
