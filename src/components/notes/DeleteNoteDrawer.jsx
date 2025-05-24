import { useState, useCallback } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { noteExists, checkNotePin } from "api/note";
import useMessage from 'hooks/useMessage';
import { useDrawerContext } from "context";
import OkButton from "components/common/OkButton";
import PinInput from "components/common/PinInput";

const maxInput = 4;

const DeleteNoteDrawer = ({
    drawerId,
    id,
    pin,
    setPin,
    error,
    setError,
    handleDeletePinChange,
    handleDeleteNote
}) => {
    const { openDrawer, closeAllDrawers } = useDrawerContext();
    const [message, contextHolder] = useMessage();

    const onClose = useCallback(() => {
        setPin('');
        setError(false);
    }, [setPin]);

    return (
        <Drawer drawerId={drawerId} onClose={onClose}>
            {contextHolder}
            <Title>PIN 입력해야 삭제돼요 🔑</Title>
            <InputWrapper>
                <StyledInput
                    value={pin}
                    type="password"
                    onChange={(e) => handleDeletePinChange(e.target.value, id)}
                    inputMode="numeric"
                    controls={false}
                    placeholder="숫자 4자리"
                    error={error}
                    status={pin.length === maxInput && error ? 'error' : null}
                    onKeyDown={(e) => { // Enter 키 누를시
                        if (e.key === 'Enter' && !error && pin.length === maxInput) {
                            handleDeleteNote(id);
                        }
                    }}
                />
            </InputWrapper>
            
            <OkButton
                label="진짜 삭제해요"
                onClick={() => handleDeleteNote(id)}
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


const StyledInput = styled(PinInput)`
    color: ${({ theme, value, error }) => value.length === maxInput && error ? theme.danger : theme.title};
`;

export default DeleteNoteDrawer;