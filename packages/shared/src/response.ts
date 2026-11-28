import { z } from 'zod';

// 서버 목록 응답(GET /teams 등)의 스키마. 서버의 mongoose 모델(apps/server/src/models)을 기준으로 한다.
// 웹의 src/api가 응답을 이 스키마로 검증한다 (목록은 항목 단위: api/index.ts의 getList). 모르는 필드(__v 등)는 버린다.
// 서버 테스트도 목록 응답이 이 스키마에 맞는지 본다 (웹과 서버가 같은 모양을 약속).
// 날짜 필드는 JSON 직렬화된 ISO 8601 문자열로 온다.
// (B-8에서 웹 src/types/response.ts를 옮겨 왔다)

export const teamResponseSchema = z.object({
    _id: z.string(),
    name: z.string(),
    type: z.string(),
    /** [보컬, 기타, 베이스, 드럼, 키보드, 매니저, 셋리스트] */
    desc: z.array(z.string()),
    publishDate: z.string().optional(),
    /** 팀 자동 삭제 날짜 (그날 UTC 0시의 ISO, B-9). 옛 팀은 없다 = 계속 유지 */
    due: z.string().optional(),
    // PIN은 서버가 목록에 넣지 않는다 (B-6 B3). 와도 버린다
});

export const ensembleResponseSchema = z
    .object({
        _id: z.string(),
        teamId: z.string(),
        /** 그 팀의 이름. 서버가 채운다 (B-8 D3) */
        teamName: z.string(),
        /** 월요일 0 ~ 일요일 6. 서버가 nextDate의 한국 요일로 채운다 (B-8 D3) */
        day: z.number().int().min(0).max(6),
        /** 시작 시간칸 인덱스 (idx2hour 기준, 30분 단위, 0 ~ 29) */
        startTime: z.number().int().min(0).max(29),
        /** 마지막 시간칸 인덱스 (0 ~ 29). 실제 종료 시각은 idx2hour[endTime + 1] */
        endTime: z.number().int().min(0).max(29),
        repeat: z.boolean(),
        nextDate: z.string(),
        due: z.string(),
        // type('무기한'·'일회성')은 없앴다 (B-8 D3: repeat·due로 나타냄). 옛 데이터에 남아 있어도 버린다
    })
    // 범위 밖·시작 > 끝인 합주는 항목 단위 검증(getList)에서 제외된다 (3-10). 합주표(7 x 30) 배열 접근이 이 범위를 전제로 한다.
    // 이전에는 시작 > 끝이면 칸이 만들어지지 않아 보이지 않았고, 범위 밖이면 합주표를 만들다 TypeError가 났다
    .refine((e) => e.startTime <= e.endTime, { message: 'startTime이 endTime보다 크다' });

export const noteResponseSchema = z.object({
    _id: z.string(),
    text: z.string(),
    // PIN은 서버가 목록에 넣지 않는다 (B-6 B3). 와도 버린다
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

// 변경 요청(POST/PUT/DELETE)의 응답. 현재 호출부에서 쓰지 않으므로 스키마 없이 타입만 둔다.

/** 생성·수정·삭제된 문서의 id */
export interface IdResponse {
    id: string;
}

export interface MessageResponse {
    message: string;
}

/** check-xxx-pin 응답. PIN이 맞으면 true */
export const pinCheckResponseSchema = z.boolean();
export type PinCheckResponse = z.infer<typeof pinCheckResponseSchema>;

/** xxx/:id 존재 확인 응답. 존재하면 true, 없으면 404 에러로 거부된다 */
export const existsResponseSchema = z.boolean();
export type ExistsResponse = z.infer<typeof existsResponseSchema>;
