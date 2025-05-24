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

const Notes = () => {
    const { notes, fetchData } = useFetchContext();
    const [message, contextHolder] = useMessage();
    const [id, setId] = useState('');
    const [text, setText] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false); // PIN 4자리 다 입력했는데 틀린 경우에만 true
    const { openDrawer, closeAllDrawers } = useDrawerContext();

    const handleAddNote = useCallback(async (text, pin) => {
        try {
            addNote(text, pin);
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
            await noteExists(id);
            setId(id);
            openDrawer('deleteNote');
        }
        catch {
            message.warning('이미 삭제된 글이에요.');
            fetchData();
        }
    }, []);

    // 삭제 시 PIN 입력 처리
    const handleDeletePinChange = useCallback(async (value, id) => {
        const maxInput = 4;

        const numeric = value.replace(/\D/g, '');
        if (numeric.length <= maxInput) {
            setPin(numeric);

            if (numeric.length === maxInput) {
                // 4자리 모두 입력한 경우
                try {
                    await noteExists(id); // 누른 노트가 이미 삭제됐으면 에러
                    setPin(numeric);
                } catch {
                    message.warning('이미 삭제된 글이에요.');
                    setId('');
                    setPin('');
                    fetchData();
                    closeAllDrawers();
                    return;
                }

                try {
                    // PIN 판별
                    const result = await checkNotePin(id, numeric);
                    setError(!result);
                } catch {
                    message.error('서버랑 연결이 잘 안 되네요. 나중에 다시 해보세요.');
                    setError(true);
                }

            }
        }
    }, [setPin, openDrawer]);

    const handleDeleteNote = useCallback(async (id) => {
        try {
            await noteExists(id);
            await deleteNote(id);
            message.success('삭제했어요.');
        }
        catch {
            message.warning('이미 삭제된 글이에요.')
            fetchData();
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
                멋진 한마디 남겨요
            </AddButton>
            {notes && notes.map(note => (
                <Note key={note.id}>
                    <NoteText>{note.text}</NoteText>
                    <NoteDeleteButton onClick={() => handleClickDelete(note.id)}><CloseOutlined /></NoteDeleteButton>
                </Note>
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
                error={error}
                setError={setError}
                handleDeletePinChange={handleDeletePinChange}
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

const Note = styled.div`
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

export default Notes;