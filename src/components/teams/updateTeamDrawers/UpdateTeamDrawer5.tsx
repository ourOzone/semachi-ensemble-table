import { useCallback, useMemo, useRef, type ChangeEvent } from 'react';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { Input, type GetRef } from 'antd';
import { useTeamContext } from '@/context';
import type { DrawerId } from '@/types';
import type { HandleUpdateTeam } from '../types';
import OkButton from '@/components/common/OkButton';

const { TextArea } = Input;
type TextAreaRef = GetRef<typeof TextArea>;
const maxInput = 200;
const minRows = 4;
const maxRows = 10;

const countLines = (value: string): number => {
    const lines = value.split('\n').length;
    return Math.min(Math.max(lines, minRows), maxRows);
};

interface UpdateTeamDrawer5Props {
    drawerId: DrawerId;
    handleUpdateTeam: HandleUpdateTeam;
}

const UpdateTeamDrawer5 = ({ drawerId, handleUpdateTeam }: UpdateTeamDrawer5Props) => {
    const { id, type, name, desc, setDesc } = useTeamContext();
    const focusInputRef = useRef<TextAreaRef>(null);

    const text = useMemo(() => desc[6] || '', [desc]);

    const handleChange = useCallback(
        (e: ChangeEvent<HTMLTextAreaElement>) => {
            const newText = e.target.value;
            setDesc((prev) => [...prev.slice(0, 6), newText]);
        },
        [setDesc],
    );

    const onClose = useCallback(() => {
        setDesc((prev) => [...prev.slice(0, 6), '']);
    }, [setDesc]);

    const isOverLimit = text.length > maxInput;

    return (
        <Drawer drawerId={drawerId} onClose={onClose} focusInputRef={focusInputRef}>
            <Title>셋리가 바뀌었나요 🎵</Title>
            <StyledTextArea
                ref={focusInputRef}
                value={text}
                onChange={handleChange}
                placeholder="되도록 꼭 써주세요 ㅠㅠ"
                rows={countLines(text)}
                $isOverLimit={isOverLimit}
            />
            <OkButton
                onClick={() => handleUpdateTeam(id, type, name, desc)}
                disabled={isOverLimit}
                label="다 바꿨어요"
            />
        </Drawer>
    );
};

const Title = styled.span`
    font-size: 2.5rem;
    font-family: Bold;
`;

interface StyledTextAreaProps {
    $isOverLimit: boolean;
}

const StyledTextArea = styled(TextArea)<StyledTextAreaProps>`
    margin: 4rem 0;
    font-size: 1.5rem;
    font-family: Bold !important;
    color: ${({ theme, $isOverLimit }) => ($isOverLimit ? theme.danger : theme.title)};
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
