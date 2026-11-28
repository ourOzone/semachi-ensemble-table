import { url } from '@/constants';
import { server } from './server';

/** API 주소 앞부분 (env/.env.test의 /api). 요청 기록은 이것을 뗀 API 경로로 남긴다 ("GET /teams") */
const apiBasePath = new URL(url).pathname.replace(/\/+$/, '');

/** 요청 주소에서 API 경로만 ("https://semachi.net/api/teams?x=1" → "/teams") */
export function apiPath(requestUrl: string): string {
    const { pathname } = new URL(requestUrl);
    return pathname.startsWith(apiBasePath) ? pathname.slice(apiBasePath.length) : pathname;
}

/**
 * 호출한 시점 이후 MSW로 들어온 요청을 "METHOD /path" 형태로 기록한다 (쿼리 문자열·API 주소 앞부분 제외).
 * 리스너는 setup.ts의 afterEach에서 정리한다.
 */
export function recordRequests(): string[] {
    const log: string[] = [];
    server.events.on('request:start', ({ request }) => {
        log.push(`${request.method} ${apiPath(request.url)}`);
    });
    return log;
}

/** 기록된 요청 중 정확히 일치하는 것의 개수 */
export const countOf = (log: string[], request: string) => log.filter((r) => r === request).length;
