import { z } from 'zod';

// 서버(api.js) 응답 원본의 스키마. mongoose 스키마를 기준으로 한다.
// 2단계에서는 타입 추출(z.infer)에만 쓰고, 응답 parse는 3단계(TanStack Query 도입)에서 적용한다.
// 날짜 필드는 JSON 직렬화된 ISO 8601 문자열로 온다.

export const teamResponseSchema = z.object({
    _id: z.string(),
    name: z.string(),
    type: z.string(),
    /** [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트] */
    desc: z.array(z.string()),
    publishDate: z.string().optional(),
    /** 백엔드가 그대로 내려주는 값. 앱 내부 타입(Team)으로 옮기지 않는다. */
    pin: z.string().optional(),
});

export const ensembleResponseSchema = z.object({
    _id: z.string(),
    teamId: z.string(),
    teamName: z.string(),
    /** 월요일 0 ~ 일요일 6 */
    day: z.number(),
    /** 시작 시간칸 인덱스 (idx2hour 기준, 30분 단위) */
    startTime: z.number(),
    /** 마지막 시간칸 인덱스. 실제 종료 시각은 idx2hour[endTime + 1] */
    endTime: z.number(),
    repeat: z.boolean(),
    nextDate: z.string(),
    due: z.string(),
    /** '무기한' | '일회성'. 레거시 필드 (repeat로 대체됨) */
    type: z.string().optional(),
});

export const noteResponseSchema = z.object({
    _id: z.string(),
    text: z.string(),
    /** 백엔드가 그대로 내려주는 값. 앱 내부 타입(Note)으로 옮기지 않는다. */
    pin: z.string().optional(),
});

export const noticeResponseSchema = z.object({
    _id: z.string(),
    content: z.string(),
    publishDate: z.string().optional(),
});

export type TeamResponse = z.infer<typeof teamResponseSchema>;
export type EnsembleResponse = z.infer<typeof ensembleResponseSchema>;
export type NoteResponse = z.infer<typeof noteResponseSchema>;
export type NoticeResponse = z.infer<typeof noticeResponseSchema>;
