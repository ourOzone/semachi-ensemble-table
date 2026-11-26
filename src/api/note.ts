import {
    existsResponseSchema,
    noteResponseSchema,
    pinCheckResponseSchema,
    type IdResponse,
} from '@/types';
import axios from 'axios';
import { get, getList, post, del } from '.';

/** 한마디가 이미 100개라 서버가 새 한마디를 거절했는지 (POST /note: 400 'Note limit exceeded') */
export const isNoteLimitExceeded = (err: unknown): boolean =>
    axios.isAxiosError(err) &&
    err.response?.status === 400 &&
    err.response.data === 'Note limit exceeded';

export const getNotes = () => getList('/notes', noteResponseSchema);
export const addNote = (text: string, pin: string) => post<IdResponse>('/note', { text, pin });
export const deleteNote = (id: string) => del<IdResponse>(`/note?id=${id}`);
export const noteExists = async (id: string) =>
    existsResponseSchema.parse(await get(`/note/${id}`));
export const checkNotePin = async (noteId: string, pin: string) =>
    pinCheckResponseSchema.parse(await post('/check-note-pin', { noteId, pin }));
