import { useState, useCallback, useRef } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { checkTeamPin } from "api/team";
import { useTeamContext } from "context";
import OkButton from "components/common/OkButton";
import PinInput from "components/common/PinInput";

const maxInput = 4;

const DeleteTeamDrawer = ({ drawerId, handleDeleteTeam }) => {
    const { id, pin, setPin } = useTeamContext();
    const [error, setError] = useState(false); // 4자리 다 입력했는데 틀린 경우에만 true
    const focusInputRef = useRef(null);

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
                const result = await checkTeamPin(id, numeric);

                setError(!result);
            }
        }
    }, [setPin]);

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
                    status={pin.length === 4 && error ? 'error' : null}
                    onKeyDown={(e) => { // Enter 키 누를시
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


const StyledInput = styled(PinInput)`
    color: ${({ theme, value, error }) => value.length === maxInput && error ? theme.danger : theme.title};
`;

export default DeleteTeamDrawer;