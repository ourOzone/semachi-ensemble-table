import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Drawer as AntDrawer } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { useDrawerContext } from 'context';
import { media } from 'styles/media';

const Drawer = ({
    children,
    drawerId,
    closable = true,
    onClose = undefined,
    background = false,
    focusInputRef = undefined,
}) => {
    const { openedDrawers, closeDrawer, closeAllDrawers } = useDrawerContext();

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

    // props로 focusInputRef를 받은 경우, Drawer 열리면 해당 input에 포커스
    const handleAfterOpenChange = (open) => {
        if (focusInputRef && open && openedDrawers[openedDrawers.length - 1] === drawerId) {
            setTimeout(() => {
                focusInputRef.current?.focus({
                    cursor: 'end'
                });
            }, 0); 
        }
    };

    const customOnClose = useCallback(() => {
        closeDrawer();
        
        if (onClose) {
            onClose();
        }
    }, [onClose, closeDrawer]);

    return (
        <StyledDrawer
            maskStyle={{ opacity: openedDrawers?.[0] === drawerId ? 1 : 0 }}
            openedDrawers={openedDrawers}
            drawerId={drawerId}
            width={drawerWidth}
            closable={closable}
            destroyOnClose
            push={false}
            open={openedDrawers.includes(drawerId)}
            onClose={customOnClose}
            closeIcon={<LeftOutlined />}
            background={background} // false면 흰색, true면 하늘색
            // afterOpenChange={afterOpenChange}
            afterOpenChange={handleAfterOpenChange}
        >
            {children}
        </StyledDrawer>
    );
};

const StyledDrawer = styled(AntDrawer)`
    & > * {
        background-color: ${({ theme, background }) => background ? theme.background : theme.white};
    }

    ${media.large(({ openedDrawers, drawerId }) => {
        const isOpened = openedDrawers.includes(drawerId);
        const isTop = openedDrawers[openedDrawers.length - 1] === drawerId;
        return isOpened ? `
                transition: transform 0.3s ease;
                transform: translateX(${isTop ? '0' : '-50%'});
            `
            : '';
    })}

    & .ant-drawer-body {
        padding-top: 0;
    }

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
