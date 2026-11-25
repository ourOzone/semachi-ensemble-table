import { useState, useCallback } from 'react';
import { useDrawerContext } from '@/context';
import { useAddNote, useDeleteNote, useNotes, useRefreshNotes } from '@/queries/notes';
import { noteExists } from '@/api/note';
import { X } from 'lucide-react';
import { AddPill } from '@/components/ui/add-pill';
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
        // 한마디 카드 (V-3 1차에 미리 만듦, V-4 범위): 점선 추가 버튼 + 테두리 카드 목록 → 흰 카드 안에 머리 줄(제목·추가) + 목록.
        // PC는 두 줄로 나란히
        <section className="ui w-full max-w-[1080px] rounded-card bg-surface p-4 shadow-card md:p-7">
            <div className="mb-3 flex items-center justify-between gap-3 md:mb-4">
                <div className="min-w-0">
                    <h2 className="text-[17px] font-bold text-ink md:text-[20px]">한마디</h2>
                    <p className="text-[12px] text-neutral-500 md:text-[13px]">
                        일주일 후 자동으로 삭제돼요
                    </p>
                </div>
                <AddPill label="한마디 남기기" onClick={() => openDrawer('addNote')} />
            </div>
            {notes.length === 0 ? (
                <p className="squircle rounded-2xl bg-neutral-50 py-8 text-center text-[14px] text-neutral-500 supports-[corner-shape:squircle]:rounded-[24px] md:text-[15px]">
                    아직 한마디가 없어요. 첫 한마디를 남겨 보세요
                </p>
            ) : (
                <ul className="grid gap-2 md:grid-cols-2 md:gap-3">
                    {notes.map((note) => (
                        <li
                            key={note.id}
                            className="squircle flex items-start gap-1 rounded-2xl bg-neutral-50 py-3 pr-1.5 pl-4 supports-[corner-shape:squircle]:rounded-[24px] md:py-4 md:pr-2 md:pl-5"
                        >
                            <p className="min-w-0 flex-1 py-1 text-[15px] leading-relaxed break-all whitespace-pre-line text-ink md:text-[16px]">
                                {note.text}
                            </p>
                            <button
                                type="button"
                                aria-label="한마디 삭제"
                                onClick={() => handleClickDelete(note.id)}
                                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-[background-color,color,scale] duration-150 hover:bg-neutral-200 hover:text-ink active:scale-[0.95]"
                            >
                                <X className="size-4" aria-hidden />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
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
        </section>
    );
};

export default Note;
