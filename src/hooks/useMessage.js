import { message as antMessage } from 'antd';
import styled from 'styled-components';
import {
        InfoCircleFilled,
        CheckCircleFilled,
        ExclamationCircleFilled,
        CloseCircleFilled,
    } from '@ant-design/icons';

const bgColors = {
    info: '#e6f4ff',
    success: '#f6ffed',
    warning: '#fffbe6',
    error: '#fff2f0'
};
const borderColors = {
    info: '#91caff',
    success: '#b7eb8f',
    warning: '#ffe58f',
    error: '#ffccc7'
}
const iconColors = {
    info: '#1890ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f'
};

const Content = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
    /* margin-top: 6rem; */
    font-size: 1.5rem;
    padding: 0.5rem 1rem;
    border-radius: 1rem;
    border: 1px solid ${({ type }) => borderColors[type]};
    background-color: ${({ type }) => bgColors[type]};
    box-shadow: 0 0.25rem 0.25rem ${({ type }) => borderColors[type]}80;
`;

const useMessage = () => {
    // message 사용을 위해 컴포넌트 최상단에 {contextHolder} 삽입해야 함
    const [messageApi, contextHolder] = antMessage.useMessage();

    const success = (text) => {
        messageApi.destroy();
        messageApi.open({
            content: (
            <Content type='success'>
                <CheckCircleFilled style={{ color: iconColors.success }} />
                {text}
            </Content>
            ),
            icon: null,
        });
    };

    const error = (text) => {
        messageApi.destroy();
        messageApi.open({
            content: (
            <Content type='error'>
                <CloseCircleFilled style={{ color: iconColors.error }} />
                {text}
            </Content>
            ),
            icon: null,
        });
    };

    const warning = (text) => {
        messageApi.destroy();
        messageApi.open({
            content: (
            <Content type='warning'>
                <ExclamationCircleFilled style={{ color: iconColors.warning }} />
                {text}
            </Content>
            ),
            icon: null,
        });
    };

    const info = (text) => {
        messageApi.destroy();
        messageApi.open({
            content: (
            <Content type='info'>
                <InfoCircleFilled style={{ color: iconColors.info }} />
                {text}
            </Content>
            ),
            icon: null,
        });
    };

        const message = { success, error, warning, info };

    return [message, contextHolder];
};

export default useMessage;