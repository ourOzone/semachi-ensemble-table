import { useState, useEffect, useMemo } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Input } from "antd";
import { useDrawerContext } from "context";
import OkButton from "components/common/OkButton";

const drawerId = 'teamAdd6';

const TeamAddDrawer6 = ({ pin, setPin, type, name, desc }) => {
    const { closeAllDrawers } = useDrawerContext();

    const handleClick = () => {
        closeAllDrawers();
    };

    return (
        <Drawer drawerId={drawerId}>
            <Title>끝</Title>
        </Drawer>
    );
};

const Title = styled.span`
    font-size: 2.5rem;
    font-family: Bold;
`;

export default TeamAddDrawer6;