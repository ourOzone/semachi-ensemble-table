import { get, post, del } from '.';

export const getNotes = () => get('/notes');
export const addNote = (text, pin) => post('/note', { text, pin });
export const deleteNote = (id) => del(`/note?id=${id}`);
export const noteExists = (id) => get(`/note/${id}`);
export const checkNotePin = (noteId, pin) => post('/check-note-pin', { noteId, pin });