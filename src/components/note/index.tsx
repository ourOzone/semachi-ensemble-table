import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { isNotFound } from '@/api';
import { isNoteLimitExceeded, noteExists } from '@/api/note';
import { AddPill } from '@/components/ui/add-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
    notesQueryOptions,
    useAddNote,
    useDeleteNote,
    useNotes,
    useRefreshNotes,
} from '@/queries/notes';
import { useDrawerStore } from '@/stores/drawer';
import type { Note as NoteItem } from '@/types';
import AddNoteDrawer from './AddNoteDrawer';
import DeleteNoteDrawer from './DeleteNoteDrawer';
import { linkify } from './linkify';

// 한마디 카드 (View 개편 V-4, 카드 모양은 V-3 1차에 미리 만듦).
// 남기기·삭제는 아래에서 올라오는 새 Drawer (이전: 오른쪽에서 열리는 옛 Drawer, 알림 없음).
// 목록: 처음 PREVIEW_COUNT개만, "전체 보기"로 펼침. 긴 한마디는 LINE_CLAMP줄까지, "더 보기"로 펼침.
// 한마디마다 작성 시각(초까지), 글 속 주소는 링크

/** 처음 보이는 한마디 수 (PC는 두 줄로 3줄) */
const PREVIEW_COUNT = 6;

const CHECK_FAILED = '확인하지 못했어요. 잠시 후 다시 시도해 주세요.';

const Note = () => {
    const notes = useNotes();
    // 처음 불러오는 동안은 목록 자리에 회색 상자 (V-3 1차)
    const { isPending } = useQuery(notesQueryOptions);
    const refreshNotes = useRefreshNotes();
    const { mutateAsync: addNoteAsync } = useAddNote();
    const { mutateAsync: deleteNoteAsync } = useDeleteNote();
    const openDrawer = useDrawerStore((state) => state.openDrawer);
    const closeAllDrawers = useDrawerStore((state) => state.closeAllDrawers);
    // 삭제할 한마디. 닫혀도 지우지 않는다 (내려가는 동안 내용이 그대로 보이게)
    const [target, setTarget] = useState<NoteItem | null>(null);
    const [showAll, setShowAll] = useState(false);

    // 남기기: 성공하면 닫고 알림, 실패하면 알리고 PIN 단계에 머문다 (이전: 실패해도 아무 반응 없음)
    const handleAddNote = async (text: string, pin: string) => {
        try {
            await addNoteAsync({ text, pin });
        } catch (err) {
            // 한마디가 이미 100개면 서버가 거절한다 (오래된 한마디는 서버가 목록을 불러올 때 지운다)
            toast.error(
                isNoteLimitExceeded(err)
                    ? '한마디가 가득 찼어요. 며칠 뒤 다시 남겨 주세요.'
                    : '저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
            );
            return false;
        }
        closeAllDrawers();
        toast.success('한마디를 남겼어요.');
        return true;
    };

    // 삭제 X: 한마디가 아직 있으면 삭제 Drawer를 연다. 이미 삭제됐으면(404) 알리고 목록을 다시 불러온다,
    // 확인 요청 자체가 실패하면 알리고 열지 않는다 (팀·합주와 같음, 이전: PIN Drawer 안에서 확인하고 실패하면 알림 없이 닫음)
    const handleClickDelete = async (note: NoteItem) => {
        try {
            await noteExists(note.id);
        } catch (err) {
            if (isNotFound(err)) {
                refreshNotes();
                toast.error('이미 삭제된 한마디예요.');
            } else {
                toast.error(CHECK_FAILED);
            }
            return;
        }
        setTarget(note);
        openDrawer('deleteNote');
    };

    // 삭제: 그새 삭제됐어도(404) 결과는 같아 "삭제했어요." 실패하면 알리고 PIN부터 다시
    const handleDeleteNote = async (id: string) => {
        try {
            await deleteNoteAsync(id);
        } catch (err) {
            if (!isNotFound(err)) {
                toast.error('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
                return false;
            }
        }
        closeAllDrawers();
        toast.success('삭제했어요.');
        return true;
    };

    const visible = showAll ? notes : notes.slice(0, PREVIEW_COUNT);

    return (
        // 흰 카드 안에 머리 줄(제목·추가) + 목록. PC는 두 줄로 나란히
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
            {isPending ? (
                <div aria-busy className="grid gap-2 md:grid-cols-2 md:gap-3">
                    {[0, 1, 2].map((idx) => (
                        <Skeleton
                            key={idx}
                            className="squircle h-[52px] rounded-2xl supports-[corner-shape:squircle]:rounded-[24px] md:h-[60px]"
                        />
                    ))}
                </div>
            ) : notes.length === 0 ? (
                <p className="squircle rounded-2xl bg-neutral-50 py-8 text-center text-[14px] text-neutral-500 supports-[corner-shape:squircle]:rounded-[24px] md:text-[15px]">
                    아직 한마디가 없어요. 첫 한마디를 남겨 보세요
                </p>
            ) : (
                <>
                    <ul className="grid gap-2 md:grid-cols-2 md:gap-3">
                        {visible.map((note) => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                onDelete={() => void handleClickDelete(note)}
                            />
                        ))}
                    </ul>
                    {notes.length > PREVIEW_COUNT && (
                        <button
                            type="button"
                            aria-expanded={showAll}
                            className="squircle mt-2 flex w-full items-center justify-center gap-1 rounded-2xl py-3 text-[14px] font-medium text-neutral-600 transition-[background-color,scale] duration-150 hover:bg-neutral-50 active:scale-[0.98] supports-[corner-shape:squircle]:rounded-[24px] md:mt-3 md:text-[15px]"
                            onClick={() => setShowAll(!showAll)}
                        >
                            {showAll ? (
                                <>
                                    접기
                                    <ChevronUp className="size-4" aria-hidden />
                                </>
                            ) : (
                                <>
                                    전체 보기 ({notes.length}개)
                                    <ChevronDown className="size-4" aria-hidden />
                                </>
                            )}
                        </button>
                    )}
                </>
            )}
            <AddNoteDrawer onSubmit={handleAddNote} />
            <DeleteNoteDrawer note={target} onDelete={handleDeleteNote} />
        </section>
    );
};

