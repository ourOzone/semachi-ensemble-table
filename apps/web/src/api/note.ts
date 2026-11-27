import {
    existsResponseSchema,
    noteResponseSchema,
    pinCheckResponseSchema,
    type IdResponse,
} from '@/types';
import { get, getList, post, del } from '.';

export const getNotes = () => getList('/notes', noteResponseSchema);
export const addNote = (text: string, pin: string) => post<IdResponse>('/note', { text, pin });
export const deleteNote = (id: string) => del<IdResponse>(`/note?id=${id}`);
export const noteExists = async (id: string) =>
    existsResponseSchema.parse(await get(`/note/${id}`));
export const checkNotePin = async (noteId: string, pin: string) =>
    pinCheckResponseSchema.parse(await post('/check-note-pin', { noteId, pin }));
