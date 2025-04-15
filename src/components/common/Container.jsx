import styled from 'styled-components';
import { media } from 'styles/media';

export const Container = styled.div`
    display: flex;
    flex-direction: ${(props) => props.row ? 'row' : 'column'};
    background-color: ${({ theme }) => theme.container};
    box-shadow: 0 2px 10px 2px rgba(0, 0, 0, 0.1);
    border-radius: 1.5rem;
    padding: 2rem 1rem;
    width: 100%;
    max-width: 1080px;
`;