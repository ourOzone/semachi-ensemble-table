import {
    existsResponseSchema,
    noticeResponseSchema,
    pinCheckResponseSchema,
    type IdResponse,
    type MessageResponse,
} from '@/types';
import { get, getList, post, del } from '.';

export const getNotices = () => getList('/notices', noticeResponseSchema);
export const addNotice = (text: string) =>
    post<IdResponse & MessageResponse>('/notice', { content: text });
export const deleteNotice = (id: string) => del<MessageResponse>(`/notice?id=${id}`);
export const noticeExists = async (id: string) =>
    existsResponseSchema.parse(await get(`/notice/${id}`));
export const checkNoticePin = async (pin: string) =>
    pinCheckResponseSchema.parse(await post('/check-notice-pin', { pin }));
