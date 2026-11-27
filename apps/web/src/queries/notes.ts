import { useCallback } from 'react';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addNote, deleteNote, getNotes } from '@/api/note';
import { addNotice, deleteNotice, getNotices } from '@/api/notice';
import { toNotes, toNotices } from '@/lib/notes';
import type { Note, Notice } from '@/types';

import { noticesQueryKey, notesQueryKey } from './keys';

export { noticesQueryKey, notesQueryKey };

export const notesQueryOptions = queryOptions({ queryKey: notesQueryKey, queryFn: getNotes });
export const noticesQueryOptions = queryOptions({
    queryKey: noticesQueryKey,
    queryFn: getNotices,
});

const NO_NOTES: Note[] = [];
const NO_NOTICES: Notice[] = [];

/** 한마디 목록. 불러오기 전에는 빈 배열 */
export function useNotes(): Note[] {
    const { data } = useQuery({ ...notesQueryOptions, select: toNotes });
    return data ?? NO_NOTES;
}

/** 공지 목록 (최신순). 불러오기 전에는 빈 배열 */
export function useNotices(): Notice[] {
    const { data } = useQuery({ ...noticesQueryOptions, select: toNotices });
    return data ?? NO_NOTICES;
}

// ---------------- 변경 (mutation) ----------------
// 훅의 책임: 서버 요청 + 해당 목록만 다시 불러오기 (이전에는 무엇이든 바뀌면 4개 목록 전체를 다시 불러왔다: ISSUES P1)
// UI 반응(Drawer 닫기·입력값 초기화)은 호출부가 mutateAsync 결과에 따라 처리한다.
// 다시 불러오기는 기다리지 않는다 (이전 fetchData()도 기다리지 않고 Drawer를 닫았다)

/** 한마디 목록을 다시 불러온다 (이미 삭제된 한마디를 만났을 때 등) */
export function useRefreshNotes() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: notesQueryKey });
    }, [queryClient]);
}

/** 공지 목록을 다시 불러온다 (이미 삭제된 공지를 만났을 때 등) */
export function useRefreshNotices() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: noticesQueryKey });
    }, [queryClient]);
}

export function useAddNote() {
    const refreshNotes = useRefreshNotes();
    return useMutation({
        mutationFn: ({ text, pin }: { text: string; pin: string }) => addNote(text, pin),
        onSuccess: refreshNotes,
    });
}

/** 성공·실패(404 = 이미 삭제됨 포함) 모두 목록을 다시 불러온다 (이전 handleDeleteNote의 finally와 같음) */
export function useDeleteNote() {
    const refreshNotes = useRefreshNotes();
    return useMutation({ mutationFn: deleteNote, onSettled: refreshNotes });
}

export function useAddNotice() {
    const refreshNotices = useRefreshNotices();
    return useMutation({ mutationFn: addNotice, onSuccess: refreshNotices });
}

/** 성공·실패(404 = 이미 삭제됨 포함) 모두 목록을 다시 불러온다 (이전 handleDeleteNotice의 finally와 같음) */
export function useDeleteNotice() {
    const refreshNotices = useRefreshNotices();
    return useMutation({ mutationFn: deleteNotice, onSettled: refreshNotices });
}
