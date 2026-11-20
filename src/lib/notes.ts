import type { Note, NoteResponse, Notice, NoticeResponse } from '@/types';

// 한마디·공지 서버 응답 → 화면용 데이터

/** { id, text }만 남긴다 (pin은 버린다) */
export function toNotes(notesRaw: NoteResponse[]): Note[] {
    return notesRaw.map(({ _id, text }) => ({ id: _id, text }));
}

/** 서버 필드 content를 text로 바꾼다 */
export function toNotices(noticesRaw: NoticeResponse[]): Notice[] {
    return noticesRaw.map(({ _id, content }) => ({ id: _id, text: content }));
}
