import styled from 'styled-components';
import { cardRadius } from '@/styles/cardRadius';

interface ContainerProps {
    /** true면 가로 배치 */
    row?: boolean;
}

export const Container = styled.div<ContainerProps>`
    display: flex;
    flex-direction: ${({ row }) => (row ? 'row' : 'column')};
    background-color: ${({ theme }) => theme.container};
    box-shadow: 0 2px 10px 2px rgba(0, 0, 0, 0.1);
    ${cardRadius}
    padding: 2rem 1rem;
    width: 100%;
    max-width: 1080px;
`;
