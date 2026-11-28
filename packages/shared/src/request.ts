import { z } from 'zod';
import { NOTE_TEXT_MAX, SETLIST_MAX, TEAM_MEMBER_MAX, TEAM_NAME_MAX } from './limits.ts';

// 요청 본문·주소 값의 Zod 스키마 (백엔드 개편 B-8 S5). 서버가 라우트 앞에서 검사하고, 맞지 않으면 400.
// 웹이 보내는 JSON 모양 그대로다 (웹의 Dayjs 값은 보낼 때 ISO 문자열이 된다). 정의하지 않은 필드는 버린다.
// PIN 확인용 pin은 여기서 검사하지 않는다: 없거나 틀리면 지금처럼 403과 틀린 횟수 (서버 lib/pin-check).
// 새로 정하는 PIN(팀 만들기·날적이 남기기)만 형식을 본다.

/** MongoDB 문서 id (ObjectId: 16진수 24자리). 이 형식이 아니면 DB에 묻지 않고 400 (이전: DB가 500) */
export const objectIdSchema = z.string().regex(/^[0-9a-f]{24}$/i, 'ObjectId가 아니다');

/** 주소의 ?id= (팀·합주·날적이·공지 수정·삭제) */
export const idQuerySchema = z.object({ id: objectIdSchema });
/** 주소의 /:id (있는지 확인) */
export const idParamsSchema = z.object({ id: objectIdSchema });

/** 새로 정하는 PIN: 숫자 4자리 (웹의 PIN 칸) */
export const newPinSchema = z.string().regex(/^\d{4}$/, '숫자 4자리가 아니다');

/** PIN 확인 API의 PIN: 비어 있지 않은 문자열 (형식이 다르면 어차피 틀린다) */
const pinInputSchema = z.string().min(1).max(64);

/** 시간칸 0 ~ 29 (09:00부터 30분씩, 웹 constants의 idx2hour) */
export const timeSlotSchema = z.number().int().min(0).max(29);

// --- 팀 ---

/** 팀원 6칸 + 셋리스트 1칸 (desc). 팀원은 앞뒤 공백을 빼고 센다 (웹도 빼고 보낸다), 셋리스트는 그대로 */
const member = z.string().trim().max(TEAM_MEMBER_MAX);
const teamDescSchema = z.tuple([
    member,
    member,
    member,
    member,
    member,
    member,
    z.string().max(SETLIST_MAX),
]);

/** 팀 수정 (PUT /team?id=). 종류는 문자열이면 된다 (옛 종류도 그대로 쓴다, 사용자 결정) */
export const teamUpdateBodySchema = z.object({
    name: z.string().trim().min(1).max(TEAM_NAME_MAX),
    type: z.string().trim().min(1),
    desc: teamDescSchema,
});

/** 팀 만들기 (POST /team) */
export const teamCreateBodySchema = teamUpdateBodySchema.extend({
    pin: newPinSchema,
    publishDate: z.iso.datetime().optional(),
});

export const checkTeamPinBodySchema = z.object({ teamId: objectIdSchema, pin: pinInputSchema });

// --- 합주 ---

/** 합주 수정 (PUT /ensemble?id=). 팀은 바꾸지 않는다. teamName·day는 서버가 채운다 */
export const ensembleUpdateBodySchema = z
    .object({
        startTime: timeSlotSchema,
        endTime: timeSlotSchema,
        repeat: z.boolean(),
        /** 다음 합주 시각 (웹은 그날의 시작 시각을 붙여 보낸다) */
        nextDate: z.iso.datetime(),
        /** 'YYYY-MM-DD'. 반복은 반복 종료 날짜(계속 반복은 2099-12-31), 일회성은 그 날짜 */
        due: z.iso.date(),
    })
    .refine((e) => e.startTime <= e.endTime, {
        message: '시작 시간칸이 끝 시간칸보다 뒤다',
        path: ['endTime'],
    });

/** 합주 잡기 (POST /ensemble) */
export const ensembleCreateBodySchema = ensembleUpdateBodySchema.safeExtend({
    teamId: objectIdSchema,
});

// --- 날적이·공지 ---

/** 날적이 남기기 (POST /note). 앞뒤 공백을 빼고 1 ~ 200자 */
export const noteCreateBodySchema = z.object({
    text: z.string().trim().min(1).max(NOTE_TEXT_MAX),
    pin: newPinSchema,
});

export const checkNotePinBodySchema = z.object({ noteId: objectIdSchema, pin: pinInputSchema });

/** 공지 올리기 (POST /notice). 길이 제한 없음 (limits.ts) */
export const noticeCreateBodySchema = z.object({ content: z.string().trim().min(1) });

export const checkNoticePinBodySchema = z.object({ pin: pinInputSchema });

export type TeamCreateBody = z.infer<typeof teamCreateBodySchema>;
export type TeamUpdateBody = z.infer<typeof teamUpdateBodySchema>;
export type EnsembleCreateBody = z.infer<typeof ensembleCreateBodySchema>;
export type EnsembleUpdateBody = z.infer<typeof ensembleUpdateBodySchema>;
export type NoteCreateBody = z.infer<typeof noteCreateBodySchema>;
