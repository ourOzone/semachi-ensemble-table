// 큰 카드(공지·합주판·한마디)의 모서리 (V-2). 새 코드는 Tailwind의 rounded-card(src/styles/index.css)를 쓰고,
// 옛 styled-components 코드는 이 값을 넣는다. 두 곳의 값을 같게 유지한다. V-6에서 옛 코드와 함께 삭제한다.
export const cardRadius = `
    border-radius: 18px;
    @supports (corner-shape: squircle) {
        border-radius: 28px;
        corner-shape: squircle;
    }
`;
