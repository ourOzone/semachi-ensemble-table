import { useState, useCallback } from 'react';
import styled from 'styled-components';
import { squircleBordered, squircleNative, squircleShadow } from '@/styles/cardRadius';
import { useDrawerContext } from '@/context';
import { useAddNote, useDeleteNote, useNotes, useRefreshNotes } from '@/queries/notes';
import { noteExists } from '@/api/note';
import { Button } from 'antd';
import { PlusCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { Container } from '@/components/common/Container';
import AddNoteDrawer from './AddNoteDrawer';
import DeleteNoteDrawer from './DeleteNoteDrawer';

const Note = () => {
    const notes = useNotes();
    const refreshNotes = useRefreshNotes();
    const { mutateAsync: addNoteAsync } = useAddNote();
    const { mutateAsync: deleteNoteAsync } = useDeleteNote();
    const [id, setId] = useState('');
    const [text, setText] = useState('');
    const [pin, setPin] = useState('');
    const { openDrawer, closeAllDrawers } = useDrawerContext();

    // 이미 삭제된 한마디인지 체크. PIN 확인 Drawer가 PIN을 확인하기 전에 사용한다 (true를 리턴하면 계속 진행)
    const checkNoteExists = useCallback(
        async (id: string) => {
            try {
                await noteExists(id);
                return true;
            } catch {
                setId('');
                setText('');
                setPin('');
                closeAllDrawers();
                refreshNotes();
                return false;
            }
        },
        [closeAllDrawers, refreshNotes],
    );

    const handleAddNote = useCallback(
        async (text: string, pin: string) => {
            try {
                await addNoteAsync({ text, pin });
                setText('');
                setPin('');
                closeAllDrawers();
            } catch {
                // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
            }
        },
        [addNoteAsync, closeAllDrawers],
    );

    // 삭제 X 버튼: 바로 PIN 확인 Drawer를 연다 (이전에는 여기서 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5)
    const handleClickDelete = useCallback(
        (id: string) => {
            setId(id);
            openDrawer('deleteNote');
        },
        [openDrawer],
    );

    // 이미 삭제됐으면 서버가 404를 준다 → 다른 실패와 같이 처리 (이전에는 삭제 전에 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5)
    const handleDeleteNote = useCallback(
        async (id: string) => {
            try {
                await deleteNoteAsync(id);
            } catch {
                // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
            } finally {
                setId('');
                setPin('');
                closeAllDrawers();
            }
        },
        [closeAllDrawers, deleteNoteAsync],
    );

    return (
        <ShadowWrap>
            <Container>
                <AddButton onClick={() => openDrawer('addNote')}>
                    <PlusCircleOutlined />
                    멋진 한마디 남겨요 (일주일 후 자동 삭제돼요)
                </AddButton>
                {notes &&
                    notes.map((note) => (
                        <NoteCard key={note.id}>
                            <NoteText>{note.text}</NoteText>
                            <NoteDeleteButton onClick={() => handleClickDelete(note.id)}>
                                <CloseOutlined />
                            </NoteDeleteButton>
                        </NoteCard>
                    ))}
                <AddNoteDrawer
                    drawerId="addNote"
                    text={text}
                    setText={setText}
                    pin={pin}
                    setPin={setPin}
                    handleAddNote={handleAddNote}
                />
                <DeleteNoteDrawer
                    drawerId="deleteNote"
                    id={id}
                    pin={pin}
                    setPin={setPin}
                    checkNoteExists={checkNoteExists}
                    handleDeleteNote={handleDeleteNote}
                />
            </Container>
        </ShadowWrap>
    );
};

/** 스쿼클 대체 방식(사파리)에서 카드 그림자가 마스크에 잘려, 감싼 요소가 그림자를 그린다 */
const ShadowWrap = styled.div`
    width: 100%;
    max-width: 1080px;
    ${squircleShadow}
`;

const AddButton = styled(Button)`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    ${squircleNative('1rem', '1.5rem')}
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
        & *,
        svg {
            color: ${({ theme }) => theme.primary};
        }
    }
`;

const NoteCard = styled.div`
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    min-height: 5rem;
    border: 1px solid ${({ theme }) => theme.border};
    ${({ theme }) => squircleBordered('1rem', '1.5rem', '1px', theme.border, theme.container)}
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
