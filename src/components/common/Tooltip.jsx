import { Tooltip as AntdTooltip } from 'antd';
import styled from 'styled-components';
import { useTheme } from 'styled-components';

const Tooltip = ({ children, ...props }) => {
    const theme = useTheme();
    return (
        <AntdTooltip color={theme.title} {...props}>
            {children}
        </AntdTooltip>
    );
}
export default Tooltip;