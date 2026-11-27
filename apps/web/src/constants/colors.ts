// 팀·소모임 색 (V-6에 styles/theme.ts에서 옮김, 값·순서 그대로).
// 팀 색 20종은 서비스의 아이덴티티라 값·개수·순서를 바꾸지 않는다 (CLAUDE.md 디자인 원칙).
// index.css의 --color-team-*·--color-event-* 토큰과 같은 값이어야 한다 (styles/tokens.test.ts가 확인).
// 팀마다 배정되는 색은 lib/board의 buildColorMap이 팀 목록 순서로 정한다.

export const teamColors: readonly string[] = [
    '#f94144', // 빨강
    '#ff6347',
    '#f8961e',
    '#f9844a', // 주황
    '#ff9770',
    '#f9c74f',
    '#f1d041', // 노랑 (원래 #fdd835, 흰 글씨가 보이도록 채도만 조금 낮춤: 사용자 요청, View 개편 V-2)
    '#6ece6e',
    '#43A047', // 초록
    '#43aa8b',
    '#06d6a0',
    '#00bbf9',
    '#279ec6',
    '#1e88e5', // 파랑
    '#1d4e89', // 인디고
    '#5e60ce',
    '#9d4edd', // 보라
    '#7b2cbf',
    '#ff70a6',
    '#ef476f',
];

/** 소모임·회의 등 고정 일정의 색 (constants의 eventIds와 같은 순서) */
export const eventColors: readonly string[] = [
    '#f94144', // 빨강
    '#f9844a', // 주황
    '#f1d041', // 노랑 (팀 색 노랑과 같이 조정)
    '#43a047', // 초록
    '#1e88e5', // 파랑
    '#6a7f9a', // 블루그레이
    '#6a7f9a', // 블루그레이
    '#6a7f9a', // 블루그레이
    '#6a7f9a', // 블루그레이
    '#6a7f9a', // 블루그레이
    '#6a7f9a', // 블루그레이
];

/** 색 매핑에 없는 팀(삭제된 팀 등)의 색: 블루그레이 (이전 theme.blueGray) */
export const defaultTeamColor = '#6A7F9A';
