import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// 스쿼클 대체 방식(사파리용 SVG 마스크)의 @supports 조건 (V-2).
// `(not (corner-shape: squircle)) and (-webkit-mask-box-image: none)` 꼴로 쓰면 빌드의 CSS 최적화(lightningcss)가
// 접두사를 떼어 `(mask-box-image: none)`으로 바꾸고, 사파리는 접두사 이름만 알아 조건이 거짓이 된다.
// 개발 서버에서는 멀쩡해 보이므로 테스트로 막는다. 같은 뜻의 `not ((A) or (not (B)))` 꼴은 그대로 남는다.

// 테스트는 프로젝트 루트에서 실행된다 (Vitest는 CSS import를 빈 값으로 처리해 파일을 직접 읽는다)
const files = {
    'index.css': readFileSync('src/styles/index.css', 'utf-8'),
    'cardRadius.ts': readFileSync('src/styles/cardRadius.ts', 'utf-8'),
};

const SAFE = '@supports not ((corner-shape: squircle) or (not (-webkit-mask-box-image: none)))';

describe('스쿼클 대체 방식의 @supports 조건', () => {
    it.each(Object.entries(files))(
        '%s: 빌드 최적화에 접두사가 지워지지 않는 꼴만 쓴다',
        (_, text) => {
            expect(text).toContain(SAFE);
            expect(text).not.toMatch(/\)\s*and\s*\(\s*-webkit-mask-box-image/);
        },
    );
});
