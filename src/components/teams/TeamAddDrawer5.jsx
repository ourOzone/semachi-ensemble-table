import { useState, useEffect, useMemo } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Input } from "antd";
import { useCustomContext } from "context";
import OkButton from "components/common/OkButton";

const drawerId = 'teamAdd5';

const maxInput = 4;

const TeamAddDrawer5 = ({ pin, setPin }) => {
    const { openDrawer } = useCustomContext();
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState(true);

    const handleClick = () => {
        openDrawer('teamAdd6');
    };

    const onClose = () => {
        setPin('');
    }

    const handlePinChange = (e) => {
        setConfirmPin('');
        const numeric = e.target.value.replace(/\D/g, '');
        if (numeric.length <= 4) {
            setPin(numeric);
            setError(true);
        }
    };

    const handleConfirmChange = (e) => {
        const numeric = e.target.value.replace(/\D/g, '');
        if (numeric.length <= 4) {
            setConfirmPin(numeric);

            if (pin === numeric) {
                setError(false);
            } else {
                setError(true);
            }
        }
    };

    return (
        <Drawer drawerId={drawerId} onClose={onClose}>
            <Title>PIN 만들어요 🔑</Title>
            <InputWrapper>
                <StyledInput
                    value={pin}
                    type="password"
                    onChange={handlePinChange}
                    inputMode="numeric"
                    controls={false}
                    placeholder="숫자 4자리"
                />
                <ConfirmInput
                    value={confirmPin}
                    type="password"
                    onChange={handleConfirmChange}
                    inputMode="numeric"
                    controls={false}
                    placeholder="한 번 더"
                    visible={pin.length === 4}
                    error={error}
                    status={confirmPin.length === 4 && error ? 'error' : null}
                />
            </InputWrapper>
            <OkButton
                onClick={handleClick}
                disabled={error}
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
    color: ${({ theme, value, error }) => value.length === 4 && error ? theme.danger : theme.title};

    transition: opacity 0.3s ease, visibility 0.3s ease;
    opacity: ${({ visible }) => (visible ? 1 : 0)};
    visibility: ${({ visible }) => (visible ? 'visible' : 'hidden')};
`;

export default TeamAddDrawer5;