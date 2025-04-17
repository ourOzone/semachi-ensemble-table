import axios from 'axios';
import { url } from 'constants';

const apiClient = axios.create({
    baseURL: url,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const get = async (endpoint, params = {}) => {
    try {
        const { data } = await apiClient.get(endpoint, { params });
        return data;
    } catch (err) {
        console.error(`GET ${endpoint} 실패:`, err);
        throw err;
    }
};

export const post = async (endpoint, body = {}) => {
    try {
        const { data } = await apiClient.post(endpoint, body);
        return data;
    } catch (err) {
        console.error(`POST ${endpoint} 실패:`, err);
        throw err;
    }
};

// 밑은 일단 쓸 일 없음 (수정/삭제 api도 모두 get)
export const put = async (endpoint, body = {}) => {
    try {
        const { data } = await apiClient.put(endpoint, body);
        return data;
    } catch (err) {
        console.error(`PUT ${endpoint} 실패:`, err);
        throw err;
    }
};

export const del = async (endpoint) => {
    try {
        const { data } = await apiClient.delete(endpoint);
        return data;
    } catch (err) {
        console.error(`DELETE ${endpoint} 실패:`, err);
        throw err;
    }
};
