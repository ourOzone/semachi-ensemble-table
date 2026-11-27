// Express 요청에 이 서버가 붙이는 값 (middleware/visitor.ts)
declare global {
    namespace Express {
        interface Request {
            /** 방문자 쿠키(semachi_vid)의 UUID */
            visitorId: string;
        }
    }
}

export {};
