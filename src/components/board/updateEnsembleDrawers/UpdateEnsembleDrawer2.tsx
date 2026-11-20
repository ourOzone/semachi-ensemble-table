import { useCallback } from 'react';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { Button } from 'antd';
import { useEnsembleContext, useDrawerContext } from '@/context';
import type { DrawerId } from '@/types';

interface UpdateEnsembleDrawer2Props {
    drawerId: DrawerId;
}

const UpdateEnsembleDrawer2 = ({ drawerId }: UpdateEnsembleDrawer2Props) => {
    const { setRepeat } = useEnsembleContext();
    const { openDrawer } = useDrawerContext();

    const handleClick = useCallback(
        (repeat: boolean) => {
            setRepeat(repeat);
            openDrawer('updateEnsemble3');
        },
        [setRepeat, openDrawer],
    );

    return (
        // onClose시 repeat은 초기화 필요 없음
        <Drawer drawerId={drawerId}>
            <Title>매주 할 건가요 📆</Title>
            <ButtonWrapper>
                <OptionButton onClick={() => handleClick(true)}>
                    <Label>매주 같은 타임에 할래요 🔁</Label>
                </OptionButton>
                <OptionButton onClick={() => handleClick(false)}>
                    <Label>하루만 할래요 ☝️</Label>
                </OptionButton>
            </ButtonWrapper>
        </Drawer>
    );
};

const Title = styled.span`
    font-size: 2.5rem;
    font-family: Bold;
`;

const ButtonWrapper = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-top: 8rem;
    gap: 1.5rem;
`;

const OptionButton = styled(Button)`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 10rem;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 1.5rem;
    box-shadow: 0 0.25rem 0 rgba(0, 0, 0, 0.02);
`;

const Label = styled.span`
    font-family: Bold;
    font-size: 2rem;
    color: ${({ theme }) => theme.title};
`;

export default UpdateEnsembleDrawer2;
