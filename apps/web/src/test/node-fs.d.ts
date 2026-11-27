// 테스트에서 소스 파일을 직접 읽을 때 쓰는 node:fs의 최소 타입 (src/styles/tokens.test.ts).
// @types/node를 추가하면 src 전체에 Node 전역 타입(setTimeout 반환형 등)이 섞이므로 필요한 함수만 선언한다.
declare module 'node:fs' {
    export function readFileSync(path: URL | string, encoding: 'utf-8'): string;
}
