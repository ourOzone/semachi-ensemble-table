import { describe, expect, it } from 'vitest';
import { toNotes, toNotices } from './notes';

describe('toNotes · toNotices', () => {
    it('한마디는 { id, text }로, 공지는 content를 text로 바꾼다 (pin은 버린다)', () => {
        expect(toNotes([{ _id: 'n1', text: '한마디', pin: '0000' }])).toEqual([
            { id: 'n1', text: '한마디' },
        ]);
        expect(
            toNotices([{ _id: 'c1', content: '공지 내용', publishDate: '2026-11-01T00:00:00Z' }]),
        ).toEqual([{ id: 'c1', text: '공지 내용' }]);
    });
});
