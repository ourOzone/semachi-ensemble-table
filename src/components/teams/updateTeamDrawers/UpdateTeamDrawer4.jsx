import { useCallback, useRef } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Input } from "antd";
import { useTeamContext, useDrawerContext } from "context";
import OkButton from "components/common/OkButton";

const labels = ['보컬', '기타', '베이스', '드럼', '키보드', '매니저'];

const maxInput = 12;

const UpdateTeamDrawer4 = ({ drawerId }) => {
    const { desc, setDesc } = useTeamContext();
    const { openDrawer } = useDrawerContext();
    const focusInputRef = useRef(null);

    const handleChange = useCallback((idx, value) => {
        setDesc(prev => {
            const newDesc = [...prev];
            newDesc[idx] = value;
            return newDesc;
        });
    }, [setDesc]);

    return (
        <Drawer drawerId={drawerId} onClose={() => setDesc(['', '', '', '', '', '', ''])} focusInputRef={focusInputRef}>
            <Title>누가 바뀌었나요 🎸</Title>
            <Subtitle>되도록 실명으로 써주세요 ㅠㅠ</Subtitle>
            <InputWrapper>
                {labels.map((label, idx) => (
                    <RowWrapper key={idx}>
                        <Label idx={idx}>{label}</Label>
                        <StyledInput
                            ref={idx === 0 ? focusInputRef : null}
                            value={desc[idx]}
                            onChange={(e) => handleChange(idx, e.target.value)}
                            count={{
                                show: true,
                                max: maxInput,
                            }}
                            onKeyDown={(e) => { // Enter 키 누를시
                                if (e.key === 'Enter' && !desc.slice(0, 6).some((v) => v.length > maxInput)) {
                                    openDrawer('updateTeam5');
                                }
                            }}
                        />
                    </RowWrapper>
                ))}
            </InputWrapper>
            <OkButton
                onClick={() => openDrawer('updateTeam5')}
                disabled={desc.slice(0, 6).some((v) => v.length > 12)}
                label={desc.slice(0, 6).every((v) => v.trim() === '') ? '다음에 쓸래요' : '확인'}
            />
        </Drawer>
      );      
};

const Title = styled.div`
    font-size: 2.5rem;
    font-family: Bold;
    margin-bottom: 0.5rem;
`;

const Subtitle = styled.div`
    font-size: 1.5rem;
    color: ${({ theme }) => theme.darkGray};
`;

const InputWrapper = styled.div`
    margin: 4rem 0 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
`;

const RowWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
`;

const Label = styled.label`
    font-size: 2rem;
    font-family: Bold;
    min-width: 10rem;
    background-color: ${({ theme, idx }) => theme.eventColors[idx]};
    border-radius: 1rem;
    padding: 0.5rem;
    color: white;
    text-align: center;
    box-shadow: 0 0.25rem 0.125rem ${({ theme, isEvent, idx }) => theme.eventColors[idx]}33;
`;

const StyledInput = styled(Input)`
    padding-left: 1rem;
    font-size: 2rem;
    font-family: Bold !important;
    color: ${({ theme, value }) => value.length <= maxInput ? theme.title : theme.danger};
    border-radius: 1.5rem;
    /* width: 24rem; */

    & * {
        font-family: Regular;
    }

    & .ant-input-show-count-suffix {
        font-size: 1.5rem;
    }
`;

export default UpdateTeamDrawer4;