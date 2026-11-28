import axios from 'axios';
import { z } from 'zod';
import { url } from '@/constants';

const apiClient = axios.create({
    baseURL: url,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// get/post/put/del의 응답 타입 T는 런타임 검증 없이 호출부가 지정한다.
// 화면에서 쓰는 응답은 리소스별 함수(team.ts 등)가 Zod 스키마로 검증한다: 목록은 getList, 단일 값은 schema.parse

// 서버 주소는 복수형 + 주소 안의 id (/teams/:id). 오류 본문은 { error: { code, message } } (백엔드 개편 B-10).
// 웹은 오류 본문을 읽지 않고 상태 코드(404·403·429)와 헤더만 본다

/** 서버가 404로 응답한 요청 에러인지. 대상이 이미 삭제된 경우를 판별한다 (서버의 조회·수정·삭제·PIN 확인 API는 대상이 없으면 404) */
export const isNotFound = (err: unknown): boolean =>
    axios.isAxiosError(err) && err.response?.status === 404;

export const get = async <T>(
    endpoint: string,
    params: Record<string, unknown> = {},
): Promise<T> => {
    try {
        const { data } = await apiClient.get<T>(endpoint, { params });
        return data;
    } catch (err) {
        console.error(`GET ${endpoint} 실패:`, err);
        throw err;
    }
};

export const post = async <T>(endpoint: string, body: object = {}): Promise<T> => {
    try {
        const { data } = await apiClient.post<T>(endpoint, body);
        return data;
    } catch (err) {
        console.error(`POST ${endpoint} 실패:`, err);
        throw err;
    }
};

/** POST인데 응답 헤더도 필요할 때 (PIN 확인의 틀린 횟수: api/pin.ts) */
export const postWithHeaders = async <T>(endpoint: string, body: object = {}) => {
    try {
        const { data, headers } = await apiClient.post<T>(endpoint, body);
        return { data, headers };
    } catch (err) {
        console.error(`POST ${endpoint} 실패:`, err);
        throw err;
    }
};

export const put = async <T>(endpoint: string, body: object = {}): Promise<T> => {
    try {
        const { data } = await apiClient.put<T>(endpoint, body);
        return data;
    } catch (err) {
        console.error(`PUT ${endpoint} 실패:`, err);
        throw err;
    }
};

/** body: 서버가 확인할 PIN 등 (백엔드 개편 B-6: 삭제도 본문에 pin을 담는다) */
export const del = async <T>(endpoint: string, body?: object): Promise<T> => {
    try {
        const { data } = await apiClient.delete<T>(endpoint, { data: body });
        return data;
    } catch (err) {
        console.error(`DELETE ${endpoint} 실패:`, err);
        throw err;
    }
};

/** 대상이 아직 있는지 (GET /teams/:id 등이 200이면 true, 없으면 404로 reject). 받은 내용은 쓰지 않는다 (B-10: 이전엔 true를 주는 확인 전용 API) */
export const exists = async (endpoint: string): Promise<true> => {
    await get<unknown>(endpoint);
    return true;
};

/**
 * 목록 응답을 받아 항목 단위로 검증한다 (3단계 결정 4 수정: 2026-11-20).
 * - 응답이 배열이 아니면 에러 (조회 실패)
 * - 형식이 맞지 않는 항목은 빼고 콘솔에 경고한다. 오래된 데이터 한 건 때문에 목록 전체가 안 보이지 않도록 하기 위함
 *   (예: 실제 서버에 endTime이 null인 합주가 있다. 검증 전에도 칸이 만들어지지 않아 화면에 보이지 않던 데이터)
 * 경고에는 값 없이 위치·이유만 남긴다 (응답에 PIN이 들어 있을 수 있음: ISSUES B3)
 */
export const getList = async <S extends z.ZodType>(
    endpoint: string,
    itemSchema: S,
): Promise<z.output<S>[]> => {
    const list = z.array(z.unknown()).parse(await get<unknown>(endpoint));
    const valid: z.output<S>[] = [];
    list.forEach((item, idx) => {
        const result = itemSchema.safeParse(item);
        if (result.success) {
            valid.push(result.data);
        } else {
            const reasons = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
            console.warn(
                `GET ${endpoint}: ${idx}번째 항목이 형식에 맞지 않아 제외했어요.`,
                reasons,
            );
        }
    });
    return valid;
};
