import styled from 'styled-components';
import { Button, type ButtonProps } from 'antd';

interface OkButtonProps extends Omit<ButtonProps, 'children'> {
    /** 버튼 문구. 기본값 '확인' */
    label?: string;
}

const OkButton = ({ disabled, label = '확인', ...props }: OkButtonProps) => {
    return (
        <Wrapper>
            <StyledButton type="primary" disabled={disabled} visible={disabled} {...props}>
                {label}
            </StyledButton>
        </Wrapper>
    );
};

interface StyledButtonProps {
    /** true면 숨긴다 (disabled 값을 그대로 받음) */
    visible?: boolean;
}

const StyledButton = styled(Button)<StyledButtonProps>`
    width: 100%;
    height: 4.5rem;
    border-radius: 1.5rem;
    & * {
        font-size: 1.5rem;
        font-family: Bold;
    }

    // disabled시 아예 띄우지 않고, 토글 시 transition 적용
    transition:
        opacity 0.3s ease,
        visibility 0.3s ease;
    opacity: ${({ visible }) => (visible ? 0 : 1)};
    visibility: ${({ visible }) => (visible ? 'hidden' : 'visible')};
`;

const Wrapper = styled.div`
    display: flex;
    justify-content: center;
    width: 100%;
`;

export default OkButton;
