// 옛 styled-components 코드용 스쿼클 모서리 (V-2). 새 코드는 Tailwind의 squircle·rounded-card(src/styles/index.css)를 쓴다.
// corner-shape를 지원하는 브라우저(Chrome·안드로이드)에서만 스쿼클로, 아니면 일반 둥근 모서리.
// 스쿼클은 같은 반지름이면 덜 둥글어 보여 반지름을 따로 받는다. V-6에서 옛 코드와 함께 삭제한다.
export const squircle = (radius: string, squircleRadius: string) => `
    border-radius: ${radius};
    @supports (corner-shape: squircle) {
        border-radius: ${squircleRadius};
        corner-shape: squircle;
    }
`;

/** 큰 카드(공지·합주판·한마디). index.css의 rounded-card와 같은 값 */
export const cardRadius = squircle('18px', '28px');
