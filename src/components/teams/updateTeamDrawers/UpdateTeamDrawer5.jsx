import { useCallback, useMemo } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Input } from "antd";
import { useTeamContext, useDrawerContext } from "context";
import OkButton from "components/common/OkButton";

const { TextArea } = Input;
const maxInput = 200;
const minRows = 4;
const maxRows = 10;

const countLines = (value) => {
    const lines = value.split('\n').length;
    return Math.min(Math.max(lines, minRows), maxRows);
};

const UpdateTeamDrawer5 = ({ drawerId, handleUpdateTeam }) => {
    const { id, type, name, desc, setDesc } = useTeamContext();
    const { openDrawer } = useDrawerContext();

    const text = useMemo(() => desc[6] || '', [desc]);

    const handleChange = useCallback((e) => {
        const newText = e.target.value;
        setDesc(prev => [...prev.slice(0, 6), newText]);
    }, [setDesc]);

    const onClose = useCallback(() => {
        setDesc(prev => [...prev.slice(0, 6), '']);
    }, [setDesc]);

    const isOverLimit = text.length > maxInput;
    // const isEmpty = text.trim() === '';

    return (
        <Drawer drawerId={drawerId} onClose={onClose}>
            <Title>셋리가 바뀌었나요 🎵</Title>
            <StyledTextArea
                value={text}
                onChange={handleChange}
                placeholder="팀 소개도 쓸라면 써요"
                rows={countLines(text)}
                $isOverLimit={isOverLimit}
            />
            <OkButton
                onClick={() => handleUpdateTeam(id, type, name, desc)}
                disabled={isOverLimit}
                label='다 바꿨어요'
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

export default UpdateTeamDrawer5;