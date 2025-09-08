import { useState, useCallback, useRef } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { checkNoticePin } from "api/notice";
import { Button, Input } from "antd";
import useMessage from 'hooks/useMessage';
import OkButton from "components/common/OkButton";
import PinInput from "components/common/PinInput";

const { TextArea } = Input;
const maxInput = 200;
const minRows = 4;
const maxRows = 10;
const maxPinInput = 4;

const countLines = (value) => {
    const lines = value.split('\n').length;
    return Math.min(Math.max(lines, minRows), maxRows);
};

const AddNoticeDrawer = ({
    drawerId,
    text,
    setText,
    pin,
    setPin,
    handleAddNotice
}) => {
    const [message, contextHolder] = useMessage();
    const [error, setError] = useState(false); // 4자리 다 입력했는데 틀린 경우에만 true
    const isOverLimit = text.length > maxInput;
    const focusInputRef = useRef(null);

    const onClose = useCallback(() => {
        setText('');
        setPin('');
        setError(false);
    }, []);

    const handlePinChange = useCallback(async (value) => {
        const numeric = value.replace(/\D/g, '');
        if (numeric.length <= maxPinInput) {
            setPin(numeric);
            setError(true);
    
            if (numeric.length === maxPinInput) {
                // 4자리 모두 입력한 경우
                try {
                    // PIN 판별
                    const result = await checkNoticePin(numeric);
                    setError(!result);
                } catch {
                    message.error('인터넷이 불안정하거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.');
                }
            }
        }
    }, [setPin]);

    return (
        <>
            {contextHolder}
            <Drawer drawerId={drawerId} onClose={onClose} focusInputRef={focusInputRef}>
                <Wrapper>
                    <StyledTextArea
                        ref={focusInputRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="내용 여따 써요"
                        rows={countLines(text)}
                        $isOverLimit={isOverLimit}
                    />
                    <StyledPinInput
                        value={pin}
                        type="password"
                        onChange={(e) => handlePinChange(e.target.value)}
                        inputMode="numeric"
                        controls={false}
                        placeholder="숫자 4자리"
                        error={error}
                        status={pin.length === maxPinInput && error ? 'error' : null}
                        onKeyDown={(e) => { // Enter 키 누를시
                            if (e.key === 'Enter' && !error && pin.length === maxPinInput) {
                                handleAddNotice(text, pin);
                            }
                        }}
                    />
                    <OkButton
                        onClick={() => {handleAddNotice(text, pin)}}
                        disabled={error || !text || pin.length !== maxPinInput}
                        label="완료"
                    />
                </Wrapper>
            </Drawer>
        </>
    );
};

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
`;

const StyledTextArea = styled(TextArea)`
    margin-top: 4rem;
    font-size: 1.5rem;
    font-family: Bold !important;
    color: ${({ theme, $isOverLimit }) => $isOverLimit ? theme.danger : theme.title};
    border-radius: 1.5rem;
    resize: none !important;

    & * {
        font-family: Regular;
    }

    & .ant-input-show-count-suffix {
        font-size: 1.5rem;
    }
`;

const StyledPinInput = styled(PinInput)`
    color: ${({ theme, value, error }) => value.length === maxPinInput && error ? theme.danger : theme.title};
`;

const ButtonWrapper = styled.div`
    display: flex;
    gap: 1.5rem;
    width: 100%;
    justify-content: center;
`;

const Name = styled.span`
    font-size: 2rem;
    font-family: Bold;
    text-align: center;
    margin-top: 0.5rem;
`;

const StyledButton = styled(Button)`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    border-radius: 1.5rem;
    height: auto;

    & span {
        margin: 1rem 0 !important;
        font-family: Bold;
        font-size: 1.5rem !important;
    }
    & svg {
        font-size: 1.5rem;
    }
`;

export default AddNoticeDrawer;