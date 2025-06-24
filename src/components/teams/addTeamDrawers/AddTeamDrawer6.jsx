import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Result } from "antd";
import { useDrawerContext } from "context";
import OkButton from "components/common/OkButton";

const AddTeamDrawer6 = ({ drawerId }) => {
    const { openedDrawers, closeAllDrawers } = useDrawerContext();

    return (
        <Drawer drawerId={drawerId} closable={false} onClose={closeAllDrawers}>
            <StyledResult
                status="success"
                title="락앤롤!"
                subTitle="팀을 만들었어요"
                extra={[
                    <OkButton onClick={closeAllDrawers} label="알았어요" />
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