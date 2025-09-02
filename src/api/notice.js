import { get, post, del } from '.';

export const getNotices = () => get('/notices');
export const addNotice = (text) => post('/notice', { title: 'title', content: text });
export const deleteNotice = (id) => del(`/notice?id=${id}`);
export const noticeExists = (id) => get(`/notice/${id}`);
export const checkNoticePin = (pin) => post('/check-notice-pin', { pin });