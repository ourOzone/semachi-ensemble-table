// media query 용도로 사용
// 사용법:
// const Container = styled.div`
//   ...
//   ${media.large`
//     ...
//   `}
// `;
//
// 또는 props를 써야 할 때:
// ${media.large((props) => `
//   ...
// `)}
//
// 주의: tagged template으로 쓸 때 템플릿 안에 ${} 보간을 넣으면 값이 사라진다.
// (템플릿 문자열 배열을 그대로 문자열로 바꾸기 때문) 그래서 시그니처상 보간 값을 받지 않는다.
// props가 필요하면 함수 형태로 쓴다.

const sizes = {
    small: 425,
    large: 767,
} as const;

type MediaSize = keyof typeof sizes;

/** media.xxx에 넘길 수 있는 스타일: tagged template 문자열, 또는 props를 받아 CSS 문자열을 만드는 함수 */
type MediaStyles<P> = TemplateStringsArray | string | ((props: P) => string);

/** 스타일을 max-width 미디어 쿼리로 감싸, styled-components 보간 함수로 돌려준다 */
type MediaQuery = <P extends object>(styles: MediaStyles<P>) => (props: P) => string;

const createMediaQuery =
    (maxWidth: number): MediaQuery =>
    (styles) =>
    (props) => `
    @media (max-width: ${maxWidth}px) {
      ${typeof styles === 'function' ? styles(props) : styles}
    }
  `;

export const media: Record<MediaSize, MediaQuery> = {
    small: createMediaQuery(sizes.small),
    large: createMediaQuery(sizes.large),
};
