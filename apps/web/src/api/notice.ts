import { noticeResponseSchema, type IdResponse } from '@/types';
import { del, exists, getList, post } from '.';
import { checkPin } from './pin';

// 올리기·삭제는 서버가 마스터 PIN을 확인한다. 틀리면 403 (백엔드 개편 B-6)
// 주소는 /notices/:id, 올리기 201·삭제 204 (B-10)

export const getNotices = () => getList('/notices', noticeResponseSchema);
export const addNotice = (text: string, pin: string) =>
    post<IdResponse>('/notices', { content: text, pin });
export const deleteNotice = (id: string, pin: string) => del<void>(`/notices/${id}`, { pin });
export const noticeExists = (id: string) => exists(`/notices/${id}`);
export const checkNoticePin = (pin: string) => checkPin('/notices/check-pin', { pin });
