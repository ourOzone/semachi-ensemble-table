import styled from 'styled-components';
import { Drawer as AntDrawer } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import useDrawerWidth from 'hooks/useDrawerWidth';
import { useCustomContext } from 'context';
import { media } from 'styles/media';

const Drawer = ({ children, drawerId, onClose = undefined }) => {
    const drawerWidth = useDrawerWidth();
    const { openedDrawers, onCloseDrawer } = useCustomContext();

    const customOnClose = () => {
        if (onClose) {
            onClose();
        }
        onCloseDrawer();
    }

    return (
        <StyledDrawer
            openedDrawers={openedDrawers}
            drawerId={drawerId}
            width={drawerWidth}
            closable
            destroyOnClose
            push={false} // 중첩 Drawer 열 시 이전 drawer가 덮이는 옵션. 모바일에서는 하단 transform으로 오버라이딩됨
            open={openedDrawers.includes(drawerId)}
            onClose={customOnClose}
            closeIcon={<LeftOutlined />}
        >
            {children}
        </StyledDrawer>
    )
};

const StyledDrawer = styled(AntDrawer)`
    /* 모바일의 경우 다음 Drawer 열 때 스택되는 Drawer에 transform 적용 (pc는 적용하면 이상함) */
    ${media.large((props) => {
        const isOpened = props.openedDrawers.includes(props.drawerId);
        const isTop = props.openedDrawers[props.openedDrawers.length - 1] === props.drawerId;
        return isOpened ? `
            transition: transform 0.3s ease;
            transform: translateX(${isTop ? '0' : '-50%'});
        `
        : '';
    })}

    & .ant-drawer-header {
        border: none;
        padding: 0.5rem 0.25rem;
    }
    
    .ant-drawer-close {
        padding: 1rem;
        width: auto;
        height: auto;
        border-radius: 1.5rem;
    }

    .ant-drawer-close svg {
        width: 2rem;
        height: 2rem;
        color: ${({ theme }) => theme.black};
    }
`;

export default Drawer;