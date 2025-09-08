import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { useFetchContext, useDrawerContext } from 'context';
import useMessage from 'hooks/useMessage';
import { addNotice, deleteNotice, noticeExists } from 'api/notice';
import { Button } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import NoticeDrawer from './NoticeDrawer';
import AddNoticeDrawer from './AddNoticeDrawer';
import DeleteNoticeDrawer from './DeleteNoticeDrawer';

const Notice = () => {
    const { notices, fetchData } = useFetchContext();
    const [message, contextHolder] = useMessage();
    const [id, setId] = useState('');
    const [text, setText] = useState('');
    const [pin, setPin] = useState('');
    const { openDrawer, closeAllDrawers } = useDrawerContext();

    // 이미 삭제된 공지인지 체크. 이미 있는 공지를 다루는 모든 작업에 적용해야 함, true를 리턴 시 각 작업 진행
    const checkNoticeExists = useCallback(async (id) => {
        try {
            await noticeExists(id);
            return true;
        } catch {
            message.warning('이미 삭제된 공지예요.');
            setId('');
            setText('');
            setPin('');
            closeAllDrawers();
            fetchData();
            return false;
        }
    }, [closeAllDrawers, fetchData, message]);

    const handleAddNotice = useCallback(async (text) => {
        try {
            await addNotice(text);
            fetchData();
            setText('');
            setPin('');
            closeAllDrawers();
            message.success('잘 등록했어요.');
        }
        catch {
            message.error('실패했어요. 너무 많아서 그럴지도요. 100개 까지만 돼요.');
        }
    }, [fetchData, message]);
    
    const handleClickDelete = useCallback(async (id) => {
        try {
            if (await checkNoticeExists(id)) {
                setId(id);
                openDrawer('deleteNotice');
            }
        }
        catch {
            message.error('인터넷이 안 좋거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.');
        }
    }, []);

    const handleDeleteNotice = useCallback(async (id) => {
        try {
            if (await checkNoticeExists(id)) {
                await deleteNotice(id);
                message.success('공지를 삭제했어요.');
            }
        }
        catch {
            message.error('인터넷이 안 좋거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.');
        }
        finally {
            setId('');
            setPin('');
            closeAllDrawers();
            fetchData();
        }
    }, [closeAllDrawers, fetchData, message]);

    return (
        <>
            {contextHolder}
            <NoticeButton onClick={() => openDrawer('notice')}>
                <BellOutlined /><Text>{notices?.[0]?.text.split('\n')[0] || '공지가 딱히 없네요'}</Text>
            </NoticeButton>
            <NoticeDrawer
                drawerId='notice'
                notices={notices}
                setId={setId}
                handleClickDelete={handleClickDelete}
            />
            <AddNoticeDrawer
                drawerId='addNotice'
                text={text}
                setText={setText}
                pin={pin}
                setPin={setPin}
                handleAddNotice={handleAddNotice}
            />
            <DeleteNoticeDrawer
                drawerId='deleteNotice'
                id={id}
                pin={pin}
                setPin={setPin}
                checkNoticeExists={checkNoticeExists}
                handleDeleteNotice={handleDeleteNotice}
            />
        </>
    )
};

const NoticeButton = styled(Button)`
    width: 100%;
    max-width: 1080px;
    padding: 2rem 1.25rem;
    background-color: ${({ theme }) => theme.lightBlue};
    border-radius: 1.5rem;
    box-shadow: 0 2px 10px 2px rgba(0, 0, 0, 0.1);
    border: none;
    outline: none;
    display: flex;
    justify-content: flex-start;

    & svg {
        font-size: 1.75rem;
        color: ${({ theme }) => theme.deepDarkGray};
    }
    &:hover {
        background-color: ${({ theme }) => theme.semiLightBlue} !important;
    }
`;

const Text = styled.span`
    font-size: 1.25rem;
    padding-left: 0.5rem;
    color: ${({ theme }) => theme.deepDarkGray};
    transition: color 0.3s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export default Notice;