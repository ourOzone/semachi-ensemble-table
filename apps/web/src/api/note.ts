import { noteResponseSchema, type IdResponse } from '@/types';
import { del, exists, getList, post } from '.';
import { checkPin } from './pin';

// 주소는 /notes/:id, 남기기 201·삭제 204 (백엔드 개편 B-10)

export const getNotes = () => getList('/notes', noteResponseSchema);
export const addNote = (text: string, pin: string) => post<IdResponse>('/notes', { text, pin });
/** 서버가 글 PIN(또는 마스터 PIN)을 확인한다. 틀리면 403 (백엔드 개편 B-6) */
export const deleteNote = (id: string, pin: string) => del<void>(`/notes/${id}`, { pin });
export const noteExists = (id: string) => exists(`/notes/${id}`);
export const checkNotePin = (noteId: string, pin: string) =>
    checkPin(`/notes/${noteId}/check-pin`, { pin });
