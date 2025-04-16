import { useState } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Input } from "antd";
import { useCustomContext } from "context";
import OkButton from "components/common/OkButton";

const drawerId = 'teamAdd3';

const maxInput = 12;

const TeamAddDrawer3 = ({ desc, setDesc }) => {
    const { openDrawer } = useCustomContext();
    const [name, setName] = useState('');

    const handleChange = (index, value) => {
        const newDesc = [...desc];
        newDesc[index] = value;
        setDesc(newDesc);
    };

    const labels = ['보컬', '기타(들)', '베이스', '드럼', '키보드', '매니저(들)'];

    const onClose = () => {
        setDesc(['', '', '', '', '', '', '']);
    }

    const handleClick = () => {
        openDrawer('teamAdd4');
    };

    return (
        <Drawer drawerId={drawerId} onClose={onClose}>
            <Title>누구누구 있나요</Title>
            <InputWrapper>
                {labels.map((label, index) => (
                    <RowWrapper key={index}>
                        <Label>{label}</Label>
                        <StyledInput
                            value={desc[index]}
                            onChange={(e) => handleChange(index, e.target.value)}
                            count={{
                                show: true,
                                max: maxInput,
                            }}
                        />
                    </RowWrapper>
                ))}
            </InputWrapper>
            <OkButton
                onClick={handleClick}
                disabled={desc.slice(0, 6).some((v) => v.length > 12)}
                skip={desc.slice(0, 6).every((v) => v.trim() === '')}
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
    font-size: 1.5rem;
    width: 10rem;
`;

const StyledInput = styled(Input)`
    font-size: 2rem;
    font-family: Bold !important;
    color: ${({ theme }) => theme.title};
    border-radius: 1.5rem;
    /* width: 24rem; */

    & * {
        font-family: Regular;
    }

    & .ant-input-show-count-suffix {
        font-size: 1.5rem;
    }
`;

export default TeamAddDrawer3;