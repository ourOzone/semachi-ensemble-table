import { useCallback } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Button } from "antd";
import { useDrawerContext } from 'context';
import { PlusCircleOutlined, CloseOutlined } from '@ant-design/icons';

const NoticeDrawer = ({ drawerId, notices, handleClickDelete }) => {
    const { openDrawer } = useDrawerContext();

    return (
        <>
            <Drawer drawerId={drawerId}>
                <Wrapper>
                    <AddButton onClick={() => openDrawer('addNotice')}>
                        <PlusCircleOutlined />
                        공지를 추가해요 (관리자 전용)
                    </AddButton>
                    {notices && notices.map(notice => (
                        <NoticeCard key={notice.id}>
                            <NoticeText>{notice.text}</NoticeText>
                            <NoticeDeleteButton onClick={() => handleClickDelete(notice.id)}><CloseOutlined /></NoticeDeleteButton>
                        </NoticeCard>
                    ))}
                </Wrapper>
            </Drawer>
        </>
    );
};

const Wrapper = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const AddButton = styled(Button)`
    width: 100%;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    border-radius: 1rem;
    border: 0.125rem dashed ${({ theme }) => theme.darkGray};
    height: 5.5rem;
    box-shadow: none;

    & * {
        font-size: 1.25rem;
        color: ${({ theme }) => theme.darkGray};
        transition: color 0.3s ease;
    }
    & svg {
        font-size: 2.5rem;
    }

    &:hover {
        & *, svg {
            color: ${({ theme }) => theme.primary};
        }
    }

`;

const NoticeCard = styled.div`
    width: 100%;
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    min-height: 5rem;
    border-radius: 1rem;
    border: 1px solid ${({ theme }) => theme.border};
    box-shadow: 0 0.125rem 0 rgba(0, 0, 0, 0.02);
`;

const NoticeText = styled.div`
    padding: 0.75rem 1rem;
    font-size: 1.25rem;
    line-height: 2rem;
    white-space: pre-line;
    word-break: break-all;
`;

const NoticeDeleteButton = styled.div`
    margin: 1rem;
    user-select: none;
    cursor: pointer;
    & svg {
        font-size: 1.25rem !important;
    }
`;

export default NoticeDrawer;