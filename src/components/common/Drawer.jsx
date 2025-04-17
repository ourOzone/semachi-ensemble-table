import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Drawer as AntDrawer } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { useDrawerContext } from 'context';
import { media } from 'styles/media';

const Drawer = ({ children, drawerId, closable = true, onClose = undefined }) => {
    const { openedDrawers, onCloseDrawer } = useDrawerContext();

    const getWidth = () => (window.innerWidth <= 767 ? '100%' : '767px');
    const [drawerWidth, setDrawerWidth] = useState(getWidth);

    useEffect(() => {
        const handleResize = () => {
            setDrawerWidth(getWidth());
        };

        setDrawerWidth(getWidth()); // 초기값 설정
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const customOnClose = () => {
        onCloseDrawer();
        
        if (onClose) {
            onClose();
        }
    };

    return (
        <StyledDrawer
            openedDrawers={openedDrawers}
            drawerId={drawerId}
            width={drawerWidth}
            closable={closable}
            destroyOnClose
            push={false}
            open={openedDrawers.includes(drawerId)}
            onClose={customOnClose}
            closeIcon={<LeftOutlined />}
        >
            {children}
        </StyledDrawer>
    );
};

const StyledDrawer = styled(AntDrawer)`
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
