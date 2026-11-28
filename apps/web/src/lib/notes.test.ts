import { describe, expect, it } from 'vitest';
import { objectIdTime, toNotes, toNotices } from './notes';

describe('toNotes · toNotices', () => {
    it('한마디는 { id, text }로, 공지는 content를 text로 바꾼다', () => {
        expect(toNotes([{ _id: 'n1', text: '한마디' }])).toEqual([
            { id: 'n1', text: '한마디', createdAt: null },
        ]);
        expect(
            toNotices([{ _id: 'c1', content: '공지 내용', publishDate: '2026-11-01T00:00:00Z' }]),
        ).toEqual([{ id: 'c1', text: '공지 내용', createdAt: null }]);
    });

    it('한마디의 작성 시각은 ObjectId 앞 8자리(초)에서 읽는다 (V-4), 형식이 다르면 null', () => {
        // 0x69270000 = 1764163584초
        expect(objectIdTime('69270000aaaaaaaaaaaaaaaa')).toBe(1764163584 * 1000);
        expect(toNotes([{ _id: '69270000aaaaaaaaaaaaaaaa', text: '한마디' }])[0]?.createdAt).toBe(
            1764163584 * 1000,
        );
        expect(objectIdTime('note-1')).toBeNull();
        expect(objectIdTime('69270000aaaaaaaaaaaaaaa')).toBeNull(); // 23자리
    });
});
