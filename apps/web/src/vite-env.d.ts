/// <reference types="vite/client" />

// env/.env 에 정의한 환경변수 타입. 변수를 추가하면 여기에도 추가한다.
interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    /** 어느 서버용 빌드인지 (production·beta, 백엔드 개편 B-11). 베타면 헤더에 "베타" 표시. 없으면 운영으로 본다 */
    readonly VITE_APP_ENV?: string;
}
