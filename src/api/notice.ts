import type {
    ExistsResponse,
    IdResponse,
    MessageResponse,
    NoticeResponse,
    PinCheckResponse,
} from '@/types';
import { get, post, del } from '.';

export const getNotices = () => get<NoticeResponse[]>('/notices');
export const addNotice = (text: string) =>
    post<IdResponse & MessageResponse>('/notice', { content: text });
export const deleteNotice = (id: string) => del<MessageResponse>(`/notice?id=${id}`);
export const noticeExists = (id: string) => get<ExistsResponse>(`/notice/${id}`);
export const checkNoticePin = (pin: string) => post<PinCheckResponse>('/check-notice-pin', { pin });