/** 긴 한마디는 이 줄 수까지만 보이고 "더 보기"로 펼친다 */
const LINE_CLAMP = 'line-clamp-5';

/** "2026.11.26 14:03:22" (작성 시각, 초까지) */
const formatCreatedAt = (ms: number) => dayjs(ms).format('YYYY.MM.DD HH:mm:ss');

const NoteCard = ({ note, onDelete }: { note: NoteItem; onDelete: () => void }) => {
    const textRef = useRef<HTMLParagraphElement>(null);
    const [expanded, setExpanded] = useState(false);
    // 줄 수 제한에 걸려 잘렸는지 (카드 폭이 바뀌면 다시 잰다). 펼친 동안은 재지 않는다 ("접기"가 남게)
    const [clamped, setClamped] = useState(false);
    useEffect(() => {
        const el = textRef.current;
        // ResizeObserver가 없는 환경(테스트의 jsdom)에서는 재지 않는다. 관찰을 시작하면 한 번 바로 불린다
        if (!el || expanded || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() =>
            setClamped(el.scrollHeight > el.clientHeight + 1),
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [expanded]); // 한마디는 수정할 수 없어 글이 바뀌지 않는다 (카드는 id로 구분)

    return (
        <li className="squircle flex items-start gap-1 rounded-2xl bg-neutral-50 py-3 pr-1.5 pl-4 supports-[corner-shape:squircle]:rounded-[24px] md:py-4 md:pr-2 md:pl-5">
            <div className="min-w-0 flex-1 py-1">
                {/* 낱말 단위로 줄을 바꾸고, 한 낱말이 한 줄보다 길 때(링크·영문)만 자른다 (V-4, 이전: 낱말 중간에서도) */}
                <p
                    ref={textRef}
                    className={cn(
                        'text-[15px] leading-relaxed break-keep whitespace-pre-line text-ink [overflow-wrap:anywhere] md:text-[16px]',
                        !expanded && LINE_CLAMP,
                    )}
                >
                    {linkify(note.text)}
                </p>
                {(clamped || expanded) && (
                    <button
                        type="button"
                        aria-expanded={expanded}
                        className="mt-0.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-ink md:text-[14px]"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? '접기' : '더 보기'}
                    </button>
                )}
                {note.createdAt !== null && (
                    <time
                        dateTime={dayjs(note.createdAt).toISOString()}
                        className="mt-1 block text-[12px] text-neutral-400 tabular-nums md:text-[13px]"
                    >
                        {formatCreatedAt(note.createdAt)}
                    </time>
                )}
            </div>
            <button
                type="button"
                aria-label="한마디 삭제"
                onClick={onDelete}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-[background-color,color,scale] duration-150 hover:bg-neutral-200 hover:text-ink active:scale-[0.95]"
            >
                <X className="size-4" aria-hidden />
            </button>
        </li>
    );
};

export default Note;
