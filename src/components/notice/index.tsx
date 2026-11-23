import { useState, useCallback } from 'react';
import styled from 'styled-components';
import { useDrawerContext } from '@/context';
import { useAddNotice, useDeleteNotice, useNotices, useRefreshNotices } from '@/queries/notes';
import { noticeExists } from '@/api/notice';
import { Button } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import NoticeDrawer from './NoticeDrawer';
import AddNoticeDrawer from './AddNoticeDrawer';
import DeleteNoticeDrawer from './DeleteNoticeDrawer';

const Notice = () => {
    const notices = useNotices();
    const refreshNotices = useRefreshNotices();
    const { mutateAsync: addNoticeAsync } = useAddNotice();
    const { mutateAsync: deleteNoticeAsync } = useDeleteNotice();
    const [id, setId] = useState('');
    const [text, setText] = useState('');
    const [pin, setPin] = useState('');
    const { openDrawer, closeAllDrawers } = useDrawerContext();

    // 이미 삭제된 공지인지 체크. PIN 확인 Drawer가 PIN을 확인하기 전에 사용한다 (true를 리턴하면 계속 진행)
    const checkNoticeExists = useCallback(
        async (id: string) => {
            try {
                await noticeExists(id);
                return true;
            } catch {
                setId('');
                setText('');
                setPin('');
                closeAllDrawers();
                refreshNotices();
                return false;
            }
        },
        [closeAllDrawers, refreshNotices],
    );

    const handleAddNotice = useCallback(
        async (text: string) => {
            try {
                await addNoticeAsync(text);
                setText('');
                setPin('');
                closeAllDrawers();
            } catch {
                // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
            }
        },
        [addNoticeAsync, closeAllDrawers],
    );

    // 삭제 X 버튼: 바로 PIN 확인 Drawer를 연다 (이전에는 여기서 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5)
    const handleClickDelete = useCallback(
        (id: string) => {
            setId(id);
            openDrawer('deleteNotice');
        },
        [openDrawer],
    );

    // 이미 삭제됐으면 서버가 404를 준다 → 다른 실패와 같이 처리 (이전에는 삭제 전에 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5)
    const handleDeleteNotice = useCallback(
        async (id: string) => {
            try {
                await deleteNoticeAsync(id);
            } catch {
                // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
            } finally {
                setId('');
                setPin('');
                closeAllDrawers();
            }
        },
        [closeAllDrawers, deleteNoticeAsync],
    );

    return (
        <>
            <NoticeButton onClick={() => openDrawer('notice')}>
                <BellOutlined />
                <Text>{notices?.[0]?.text.split('\n')[0] || '공지가 딱히 없네요'}</Text>
            </NoticeButton>
            <NoticeDrawer
                drawerId="notice"
                notices={notices}
                setId={setId}
                handleClickDelete={handleClickDelete}
            />
            <AddNoticeDrawer
                drawerId="addNotice"
                text={text}
                setText={setText}
                pin={pin}
                setPin={setPin}
                handleAddNotice={handleAddNotice}
            />
            <DeleteNoticeDrawer
                drawerId="deleteNotice"
                id={id}
                pin={pin}
                setPin={setPin}
                checkNoticeExists={checkNoticeExists}
                handleDeleteNotice={handleDeleteNotice}
            />
        </>
    );
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
