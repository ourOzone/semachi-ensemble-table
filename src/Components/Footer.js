import React from 'react';
import styled from 'styled-components';

const Footer = () => {
    return (
        <Container>
            <FooterText>개발: 37th B. 고민재, 32nd G. 이승우</FooterText>
        </Container>
    )
};

const Container = styled.div`
    display: flex;
    justify-content: center;
    margin-top: 64px;
`;

const FooterText = styled.div`
    color: ${({ theme }) => theme.gray};
`;

export default Footer;

// TODO 드래그불가, 마우스포인터, 반응형