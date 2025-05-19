import styled from 'styled-components';
import { Input } from 'antd';

const PinInput = styled(Input)`
    font-family: Bold !important;
    color: ${({ theme }) => theme.title};
    border-radius: 1.5rem;
    width: 20rem;
    font-size: 3rem;
    text-align: center;
`;

export default PinInput;