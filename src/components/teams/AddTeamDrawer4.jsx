import { useCallback } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Input } from "antd";
import { useDrawerContext } from "context";
import OkButton from "components/common/OkButton";
const { TextArea } = Input;

const drawerId = 'addTeam4';
const maxInput = 200;

const countLines = (value) => {
    const lines = value.split('\n').length;
    return Math.min(Math.max(lines, 4), 10);
};

const AddTeamDrawer4 = ({ desc, setDesc }) => {
    const { openDrawer } = useDrawerContext();
    const text = desc[6] || '';

    const handleChange = useCallback((e) => {
        const newText = e.target.value;
        setDesc([...desc.slice(0, 6), newText]);
    }, [desc, setDesc]);

    const onClose = useCallback(() => {
        setDesc([...desc.slice(0, 6), '']);
    }, [desc, setDesc]);

    const handleClick = useCallback(() => {
        openDrawer('addTeam5');
    }, [openDrawer]);

    return (
        <Drawer drawerId={drawerId} onClose={onClose}>
            <Title>셋리 정한 거 있나요 🎵</Title>
            <StyledTextArea
                value={text}
                onChange={handleChange}
                placeholder="팀 소개도 쓸라면 써요"
                rows={countLines(text)}
            />
            <OkButton
                onClick={handleClick}
                disabled={text.length > maxInput}
                label={text.trim() === '' ? '다음에 쓸래요' : '확인'}
            />
        </Drawer>
    );
};

const Title = styled.span`
    font-size: 2.5rem;
    font-family: Bold;
`;

const StyledTextArea = styled(TextArea)`
    margin: 4rem 0;
    font-size: 1.5rem;
    font-family: Bold !important;
    color: ${({ theme, value }) => value.length <= maxInput ? theme.title : theme.danger};
    border-radius: 1.5rem;
    resize: none !important;

    & * {
        font-family: Regular;
    }

    & .ant-input-show-count-suffix {
        font-size: 1.5rem;
    }
`;

export default AddTeamDrawer4;