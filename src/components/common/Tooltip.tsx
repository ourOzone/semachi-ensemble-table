import type { ReactNode } from 'react';
import { Tooltip as AntdTooltip } from 'antd';
import styled from 'styled-components';
import { useTheme } from 'styled-components';

interface TooltipProps {
    title: ReactNode;
    children: ReactNode;
}

const Tooltip = ({ children, ...props }: TooltipProps) => {
    const theme = useTheme();
    return (
        <AntdTooltip color={theme.title} {...props}>
            {children}
        </AntdTooltip>
    );
};
export default Tooltip;
