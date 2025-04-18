import { useCallback } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Input } from "antd";
import { useDrawerContext } from "context";
import OkButton from "components/common/OkButton";

const drawerId = 'addTeam3';
const labels = ['보컬', '기타', '베이스', '드럼', '키보드', '매니저'];

const maxInput = 12;

const AddTeamDrawer3 = ({ desc, setDesc }) => {
    const { openDrawer } = useDrawerContext();

    const handleChange = useCallback((idx, value) => {
        setDesc(prev => {
            const newDesc = [...prev];
            newDesc[idx] = value;
            return newDesc;
        });
    }, [setDesc]);

    return (
        <Drawer drawerId={drawerId} onClose={() => setDesc(['', '', '', '', '', '', ''])}>
            <Title>누구누구 있나요 🎸</Title>
            <InputWrapper>
                {labels.map((label, idx) => (
                    <RowWrapper key={idx}>
                        <Label idx={idx}>{label}</Label>
                        <StyledInput
                            value={desc[idx]}
                            onChange={(e) => handleChange(idx, e.target.value)}
                            count={{
                                show: true,
                                max: maxInput,
                            }}
                        />
                    </RowWrapper>
                ))}
            </InputWrapper>
            <OkButton
                onClick={() => openDrawer('addTeam4')}
                disabled={desc.slice(0, 6).some((v) => v.length > 12)}
                label={desc.slice(0, 6).every((v) => v.trim() === '') ? '다음에 쓸래요' : '확인'}
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

export default AddTeamDrawer3;