import axios from 'axios';
import { url } from '@/constants';

const apiClient = axios.create({
    baseURL: url,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// 응답 타입 T는 런타임 검증 없이 호출부가 지정한다. (응답 parse는 3단계에서 Zod 스키마로 적용)

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

export const put = async <T>(endpoint: string, body: object = {}): Promise<T> => {
    try {
        const { data } = await apiClient.put<T>(endpoint, body);
        return data;
    } catch (err) {
        console.error(`PUT ${endpoint} 실패:`, err);
        throw err;
    }
};

export const del = async <T>(endpoint: string): Promise<T> => {
    try {
        const { data } = await apiClient.delete<T>(endpoint);
        return data;
    } catch (err) {
        console.error(`DELETE ${endpoint} 실패:`, err);
        throw err;
    }
};
