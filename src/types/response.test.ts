import { describe, expect, it } from 'vitest';
import {
    ensembleResponseSchema,
    noteResponseSchema,
    noticeResponseSchema,
    teamResponseSchema,
} from './response';

// 백엔드(mongoose)가 실제로 내려주는 JSON 형태 예시. __v 같은 부가 필드와 ISO 날짜 문자열을 포함한다.
const teamJson = {
    _id: '67e363a96724937d8f2c25a1',
    name: '비틀즈',
    desc: ['보컬', '기타', '베이스', '드럼', '키보드', '매니저', '셋리스트'],
    type: '세마치공연(정기/연말)',
    publishDate: '2026-03-02T09:00:00.000Z',
    pin: '1234',
    __v: 0,
};
const ensembleJson = {
    _id: '6801a2b3c4d5e6f708192a3b',
    teamId: '67e363a96724937d8f2c25a1',
    teamName: '비틀즈',
    startTime: 2,
    endTime: 5,
    day: 0,
    type: '무기한',
    due: '2099-12-31T00:00:00.000Z',
    nextDate: '2026-11-23T00:00:00.000Z',
    repeat: true,
    __v: 0,
};
const noteJson = { _id: '6801a2b3c4d5e6f708192a3c', text: '메모', pin: '0000', __v: 0 };
const noticeJson = {
    _id: '6801a2b3c4d5e6f708192a3d',
    content: '공지',
    publishDate: '2026-11-01T00:00:00.000Z',
    __v: 0,
};

describe('서버 응답 스키마', () => {
    it('실제 응답 형태를 받아들이고, 정의하지 않은 필드(__v)는 버린다', () => {
        expect(teamResponseSchema.parse(teamJson)).not.toHaveProperty('__v');
        expect(ensembleResponseSchema.parse(ensembleJson)).not.toHaveProperty('__v');
        expect(noteResponseSchema.parse(noteJson)).not.toHaveProperty('__v');
        expect(noticeResponseSchema.parse(noticeJson)).not.toHaveProperty('__v');
    });

    it('optional 필드가 없어도 받아들인다', () => {
        const { publishDate: _p, pin: _pin, ...team } = teamJson;
        const { type: _t, ...ensemble } = ensembleJson;
        expect(teamResponseSchema.safeParse(team).success).toBe(true);
        expect(ensembleResponseSchema.safeParse(ensemble).success).toBe(true);
    });

    it('필수 필드가 빠지거나 타입이 다르면 거부한다', () => {
        const { name: _n, ...noName } = teamJson;
        expect(teamResponseSchema.safeParse(noName).success).toBe(false);
        expect(ensembleResponseSchema.safeParse({ ...ensembleJson, day: '0' }).success).toBe(false);
    });

    // 3-10: 합주표(7 x 30) 배열 접근이 전제로 하는 범위. 실제 서버 데이터는 모두 이 범위 안이다 (endTime null 1건 제외)
    it('합주의 요일(0~6)·시간칸(0~29) 범위와 시작 ≤ 끝을 검사한다', () => {
        const ok = (overrides: object) =>
            ensembleResponseSchema.safeParse({ ...ensembleJson, ...overrides }).success;

        expect(ok({ day: 6, startTime: 29, endTime: 29 })).toBe(true);
        expect(ok({ day: 7 })).toBe(false);
        expect(ok({ day: -1 })).toBe(false);
        expect(ok({ endTime: 30 })).toBe(false);
        expect(ok({ startTime: 1.5 })).toBe(false);
        expect(ok({ startTime: 6, endTime: 5 })).toBe(false);
    });
});
