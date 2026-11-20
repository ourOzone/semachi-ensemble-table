import type { ReactElement } from 'react';
import { message as antMessage } from 'antd';
import styled from 'styled-components';
import {
    InfoCircleFilled,
    CheckCircleFilled,
    ExclamationCircleFilled,
    CloseCircleFilled,
} from '@ant-design/icons';

type MessageType = 'info' | 'success' | 'warning' | 'error';

/** useMessage가 돌려주는 알림 함수 모음. 호출할 때마다 이전 알림을 지우고 새로 띄운다 */
export interface Message {
    success: (text: string) => void;
    error: (text: string) => void;
    warning: (text: string) => void;
    info: (text: string) => void;
}

const bgColors: Record<MessageType, string> = {
    info: '#e6f4ff',
    success: '#f6ffed',
    warning: '#fffbe6',
    error: '#fff2f0',
};
const borderColors: Record<MessageType, string> = {
    info: '#91caff',
    success: '#b7eb8f',
    warning: '#ffe58f',
    error: '#ffccc7',
};
const iconColors: Record<MessageType, string> = {
    info: '#1890ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
};

interface ContentProps {
    type: MessageType;
}

const Content = styled.div<ContentProps>`
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

const useMessage = (): [Message, ReactElement] => {
    // message 사용을 위해 컴포넌트 최상단에 {contextHolder} 삽입해야 함
    const [messageApi, contextHolder] = antMessage.useMessage();

    const success = (text: string) => {
        messageApi.destroy();
        messageApi.open({
            content: (
                <Content type="success">
                    <CheckCircleFilled style={{ color: iconColors.success }} />
                    {text}
                </Content>
            ),
            icon: null,
        });
    };

    const error = (text: string) => {
        messageApi.destroy();
        messageApi.open({
            content: (
                <Content type="error">
                    <CloseCircleFilled style={{ color: iconColors.error }} />
                    {text}
                </Content>
            ),
            icon: null,
        });
    };

    const warning = (text: string) => {
        messageApi.destroy();
        messageApi.open({
            content: (
                <Content type="warning">
                    <ExclamationCircleFilled style={{ color: iconColors.warning }} />
                    {text}
                </Content>
            ),
            icon: null,
        });
    };

    const info = (text: string) => {
        messageApi.destroy();
        messageApi.open({
            content: (
                <Content type="info">
                    <InfoCircleFilled style={{ color: iconColors.info }} />
                    {text}
                </Content>
            ),
            icon: null,
        });
    };

    const message: Message = { success, error, warning, info };

    return [message, contextHolder];
};

export default useMessage;
