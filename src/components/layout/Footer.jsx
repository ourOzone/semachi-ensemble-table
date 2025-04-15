import React from 'react';
import styled from 'styled-components';
import { media } from 'styles/media';

const Footer = () => {
    return (
        <Container>
            <FooterText>32기 G.이승우 37기 B.고민재</FooterText>
        </Container>
    )
};

const Container = styled.div`
    display: flex;
    justify-content: center;
    margin: 2rem 0 4rem;
    user-select: none;
`;

const FooterText = styled.div`
    color: ${({ theme }) => theme.gray};
`;

export default Footer;