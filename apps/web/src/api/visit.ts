import { post } from '.';

/**
 * 웹을 열 때 한 번 "방문"을 남긴다 (백엔드 개편 B-7, 서버 POST /visits → 활동 기록).
 * 이전에는 서버가 GET /teams마다 "페이지 열기"를 남겨, 목록을 다시 불러올 때마다 쌓였다 (O2).
 * 실패해도 화면에는 영향 없음
 */
export const recordVisit = (path: string) => post('/visits', { path }).catch(() => undefined);
