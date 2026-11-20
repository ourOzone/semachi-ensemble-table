import { useCallback, useMemo, useRef, type ChangeEvent } from 'react';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { Input, type GetRef } from 'antd';
import { useTeamContext, useDrawerContext } from '@/context';
import type { DrawerId } from '@/types';
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

interface AddTeamDrawer4Props {
    drawerId: DrawerId;
}

const AddTeamDrawer4 = ({ drawerId }: AddTeamDrawer4Props) => {
    const { desc, setDesc } = useTeamContext();
    const { openDrawer } = useDrawerContext();
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

    const handleClick = useCallback(() => {
        openDrawer('addTeam5');
    }, [openDrawer]);

    const isOverLimit = text.length > maxInput;
    const isEmpty = text.trim() === '';

    return (
        <Drawer drawerId={drawerId} onClose={onClose} focusInputRef={focusInputRef}>
            <Title>셋리 정한 거 있나요 🎵</Title>
            <StyledTextArea
                ref={focusInputRef}
                value={text}
                onChange={handleChange}
                placeholder="되도록 꼭 써주세요 ㅠㅠ"
                rows={countLines(text)}
                $isOverLimit={isOverLimit}
            />
            <OkButton
                onClick={handleClick}
                disabled={isOverLimit}
                label={isEmpty ? '다음에 쓸래요' : '확인'}
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

export default AddTeamDrawer4;
