import type { ExistsResponse, IdResponse, NoteResponse, PinCheckResponse } from '@/types';
import { get, post, del } from '.';

export const getNotes = () => get<NoteResponse[]>('/notes');
export const addNote = (text: string, pin: string) => post<IdResponse>('/note', { text, pin });
export const deleteNote = (id: string) => del<IdResponse>(`/note?id=${id}`);
export const noteExists = (id: string) => get<ExistsResponse>(`/note/${id}`);
export const checkNotePin = (noteId: string, pin: string) =>
    post<PinCheckResponse>('/check-note-pin', { noteId, pin });
