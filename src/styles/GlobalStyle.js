import { createGlobalStyle } from 'styled-components';
import NanumSquareLight from '../assets/fonts/NanumSquareNeo-aLt.ttf';
import NanumSquareRegular from '../assets/fonts/NanumSquareNeo-bRg.ttf';
import NanumSquareBold from '../assets/fonts/NanumSquareNeo-cBd.ttf';
import { media } from 'styles/media';

const GlobalStyle = createGlobalStyle`
    @font-face {
        font-family: 'Light';
        src: local('NanumSquareLight'), local('NanumSquareLight');
        font-style: normal;
        src: url(${NanumSquareLight}) format('truetype');
    }
    @font-face {
        font-family: 'Regular';
        src: local('NanumSquareRegular'), local('NanumSquareRegular');
        font-style: normal;
        src: url(${NanumSquareRegular}) format('truetype');
    }
    @font-face {
        font-family: 'Bold';
        src: local('NanumSquareBold'), local('NanumSquareBold');
        font-style: normal;
        src: url(${NanumSquareBold}) format('truetype');
    }
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-size: 16px;
        font-family: Regular;

        ${media.large`
            font-size: 12px;
        `}
        
        ${media.small`
            font-size: 10px;
        `}
    }

    body {
        background-color: #f5f8ff;
    }
`;

export default GlobalStyle;
