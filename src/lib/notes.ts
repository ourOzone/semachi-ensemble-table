import type { Note, NoteResponse, Notice, NoticeResponse } from '@/types';

// 한마디·공지 서버 응답 → 화면용 데이터

/**
 * MongoDB ObjectId의 만든 시각 (ms). id 앞 8자리(16진수)가 만든 시각(초)이다.
 * 서버가 한마디에 작성 시각을 따로 저장하지 않아 이것으로 읽는다 (V-4). ObjectId 형식이 아니면 null
 */
export function objectIdTime(id: string): number | null {
    if (!/^[0-9a-f]{24}$/i.test(id)) return null;
    return parseInt(id.slice(0, 8), 16) * 1000;
}

/** { id, text, createdAt }만 남긴다 (pin은 버린다). createdAt은 id에서 읽은 작성 시각 (V-4) */
export function toNotes(notesRaw: NoteResponse[]): Note[] {
    return notesRaw.map(({ _id, text }) => ({ id: _id, text, createdAt: objectIdTime(_id) }));
}

/** 서버 필드 content를 text로 바꾼다 */
export function toNotices(noticesRaw: NoticeResponse[]): Notice[] {
    return noticesRaw.map(({ _id, content }) => ({ id: _id, text: content }));
}
