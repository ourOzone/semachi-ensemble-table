import { queryOptions, useQuery } from '@tanstack/react-query';
import { getNotes } from '@/api/note';
import { getNotices } from '@/api/notice';
import { toNotes, toNotices } from '@/lib/notes';
import type { Note, Notice } from '@/types';

export const notesQueryKey = ['notes'] as const;
export const noticesQueryKey = ['notices'] as const;

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
