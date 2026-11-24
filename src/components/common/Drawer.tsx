import { useState, useEffect, useCallback, type ReactNode, type RefObject } from 'react';
import styled from 'styled-components';
import { Drawer as AntDrawer, type InputRef } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { useDrawerContext } from '@/context';
import { sideDrawers } from '@/stores/drawer';
import { media } from '@/styles/media';
import type { DrawerId } from '@/types';

/** focus({ cursor })를 지원하는 antd Input·TextArea의 ref */
export type FocusableInputRef = Pick<InputRef, 'focus'>;

interface DrawerProps {
    children: ReactNode;
    drawerId: DrawerId;
    /** false면 닫기(뒤로가기) 버튼을 숨긴다 */
    closable?: boolean;
    /** 닫기 버튼이나 바깥 영역으로 닫힐 때, closeDrawer() 다음에 호출 */
    onClose?: () => void;
    /** false면 흰색, true면 하늘색 배경 */
    background?: boolean;
    /** 이 Drawer가 맨 위로 열리면 포커스(커서 끝)할 입력창 */
    focusInputRef?: RefObject<FocusableInputRef | null>;
}

const Drawer = ({
    children,
    drawerId,
    closable = true,
    onClose = undefined,
    background = false,
    focusInputRef = undefined,
}: DrawerProps) => {
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
    const handleAfterOpenChange = (open: boolean) => {
        if (focusInputRef && open && openedDrawers[openedDrawers.length - 1] === drawerId) {
            setTimeout(() => {
                focusInputRef.current?.focus({
                    cursor: 'end',
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
            // 옛 Drawer 중 맨 아래 것만 바깥을 어둡게 한다 (아래에서 올라오는 새 Drawer는 위에 옛 Drawer가 쌓이면 내려간다)
            maskStyle={{ opacity: sideDrawers(openedDrawers)[0] === drawerId ? 1 : 0 }}
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

interface StyledDrawerProps {
    openedDrawers: DrawerId[];
    drawerId: DrawerId;
    background: boolean;
}

const StyledDrawer = styled(AntDrawer)<StyledDrawerProps>`
    & > * {
        background-color: ${({ theme, background }) => (background ? theme.background : theme.white)};
    }

    ${media.large(({ openedDrawers, drawerId }) => {
        const isOpened = openedDrawers.includes(drawerId);
        const isTop = openedDrawers[openedDrawers.length - 1] === drawerId;
        return isOpened
            ? `
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
