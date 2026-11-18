import { setupServer } from 'msw/node';

// 테스트용 API 모킹 서버. 기본 핸들러 없이 시작하고, 각 테스트에서 server.use(...)로 응답을 정의한다.
export const server = setupServer();
