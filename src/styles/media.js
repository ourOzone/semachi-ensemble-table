// media query 용도로 사용
// 사용법: 
// const Container = styled.div`
//   ...
//   ${media.large`
//     ...
//   `}
// `;

// 또는 props를 써야 할 때:
// ${media.large((props) => `
//   ...
// `)}

const sizes = {
    small: 425,
    large: 767,
  };
  
// export const media = Object.keys(sizes).reduce((acc, label) => {
//   acc[label] = (...args) => `
//     @media (max-width: ${sizes[label]}px) {
//       ${args.join('')}
//     }
//   `;
//   return acc;
// }, {});

export const media = Object.keys(sizes).reduce((acc, label) => {
  acc[label] = (styles) => (props) => `
    @media (max-width: ${sizes[label]}px) {
      ${typeof styles === 'function' ? styles(props) : styles}
    }
  `;
  return acc;
}, {});
