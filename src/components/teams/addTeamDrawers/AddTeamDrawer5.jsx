import { useState, useCallback } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Input } from "antd";
import { useTeamContext, useDrawerContext } from "context";
import OkButton from "components/common/OkButton";

const maxInput = 4;

const AddTeamDrawer5 = ({ drawerId, handleAddTeam }) => {
    const { type, name, desc, pin, setPin } = useTeamContext();
    const { openDrawer } = useDrawerContext();
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState(true);

    const handleClick = useCallback((type, name, desc, pin) => {
        handleAddTeam(type, name, desc, pin);
        openDrawer('addTeam6');
    }, [handleAddTeam, openDrawer]);

    const onClose = useCallback(() => {
        setPin('');
        setConfirmPin('');
        setError(true);
    }, [setPin]);

    const handlePinChange = useCallback((e) => {
        const numeric = e.target.value.replace(/\D/g, '');
        if (numeric.length <= maxInput) {
            setPin(numeric);
            setConfirmPin('');
            setError(true);
        }
    }, [setPin]);

    const handleConfirmChange = useCallback((e) => {
        const numeric = e.target.value.replace(/\D/g, '');
        if (numeric.length <= maxInput) {
            setConfirmPin(numeric);
            setError(pin !== numeric);
        }
    }, [pin]);

    const isConfirmVisible = pin.length === maxInput;
    const isConfirmError = confirmPin.length === maxInput && error;

    return (
        <Drawer drawerId={drawerId} onClose={onClose}>
            <Title>PIN 만들어요 🔑</Title>
            <InputWrapper>
                <StyledInput
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
                    status={isConfirmError ? 'error' : null}
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

const StyledInput = styled(Input)`
    font-family: Bold !important;
    color: ${({ theme }) => theme.title};
    border-radius: 1.5rem;
    width: 20rem;
    font-size: 3rem;
    text-align: center;

    & * {
        font-family: Regular;
    }
`;

const ConfirmInput = styled(StyledInput)`
    color: ${({ theme, $error, value }) =>
        value?.length === maxInput && $error ? theme.danger : theme.title};

    transition: opacity 0.3s ease, visibility 0.3s ease;
    opacity: ${({ $visible }) => ($visible ? 1 : 0)};
    visibility: ${({ $visible }) => ($visible ? 'visible' : 'hidden')};
`;

export default AddTeamDrawer5;
