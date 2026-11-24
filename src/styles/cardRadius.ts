// 옛 styled-components 코드용 스쿼클 모서리 (V-2). 새 코드는 Tailwind의 squircle 계열 유틸리티(src/styles/index.css)를 쓴다.
// 1) corner-shape 지원 브라우저: corner-shape  2) 사파리 등: SVG 마스크(index.css의 --squircle-mask)  3) 그 외: 일반 둥근 모서리
// 스쿼클은 같은 반지름이면 덜 둥글어 보여 반지름을 따로 받는다. V-6에서 옛 코드와 함께 삭제한다.

// index.css와 같은 조건 (not (A or not B) 꼴인 이유도 index.css 주석 참고)
const FALLBACK = '@supports not ((corner-shape: squircle) or (not (-webkit-mask-box-image: none)))';

/** 테두리 없는 요소 (마스크가 그림자도 자르므로 그림자는 squircleShadow로 감싼 요소에) */
export const squircle = (radius: string, squircleRadius: string) => `
    border-radius: ${radius};
    @supports (corner-shape: squircle) {
        border-radius: ${squircleRadius};
        corner-shape: squircle;
    }
    ${FALLBACK} {
        border-radius: 0;
        -webkit-mask-box-image: var(--squircle-mask) 100 / ${squircleRadius} stretch;
    }
`;

/** 점선 테두리 등 마스크로 따라 그릴 수 없는 요소: corner-shape 지원 브라우저에서만 스쿼클 */
export const squircleNative = (radius: string, squircleRadius: string) => `
    border-radius: ${radius};
    @supports (corner-shape: squircle) {
        border-radius: ${squircleRadius};
        corner-shape: squircle;
    }
`;

/** 실선 테두리 요소: 대체 방식에서는 테두리·바탕을 두 겹의 가상 요소로 그린다 (index.css의 squircle-border와 같은 방식) */
export const squircleBordered = (
    radius: string,
    squircleRadius: string,
    borderWidth: string,
    stroke: string,
    fill: string,
) => `
    border-radius: ${radius};
    @supports (corner-shape: squircle) {
        border-radius: ${squircleRadius};
        corner-shape: squircle;
    }
    ${FALLBACK} {
        position: relative;
        isolation: isolate;
        border-radius: 0;
        border-color: transparent;
        background-color: transparent;
        box-shadow: none; /* 요소 자체의 그림자는 네모로 남으므로 끈다 */
        &::before,
        &::after {
            content: '';
            position: absolute;
            z-index: -1;
            pointer-events: none;
            -webkit-mask-box-image: var(--squircle-mask) 100 / ${squircleRadius} stretch;
        }
        &::before {
            inset: -${borderWidth};
            background-color: ${stroke};
        }
        &::after {
            inset: 0;
            background-color: ${fill};
        }
    }
`;

/** 대체 방식에서 마스크에 잘리는 카드 그림자를 감싼 요소에서 그린다 (index.css의 card-shadow) */
export const squircleShadow = `
    ${FALLBACK} {
        filter: drop-shadow(0 2px 6px rgb(0 0 0 / 0.08));
    }
`;

/** 큰 카드(공지·합주판·한마디). index.css의 rounded-card와 같은 값 */
export const cardRadius = squircle('18px', '28px');
