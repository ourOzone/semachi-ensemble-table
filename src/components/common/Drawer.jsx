import styled from 'styled-components';
import { Drawer as AntDrawer } from 'antd';
import useDrawerWidth from 'hooks/useDrawerWidth';
import { useCustomContext } from 'context';

const Drawer = ({ children, drawerId }) => {
    const drawerWidth = useDrawerWidth();
    const { openedDrawers, onCloseDrawer } = useCustomContext();

    return (
        <StyledDrawer width={drawerWidth} closable open={openedDrawers.includes(drawerId)} onClose={onCloseDrawer}>
            {children}
        </StyledDrawer>
    )
};

const StyledDrawer = styled(AntDrawer)``;

export default Drawer;