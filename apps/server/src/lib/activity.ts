// 활동 기록 남기기 (B-7). 라우트가 "무엇을, 무엇에, 어떤 PIN으로, 결과는"을 넘기면
// 요청에서 방문자 id·IP·기기를 더해 activities 컬렉션에 한 건 쓴다 (models/activity.ts)
// - 기록에 실패해도 사용자 요청은 그대로 진행한다 (운영 로그에 오류만 남김)
// - PIN 값·비밀값은 절대 넣지 않는다: before·after에서도 pin 필드는 빼고 넣는다 (withoutPin)
import type { Request } from 'express';
import type { Logger } from 'pino';
import {
    Activity,
    type ActivityAction,
    type ActivityResult,
    type PinKind,
} from '../models/activity.ts';
import { parseDevice } from './device.ts';

export interface ActivityEntry {
    action: ActivityAction;
    target?: { kind: string; id?: string; name?: string };
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    pin?: PinKind;
    result: ActivityResult;
}

export type RecordActivity = (req: Request, entry: ActivityEntry) => Promise<void>;

/** 요청 없이 서버가 스스로 한 일(정리 작업, B-9)의 기록. 방문자·IP·기기는 없다 */
export type RecordSystemActivity = (entry: ActivityEntry) => Promise<void>;

/** IPv4를 담은 IPv6(::ffff:1.2.3.4)는 IPv4로 (보기 쉽게) */
export const cleanIp = (ip: string | undefined) =>
    ip?.replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i, '$1');

/** 기록할 모양: PIN·버전·_id를 뺀 평범한 객체 */
export function withoutPin(doc: unknown): Record<string, unknown> | undefined {
    if (!doc || typeof doc !== 'object') return undefined;
    const plain = (
        'toObject' in doc && typeof doc.toObject === 'function' ? doc.toObject() : doc
    ) as Record<string, unknown>;
    const { pin: _pin, __v: _v, _id: _objectId, ...rest } = plain;
    return rest;
}

/** 글(날적이·공지)을 대상 이름으로 쓸 때 앞부분만 */
export const preview = (text: unknown, length = 40) =>
    typeof text === 'string'
        ? text.length > length
            ? `${text.slice(0, length)}…`
            : text
        : undefined;

export function createActivityRecorder({
    env,
    logger,
}: {
    env: string;
    logger: Logger;
}): RecordActivity {
    return async (req, entry) => {
        const userAgent = req.get('user-agent');
        try {
            await Activity.create({
                env,
                visitorId: req.visitorId,
                ip: cleanIp(req.ip),
                userAgent,
                device: parseDevice(userAgent),
                ...entry,
            });
        } catch (err) {
            logger.error({ err, action: entry.action }, '활동 기록을 쓰지 못했습니다');
        }
    };
}

/** 정리 작업처럼 요청 없이 하는 일의 기록 (B-9). 실패해도 일은 계속한다 */
export function createSystemActivityRecorder({
    env,
    logger,
}: {
    env: string;
    logger: Logger;
}): RecordSystemActivity {
    return async (entry) => {
        try {
            await Activity.create({ env, ...entry });
        } catch (err) {
            logger.error({ err, action: entry.action }, '활동 기록을 쓰지 못했습니다');
        }
    };
}
