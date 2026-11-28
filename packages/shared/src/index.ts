// 웹(apps/web)과 서버(apps/server)가 함께 쓰는 것 (백엔드 개편 B-8): 입력 길이 제한, 요청·응답 Zod 스키마, 타입.
// 가져오는 쪽: import { teamResponseSchema } from '@semachi/shared'
export * from './limits.ts';
export * from './request.ts';
export * from './response.ts';
