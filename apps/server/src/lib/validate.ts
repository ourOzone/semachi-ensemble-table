// 요청 검사 (백엔드 개편 B-8 S5): 본문·주소 값을 packages/shared의 Zod 스키마로 검사한다.
// 맞으면 검사·정리된 값(앞뒤 공백 뺌, 모르는 필드 버림)을 돌려주고, 아니면 400을 보내고 null.
// 핸들러 안에서 부른다: const body = validate(res, teamCreateBodySchema, req.body); if (!body) return;
// (미들웨어로 만들지 않은 이유: 검사한 값의 타입이 핸들러 안에서 그대로 이어지게)
import type { Response } from 'express';
import type { z } from 'zod';

/**
 * 400 응답 본문. 어느 칸이 왜 틀렸는지(path·message)만 담는다. 받은 값은 담지 않는다 (PIN이 있을 수 있음).
 * 형식은 B-10(응답 형식 통일)에서 다시 정한다 (지금은 다른 오류와 같은 { error: '…' } 모양)
 */
export function invalidRequest(error: z.ZodError) {
    return {
        error: 'Invalid request',
        issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
        })),
    };
}

export function validate<T extends z.ZodType>(
    res: Response,
    schema: T,
    value: unknown,
): z.output<T> | null {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    res.status(400).json(invalidRequest(result.error));
    return null;
}
