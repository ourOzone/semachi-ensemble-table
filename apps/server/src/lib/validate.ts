// 요청 검사 (백엔드 개편 B-8 S5): 본문·주소 값을 packages/shared의 Zod 스키마로 검사한다.
// 맞으면 검사·정리된 값(앞뒤 공백 뺌, 모르는 필드 버림)을 돌려주고, 아니면 400을 보내고 null.
// 핸들러 안에서 부른다: const body = validate(res, teamCreateBodySchema, req.body); if (!body) return;
// (미들웨어로 만들지 않은 이유: 검사한 값의 타입이 핸들러 안에서 그대로 이어지게)
// 400 본문: { error: { code: 'INVALID_REQUEST', message, issues: [{ path, message }] } } (B-10). 받은 값은 담지 않는다 (PIN이 있을 수 있음)
import type { Response } from 'express';
import type { z } from 'zod';
import { sendError } from './errors.ts';

const issuesOf = (error: z.ZodError) =>
    error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));

export function validate<T extends z.ZodType>(
    res: Response,
    schema: T,
    value: unknown,
): z.output<T> | null {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    sendError(res, 'INVALID_REQUEST', { issues: issuesOf(result.error) });
    return null;
}

/** 스키마 밖에서 검사한 칸이 틀렸을 때 (예: 팀 자동 삭제 날짜가 이미 지남, B-9) */
export function sendInvalid(res: Response, path: string, message: string) {
    return sendError(res, 'INVALID_REQUEST', { issues: [{ path, message }] });
}
