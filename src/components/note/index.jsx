import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { useFetchContext, useDrawerContext } from 'context';
import useMessage from 'hooks/useMessage';
import { addNote, deleteNote, noteExists, checkNotePin } from 'api/note';
import { Button } from 'antd';
import { PlusCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { Container } from 'components/common/Container';
import AddNoteDrawer from './AddNoteDrawer';
import DeleteNoteDrawer from './DeleteNoteDrawer';

const Note = () => {
    const { notes, fetchData } = useFetchContext();
    const [message, contextHolder] = useMessage();
    const [id, setId] = useState('');
    const [text, setText] = useState('');
    const [pin, setPin] = useState('');
    const { openDrawer, closeAllDrawers } = useDrawerContext();

    // 이미 삭제된 노트인지 체크. 이미 있는 노트를 다루는 모든 작업에 적용해야 함, true를 리턴 시 각 작업 진행
    const checkNoteExists = useCallback(async (id) => {
        try {
            await noteExists(id);
            return true;
        } catch {
            message.warning('이미 삭제된 한마디예요.');
            setId('');
            setText('');
            setPin('');
            closeAllDrawers();
            fetchData();
            return false;
        }
    }, [closeAllDrawers, fetchData, message]);

    const handleAddNote = useCallback(async (text, pin) => {
        try {
            await addNote(text, pin);
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
            if (await checkNoteExists(id)) {
                setId(id);
                openDrawer('deleteNote');
            }
        }
        catch {
            message.error('인터넷이 안 좋거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.');
        }
    }, []);

    const handleDeleteNote = useCallback(async (id) => {
        try {
            if (await checkNoteExists(id)) {
                await deleteNote(id);
                message.success('한마디를 삭제했어요.');
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
        <Container>
            {contextHolder}
            <AddButton onClick={() => openDrawer('addNote')}>
                <PlusCircleOutlined />
                멋진 한마디 남겨요 (일주일 후 자동 삭제돼요)
            </AddButton>
            {notes && notes.map(note => (
                <NoteCard key={note.id}>
                    <NoteText>{note.text}</NoteText>
                    <NoteDeleteButton onClick={() => handleClickDelete(note.id)}><CloseOutlined /></NoteDeleteButton>
                </NoteCard>
            ))}
            <AddNoteDrawer
                drawerId='addNote'
                text={text}
                setText={setText}
                pin={pin}
                setPin={setPin}
                handleAddNote={handleAddNote}
            />
            <DeleteNoteDrawer
                drawerId='deleteNote'
                id={id}
                pin={pin}
                setPin={setPin}
                checkNoteExists={checkNoteExists}
                handleDeleteNote={handleDeleteNote}
            />
        </Container>
    )
};

const AddButton = styled(Button)`
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

const NoteCard = styled.div`
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    min-height: 5rem;
    border-radius: 1rem;
    border: 1px solid ${({ theme }) => theme.border};
    box-shadow: 0 0.125rem 0 rgba(0, 0, 0, 0.02);
`;

const NoteText = styled.div`
    padding: 0.75rem 1rem;
    font-size: 1.25rem;
    line-height: 2rem;
    white-space: pre-line;
    word-break: break-all;
`;

const NoteDeleteButton = styled.div`
    margin: 1rem;
    user-select: none;
    cursor: pointer;
    & svg {
        font-size: 1.25rem !important;
    }
`;

export default Note;