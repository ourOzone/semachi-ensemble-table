import { useState, useEffect, useMemo } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { InputNumber } from "antd";
import { useCustomContext } from "context";
import OkButton from "components/common/OkButton";

const drawerId = 'teamAdd5';

const maxInput = 4;

const TeamAddDrawer5 = ({ pin, setPin }) => {
    const { openDrawer } = useCustomContext();
    const [confirmPin, setConfirmPin] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');

    const handleClick = () => {
        openDrawer('teamAdd3');
    };

    const onClose = () => {
        setPin('');
    }

    const handlePinChange = (value) => {
        const val = value?.toString() ?? '';
        if (/^\d{0,4}$/.test(val)) {
            setPin(val);
            if (val.length === 4) {
                setShowConfirm(true);
                setError('');
            } else {
                setShowConfirm(false);
                setConfirmPin('');
                setError('');
            }
        }
    };

    const handleConfirmChange = (value) => {
        const val = value?.toString() ?? '';
        if (/^\d{0,4}$/.test(val)) {
            setConfirmPin(val);
            if (val.length === 4 && val !== pin) {
                setError('PIN이 일치하지 않아요');
            } else {
                setError('');
            }
        }
    };

    return (
        <Drawer drawerId={drawerId} onClose={onClose}>
            <Title>비밀번호 만들어요</Title>
            <InputWrapper>
                <StyledInput
                    value={pin}
                    onChange={handlePinChange}
                    maxLength={4}
                    type="tel"
                    inputMode="numeric"
                    controls={false}
                    placeholder="4자리 숫자"

                />

                {showConfirm && (
                    <StyledInput
                        value={confirmPin}
                        onChange={handleConfirmChange}
                        maxLength={4}
                        type="tel"
                        inputMode="numeric"
                        controls={false}
                        placeholder="한 번 더"
                        status={error ? 'error' : ''}
                    />
                )}
            </InputWrapper>

            <OkButton
                onClick={handleClick}
                disabled={pin.length !== maxInput}
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
`;


const StyledInput = styled(InputNumber)`
    font-family: Bold !important;
    color: ${({ theme }) => theme.title};
    border-radius: 1.5rem;
    width: 30rem;

    & * {
        font-family: Regular;
        font-size: 3rem;
    }

    & .ant-input-show-count-suffix {
        font-size: 1.5rem;
    }
`;

export default TeamAddDrawer5;