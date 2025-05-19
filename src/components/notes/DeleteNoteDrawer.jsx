import { useState, useCallback } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { checkNotePin } from "api/note";
import { useDrawerContext } from "context";
import OkButton from "components/common/OkButton";
import PinInput from "components/common/PinInput";

const maxInput = 4;

const DeleteNoteDrawer = ({ drawerId, id, pin, setPin, handleDeleteNote }) => {
    const { openDrawer } = useDrawerContext();
    const [error, setError] = useState(false); // 4자리 다 입력했는데 틀린 경우에만 true

    const onClose = useCallback(() => {
        setPin('');
        setError(false);
    }, [setPin]);

    const handlePinChange = useCallback(async (value, id) => {
        const numeric = value.replace(/\D/g, '');
        if (numeric.length <= maxInput) {
            setPin(numeric);

            if (numeric.length === maxInput) {
                // 4자리 모두 입력한 경우
                setPin(numeric);

                // PIN 판별
                const result = await checkNotePin(id, numeric);

                setError(!result);
            }
        }
    }, [setPin, openDrawer]);

    return (
        <Drawer drawerId={drawerId} onClose={onClose}>
            <Title>PIN 입력해야 삭제돼요 🔑</Title>
            <InputWrapper>
                <StyledInput
                    value={pin}
                    type="password"
                    onChange={(e) => handlePinChange(e.target.value, id)}
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