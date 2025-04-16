import styled from 'styled-components';
import { Button } from 'antd';

const OkButton = ({ disabled, skip, ...props }) => {
    return (<StyledButton type="primary" visible={disabled} {...props}>{skip ? '건너뛰기' : '확인'}</StyledButton>)
};

const StyledButton = styled(Button)`
    width: 100%;
    height: 4.5rem;
    border-radius: 1.5rem;
    & * {
        font-size: 1.5rem;
        font-family: Bold;
    }

    // disabled시 아예 띄우지 않고, 토글 시 transition 적용
    transition: opacity 0.3s ease, visibility 0.3s ease;
    opacity: ${({ visible }) => (visible ? 0 : 1)};
    visibility: ${({ visible }) => (visible ? 'hidden' : 'visible')};
`;

export default OkButton;