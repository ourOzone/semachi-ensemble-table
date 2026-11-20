import { useState, useEffect, useRef } from 'react';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { Input } from 'antd';
import { useTeamContext, useDrawerContext } from '@/context';
import type { InputRef } from 'antd';
import type { DrawerId } from '@/types';
import OkButton from '@/components/common/OkButton';
import { demoNames } from '@/constants';

const maxInput = 20;

interface UpdateTeamDrawer3Props {
    drawerId: DrawerId;
}

const UpdateTeam3 = ({ drawerId }: UpdateTeamDrawer3Props) => {
    const { name, setName } = useTeamContext();
    const { openDrawer } = useDrawerContext();
    const [randomDemoName, setRandomDemoName] = useState('');
    const focusInputRef = useRef<InputRef>(null);

    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * demoNames.length);
        setRandomDemoName(demoNames[randomIndex]);
    }, []);

    return (
        <Drawer drawerId={drawerId} focusInputRef={focusInputRef}>
            <Title>팀 이름을 바꿔요 🔖</Title>
            <StyledInput
                ref={focusInputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={randomDemoName}
                count={{
                    show: true,
                    max: maxInput,
                }}
                onKeyDown={(e) => {
                    // Enter 키 누를시
                    if (e.key === 'Enter' && name.length >= 1 && name.length <= maxInput) {
                        openDrawer('updateTeam4');
                    }
                }}
            />
            <OkButton
                onClick={() => openDrawer('updateTeam4')}
                disabled={name.length < 1 || name.length > maxInput}
            />
        </Drawer>
    );
};

const Title = styled.span`
    font-size: 2.5rem;
    font-family: Bold;
`;

interface StyledInputProps {
    /** 항상 문자열 (antd Input의 value 타입을 좁힘) */
    value: string;
}

const StyledInput = styled(Input)<StyledInputProps>`
    margin: 4rem 0;
    padding-left: 1.5rem;
    font-size: 3rem;
    font-family: Bold !important;
    color: ${({ theme, value }) => (value.length <= maxInput ? theme.title : theme.danger)};
    border-radius: 1.5rem;

    & * {
        font-family: Regular;
    }

    & .ant-input-show-count-suffix {
        font-size: 1.5rem;
    }
`;

export default UpdateTeam3;
