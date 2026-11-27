import axios from 'axios';
import { z } from 'zod';
import { get, post, postWithHeaders, put } from '.';
import { parsePinAttempts, type PinCheckResult } from './pin';

// 관리자 API (백엔드 개편 B-7, 서버 routes/admin.ts). 관리자 화면(/admin)만 쓴다
// 로그인은 마스터 PIN → 서버가 관리자 쿠키(12시간)를 준다. 그 뒤 요청은 쿠키로 (axios withCredentials)

/** 활동 기록 한 건 (서버 models/activity.ts) */
export const activitySchema = z.object({
    _id: z.string(),
    at: z.string(),
    env: z.string().optional(),
    visitorId: z.string().optional(),
    ip: z.string().optional(),
    userAgent: z.string().optional(),
    device: z
        .object({
            kind: z.string().optional(),
            os: z.string().optional(),
            browser: z.string().optional(),
            model: z.string().optional(),
        })
        .optional(),
    action: z.string(),
    target: z
        .object({
            kind: z.string().optional(),
            id: z.string().optional(),
            name: z.string().optional(),
        })
        .optional(),
    before: z.record(z.string(), z.unknown()).optional(),
    after: z.record(z.string(), z.unknown()).optional(),
    pin: z.string().optional(),
    result: z.string(),
});
export type Activity = z.infer<typeof activitySchema>;

const visitorSchema = z.object({
    visitorId: z.string(),
    firstSeen: z.string(),
    lastSeen: z.string(),
    count: z.number(),
    ips: z.array(z.string()),
    devices: z.array(
        z.object({
            userAgent: z.string().nullish(),
            device: activitySchema.shape.device.nullish(),
            count: z.number(),
        }),
    ),
    related: z.array(
        z.object({
            visitorId: z.string().nullish(),
            lastSeen: z.string(),
            count: z.number(),
            sharedIps: z.array(z.string()),
            sameDevice: z.boolean(),
        }),
    ),
    activities: z.array(activitySchema),
});
export type VisitorDetail = z.infer<typeof visitorSchema>;

const overviewSchema = z.object({
    visitors24h: z.number(),
    pinFailures: z.array(
        z.object({
            visitorId: z.string().nullish(),
            count: z.number(),
            blocked: z.number(),
            lastAt: z.string(),
            ips: z.array(z.string().nullish()),
        }),
    ),
    masterUses: z.array(activitySchema),
    masterPinSource: z.enum(['db', 'env']),
});
export type Overview = z.infer<typeof overviewSchema>;

export interface ActivityFilter {
    visitorId?: string;
    ip?: string;
    /** 동작 앞부분 (team·ensemble·note·notice·pin·admin·visit) */
    action?: string;
    result?: string;
    /** 이 시각보다 이전 것만 (더 보기) */
    before?: string;
    limit?: number;
}

export const getAdminSession = async () =>
    z.object({ admin: z.boolean() }).parse(await get('/admin/session')).admin;

/** 마스터 PIN으로 로그인. 틀리면 { ok: false, attempts }, 너무 많이 틀려 막히면 오류(429)를 그대로 던진다 */
export async function adminLogin(pin: string): Promise<PinCheckResult> {
    try {
        await postWithHeaders('/admin/login', { pin });
        return { ok: true };
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
            return { ok: false, attempts: parsePinAttempts(err.response.headers['pin-attempts']) };
        }
        throw err;
    }
}

export const adminLogout = () => post('/admin/logout');

export async function getActivities(filter: ActivityFilter) {
    const params = Object.fromEntries(Object.entries(filter).filter(([, value]) => value));
    const data = await get<unknown>('/admin/activities', params);
    return z.object({ activities: z.array(activitySchema) }).parse(data).activities;
}

export const getVisitor = async (visitorId: string) =>
    visitorSchema.parse(await get(`/admin/visitors/${encodeURIComponent(visitorId)}`));

export const getOverview = async () => overviewSchema.parse(await get('/admin/overview'));

/** 마스터 PIN 바꾸기 (로그인한 뒤에도 지금 마스터 PIN을 한 번 더) */
export const changeMasterPin = (currentPin: string, newPin: string) =>
    put('/admin/master-pin', { currentPin, newPin });
