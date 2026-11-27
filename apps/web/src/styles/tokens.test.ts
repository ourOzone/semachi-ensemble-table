import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { eventColors, teamColors } from '@/constants/colors';

// Vitest는 CSS import를 빈 값으로 처리하므로(test.css 기본값) 파일을 직접 읽는다
const css = readFileSync('src/styles/index.css', 'utf-8'); // 테스트는 프로젝트 루트에서 실행된다

/** index.css의 `--color-<name>-N: 값;` 토큰을 순서대로 읽는다 */
function readTokens(name: string): string[] {
    const tokens = [...css.matchAll(new RegExp(`--color-${name}-(\\d+):\\s*([^;]+);`, 'g'))];
    // 번호 순서대로 들어 있는지도 확인한다 (순서가 바뀌면 팀마다 배정되는 색이 바뀐다)
    expect(tokens.map((m) => Number(m[1]))).toEqual(tokens.map((_, i) => i));
    return tokens.map((m) => m[2]!.trim().toLowerCase());
}

// 팀 색 20종은 서비스의 아이덴티티라 바꾸지 않는다 (docs/archive/VIEW_REDESIGN_PLAN.md 디자인 원칙)
describe('디자인 토큰: 팀 색', () => {
    it('팀 색은 20종이고 constants/colors의 teamColors와 값·순서가 같다', () => {
        expect(teamColors).toHaveLength(20);
        expect(readTokens('team')).toEqual(teamColors.map((c) => c.toLowerCase()));
    });

    it('소모임 색은 constants/colors의 eventColors와 값·순서가 같다', () => {
        expect(readTokens('event')).toEqual(eventColors.map((c) => c.toLowerCase()));
    });
});
