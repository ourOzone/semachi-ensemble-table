import { useState, useCallback, useRef } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { checkNoticePin } from "api/notice";
import useMessage from 'hooks/useMessage';
import OkButton from "components/common/OkButton";
import PinInput from "components/common/PinInput";

const maxInput = 4;

const DeleteNoticeDrawer = ({
    drawerId,
    id,
    pin,
    setPin,
    checkNoticeExists,
    handleDeleteNotice
}) => {
    const [message, contextHolder] = useMessage();
    const [error, setError] = useState(false); // 4자리 다 입력했는데 틀린 경우에만 true
    const focusInputRef = useRef(null);

    const onClose = useCallback(() => {
        setPin('');
        setError(false);
    }, [setPin]);

    const handlePinChange = useCallback(async (id, value) => {
        const numeric = value.replace(/\D/g, '');
        if (numeric.length <= maxInput) {
            setPin(numeric);
            setError(true);

            if (numeric.length === maxInput) {
                // 4자리 모두 입력한 경우
                try {
                    if (await checkNoticeExists(id)) {
                        // PIN 판별
                        const result = await checkNoticePin(numeric);
                        setError(!result);
                    }
                } catch {
                    message.error('인터넷이 불안정하거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.');
                }
            }
        }
    }, [setPin]);

    return (
        <Drawer drawerId={drawerId} onClose={onClose} focusInputRef={focusInputRef}>
            {contextHolder}
            <Title>PIN 입력해야 삭제돼요 🔑</Title>
            <InputWrapper>
                <StyledPinInput
                    ref={focusInputRef}
                    value={pin}
                    type="password"
                    onChange={(e) => handlePinChange(id, e.target.value)}
                    inputMode="numeric"
                    controls={false}
                    placeholder="숫자 4자리"
                    error={error}
                    status={pin.length === maxInput && error ? 'error' : null}
                    onKeyDown={(e) => { // Enter 키 누를시
                        if (e.key === 'Enter' && !error && pin.length === maxInput) {
                            handleDeleteNotice(id);
                        }
                    }}
                />
            </InputWrapper>
            
            <OkButton
                label="진짜 삭제해요"
                onClick={() => handleDeleteNotice(id)}
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


const StyledPinInput = styled(PinInput)`
    color: ${({ theme, value, error }) => value.length === maxInput && error ? theme.danger : theme.title};
`;

export default DeleteNoticeDrawer;