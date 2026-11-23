import { useCallback, useRef } from 'react';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { Input } from 'antd';
import { useTeamContext, useDrawerContext } from '@/context';
import type { InputRef } from 'antd';
import type { DrawerId } from '@/types';
import OkButton from '@/components/common/OkButton';

const labels = ['보컬', '기타', '베이스', '드럼', '키보드', '매니저'];

const maxInput = 12;

interface AddTeamDrawer3Props {
    drawerId: DrawerId;
}

const AddTeamDrawer3 = ({ drawerId }: AddTeamDrawer3Props) => {
    const { desc, setDesc } = useTeamContext();
    const { openDrawer } = useDrawerContext();
    const focusInputRef = useRef<InputRef>(null);

    const handleChange = useCallback(
        (idx: number, value: string) => {
            setDesc((prev) => {
                const newDesc = [...prev];
                newDesc[idx] = value;
                return newDesc;
            });
        },
        [setDesc],
    );

    return (
        <Drawer
            drawerId={drawerId}
            onClose={() => setDesc(['', '', '', '', '', '', ''])}
            focusInputRef={focusInputRef}
        >
            <Title>누구누구 있나요 🎸</Title>
            <Subtitle>되도록 실명으로 써주세요 ㅠㅠ</Subtitle>
            <InputWrapper>
                {labels.map((label, idx) => (
                    <RowWrapper key={idx}>
                        <Label idx={idx}>{label}</Label>
                        <StyledInput
                            ref={idx === 0 ? focusInputRef : null}
                            // noUncheckedIndexedAccess: desc는 7칸, idx는 멤버 6칸 (View 개편 때 삭제될 코드)
                            value={desc[idx]!}
                            onChange={(e) => handleChange(idx, e.target.value)}
                            count={{
                                show: true,
                                max: maxInput,
                            }}
                            onKeyDown={(e) => {
                                // Enter 키 누를시
                                if (
                                    e.key === 'Enter' &&
                                    !desc.slice(0, 6).some((v) => v.length > maxInput)
                                ) {
                                    openDrawer('addTeam4');
                                }
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

interface LabelProps {
    idx: number;
    /** 스타일에서 구조분해하지만 사용하지 않음 */
    isEvent?: boolean;
}

const Label = styled.label<LabelProps>`
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

interface StyledInputProps {
    /** 항상 문자열 (antd Input의 value 타입을 좁힘) */
    value: string;
}

const StyledInput = styled(Input)<StyledInputProps>`
    padding-left: 1rem;
    font-size: 2rem;
    font-family: Bold !important;
    color: ${({ theme, value }) => (value.length <= maxInput ? theme.title : theme.danger)};
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
