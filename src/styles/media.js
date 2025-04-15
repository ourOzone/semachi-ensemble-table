// media query 용도로 사용
// 사용법: 
// const Container = styled.div`
//   ...
//   ${media.mobile`
//     ...
//   `}
// `;

const sizes = {
    small: 380,
    large: 560,
  };
  
  export const media = Object.keys(sizes).reduce((acc, label) => {
    acc[label] = (...args) => `
      @media (max-width: ${sizes[label]}px) {
        ${args.join('')}
      }
    `;
    return acc;
  }, {});
  