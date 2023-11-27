import React from 'react';
import styled from 'styled-components';
import CircularProgress from '@mui/material/CircularProgress';

export default function Loading() {
    return (
        <Container>
            <CircularProgress />
        </Container>
    );
}

const Container = styled.div`
    display: flex;
    width: 100%;
    height: 100%;
    background-color: #00000088;
    z-index: 1;
    align-items: center;
    justify-content: center;
`;