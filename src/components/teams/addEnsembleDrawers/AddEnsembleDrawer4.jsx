import { useCallback } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Result } from "antd";
import { useDrawerContext } from "context";
import OkButton from "components/common/OkButton";

const AddEnsembleDrawer4 = ({ drawerId }) => {
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
                subTitle="등록했어요. 혹시 모르니 한 번 더 확인해요"
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

export default AddEnsembleDrawer4;