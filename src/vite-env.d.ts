/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // 사용하는 환경변수를 여기에 추가
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}