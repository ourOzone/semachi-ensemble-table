import { useCallback } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Button, Input } from "antd";
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

const AddNoteDrawer = ({ drawerId, text, setText, pin, setPin, handleAddNote }) => {
    const isOverLimit = text.length > maxInput;

    const handlePinChange = useCallback((e) => {
        const numeric = e.target.value.replace(/\D/g, '');
        if (numeric.length <= maxPinInput) {
            setPin(numeric);
        }
    }, [setPin]);

    return (
        <>
            <Drawer drawerId={drawerId} onClose={() => setText('')}>
                <Wrapper>
                    <StyledTextArea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="내용 여따 써요"
                        rows={countLines(text)}
                        $isOverLimit={isOverLimit}
                    />
                    <PinInput
                        value={pin}
                        type="password"
                        onChange={handlePinChange}
                        inputMode="numeric"
                        placeholder="숫자 4자리"
                        onKeyDown={(e) => { // Enter 키 누를시
                            if (e.key === 'Enter' && pin.length === maxPinInput) {
                                handleAddNote(text, pin);
                            }
                        }}
                    />
                    <OkButton
                        onClick={() => {handleAddNote(text, pin)}}
                        disabled={pin.length !== maxPinInput}
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

export default AddNoteDrawer;