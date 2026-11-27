import { existsResponseSchema, noteResponseSchema, type IdResponse } from '@/types';
import { get, getList, post, del } from '.';
import { checkPin } from './pin';

export const getNotes = () => getList('/notes', noteResponseSchema);
export const addNote = (text: string, pin: string) => post<IdResponse>('/note', { text, pin });
/** 서버가 글 PIN(또는 마스터 PIN)을 확인한다. 틀리면 403 (백엔드 개편 B-6) */
export const deleteNote = (id: string, pin: string) => del<IdResponse>(`/note?id=${id}`, { pin });
export const noteExists = async (id: string) =>
    existsResponseSchema.parse(await get(`/note/${id}`));
export const checkNotePin = (noteId: string, pin: string) =>
    checkPin('/check-note-pin', { noteId, pin });
