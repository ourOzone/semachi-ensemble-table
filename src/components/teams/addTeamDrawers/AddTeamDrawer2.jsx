import { useState, useEffect, useCallback } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Input } from "antd";
import { useDrawerContext } from "context";
import OkButton from "components/common/OkButton";
import { demoName } from 'constants';

const drawerId = 'addTeam2';

const maxInput = 20;

const AddTeamDrawer2 = ({ name, setName }) => {
    const { openDrawer } = useDrawerContext();
    const [randomDemoName, setRandomDemoName] = useState('');

    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * demoName.length);
       setRandomDemoName(demoName[randomIndex]);
    }, []);

    return (
        <Drawer drawerId={drawerId} onClose={() => setName('')}>
            <Title>팀 이름을 지어요 🔖</Title>
            <StyledInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={randomDemoName}
                count={{
                    show: true,
                    max: maxInput,
                }}
            />
            <OkButton
                onClick={() => openDrawer('addTeam3')}
                disabled={name.length < 1 || name.length > 20}
            />
        </Drawer>
    );
};

const Title = styled.span`
    font-size: 2.5rem;
    font-family: Bold;
`;

const StyledInput = styled(Input)`
    margin: 4rem 0;
    padding-left: 1.5rem;
    font-size: 3rem;
    font-family: Bold !important;
    color: ${({ theme, value }) => value.length <= maxInput ? theme.title : theme.danger};
    border-radius: 1.5rem;

    & * {
        font-family: Regular;
    }

    & .ant-input-show-count-suffix {
        font-size: 1.5rem;
    }
`;

export default AddTeamDrawer2;