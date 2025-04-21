import { useCallback } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Result } from "antd";
import { useDrawerContext } from "context";
import OkButton from "components/common/OkButton";

const drawerId = 'addTeam6';

const AddTeamDrawer6 = () => {
    const { closeAllDrawers } = useDrawerContext();

    const handleClick = useCallback(() => {
        closeAllDrawers();
    }, [closeAllDrawers]);

    const onClose = useCallback(() => {
        closeAllDrawers();
    }, [closeAllDrawers]);

    return (
        <Drawer drawerId={drawerId} closable={false} onClose={onClose}>
            <StyledResult
                status="success"
                title="락앤롤!"
                subTitle="팀을 만들었어요"
                extra={[
                    <OkButton onClick={handleClick} label="알았어요" />
                ]}
            />
        </Drawer>
    );
};

const StyledResult = styled(Result)`
    margin-top: 25%;
    & svg {
        font-size: 8rem !important;
    }
`;

export default AddTeamDrawer6;