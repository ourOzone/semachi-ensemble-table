import { useState, useEffect, useMemo } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Result } from "antd";
import { useDrawerContext } from "context";
import OkButton from "components/common/OkButton";

const drawerId = 'addTeam6';

const AddTeamDrawer6 = ({ type, name, desc }) => {
    const { closeAllDrawers } = useDrawerContext();

    const handleClick = () => {
        closeAllDrawers();
    };

    const onClose = () => {
        closeAllDrawers();
    };

    return ( // TODO antd Result 이용해서 type/name/desc 표시
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