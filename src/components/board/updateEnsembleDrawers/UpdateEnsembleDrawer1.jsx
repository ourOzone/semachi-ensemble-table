import { useState, useCallback, useRef } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { checkTeamPin } from "api/team";
import { useTeamContext, useEnsembleContext, useDrawerContext } from "context";
import PinInput from "components/common/PinInput";

const maxInput = 4;

const UpdateEnsembleDrawer1 = ({ drawerId }) => {
    const { id, orgRepeat, orgNextDate, orgStartTime, orgEndTime, pin, setPin } = useTeamContext();
    const { setEnsembleStates } = useEnsembleContext();
    const { openDrawer } = useDrawerContext();
    const [error, setError] = useState(false); // 4자리 다 입력했는데 틀린 경우에만 true
    const focusInputRef = useRef(null);

    const onClose = useCallback(() => {
        setEnsembleStates(id, orgRepeat, orgNextDate, orgStartTime, orgEndTime); // 수정하기 전 상태로 돌려놓기
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
                
                if (result) {
                    setPin('');
                    openDrawer('updateEnsemble2');
                } else {
                    setError(true);
                }
            }
        }
    }, [setPin, openDrawer]);

    return (
        <Drawer drawerId={drawerId} onClose={onClose} focusInputRef={focusInputRef}>
            <Title>PIN 입력해야 수정돼요 🔑</Title>
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
                />
            </InputWrapper>
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

export default UpdateEnsembleDrawer1;