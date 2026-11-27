/// <reference types="vite/client" />

// env/.env 에 정의한 환경변수 타입. 변수를 추가하면 여기에도 추가한다.
interface ImportMetaEnv {
    readonly VITE_API_URL: string;
}
