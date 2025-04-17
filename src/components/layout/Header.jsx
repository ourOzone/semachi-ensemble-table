import React from 'react';
import styled from 'styled-components';
import { Layout, Button } from 'antd';
import { BellOutlined, BookOutlined } from '@ant-design/icons';
import useScrollPosition from 'hooks/useScrollPosition';

const { Header: AntHeader } = Layout;

const Header = () => {
    const scrollPosition = useScrollPosition();
    return (
        // <Container>
        //     <H1>세마치 합주판</H1>
        // </Container>
        <StyledHeader scrollPosition={scrollPosition}>
            <Title>세마치 합주판</Title>
            <ButtonWrapper>
                <StyledButton variant="text" icon={<BookOutlined />}></StyledButton>
                <StyledButton variant="text" icon={<BellOutlined />}></StyledButton>
            </ButtonWrapper>
        </StyledHeader>
    )
};

const StyledHeader = styled(AntHeader)`
    position: sticky !important;
    width: 100%;
    top: 0;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 5rem;
    padding: 1.5rem 1rem 1.5rem 1.5rem;

    background-color: ${({ theme }) => theme.background}CC;
    backdrop-filter: blur(1rem);           /* 블러 효과 */
    -webkit-backdrop-filter: blur(1rem);   /* Safari 지원용 */
`;

const StyledButton = styled(Button)`
    background: none;
    border: none;
    box-shadow: none;
    width: 4rem !important;
    height: 4rem;
    border-radius: 1.5rem;

    &:hover {
        background-color: ${({ theme }) => theme.boardBackground}80 !important;
    }

    & svg {
        font-size: 2rem;
        color: ${({ theme }) => theme.title};
    }
`;

const ButtonWrapper = styled.div`
    display: flex;
`;

const Title = styled.span`
    font-family: Bold;
    font-size: 1.5rem;
    color: ${({ theme }) => theme.title};
    user-select: none;
`;

export default Header;