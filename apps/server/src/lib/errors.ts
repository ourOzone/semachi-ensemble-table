// 오류 응답 한곳 (B-10 A1). 모든 오류가 같은 모양: { error: { code, message, issues? } } (packages/shared의 apiErrorSchema)
// 이전에는 404 본문이 { id: -1 }·{ error: '…' }·false로, 500이 글자·JSON으로 섞여 있었다
import type { ApiErrorCode } from '@semachi/shared';
import type { Response } from 'express';

/** 오류 코드마다 상태 코드와 기본 설명 */
const ERRORS: Record<ApiErrorCode, [status: number, message: string]> = {
    INVALID_REQUEST: [400, '요청 형식이 맞지 않습니다'],
    ADMIN_LOGIN_REQUIRED: [401, '관리자 로그인이 필요합니다'],
    WRONG_PIN: [403, 'PIN이 맞지 않습니다'],
    NOT_FOUND: [404, '대상이 없습니다'],
    TOO_MANY_PIN_ATTEMPTS: [429, 'PIN을 너무 많이 틀렸습니다. 잠시 후 다시 시도해 주세요'],
    INTERNAL_ERROR: [500, '서버에서 처리하지 못했습니다'],
};

export interface ErrorDetail {
    /** 기본 설명 대신 (예: '팀이 없습니다') */
    message?: string;
    /** INVALID_REQUEST: 틀린 칸과 이유 */
    issues?: { path: string; message: string }[];
}

/** 오류 본문 */
export function errorBody(code: ApiErrorCode, { message, issues }: ErrorDetail = {}) {
    return { error: { code, message: message ?? ERRORS[code][1], ...(issues && { issues }) } };
}

/** 오류 응답을 보낸다. 상태 코드는 코드에 따라 정해진다 */
export function sendError(res: Response, code: ApiErrorCode, detail?: ErrorDetail) {
    return res.status(ERRORS[code][0]).json(errorBody(code, detail));
}
