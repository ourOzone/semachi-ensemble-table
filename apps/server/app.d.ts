// app.js(아직 JavaScript)를 TypeScript 테스트에서 가져다 쓰기 위한 타입 선언. B-3에서 app.ts가 되면 지운다
import type { RequestListener } from 'node:http';

declare const app: RequestListener;
export = app;
