import {
    existsResponseSchema,
    noticeResponseSchema,
    type IdResponse,
    type MessageResponse,
} from '@/types';
import { get, getList, post, del } from '.';
import { checkPin } from './pin';

// 올리기·삭제는 서버가 마스터 PIN을 확인한다. 틀리면 403 (백엔드 개편 B-6)

export const getNotices = () => getList('/notices', noticeResponseSchema);
export const addNotice = (text: string, pin: string) =>
    post<IdResponse & MessageResponse>('/notice', { content: text, pin });
export const deleteNotice = (id: string, pin: string) =>
    del<MessageResponse>(`/notice?id=${id}`, { pin });
export const noticeExists = async (id: string) =>
    existsResponseSchema.parse(await get(`/notice/${id}`));
export const checkNoticePin = (pin: string) => checkPin('/check-notice-pin', { pin });
