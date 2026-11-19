import { createGlobalStyle } from 'styled-components';
import NanumSquareLight from '@/assets/fonts/NanumSquareNeo-aLt.woff2';
import NanumSquareRegular from '@/assets/fonts/NanumSquareNeo-bRg.woff2';
import NanumSquareBold from '@/assets/fonts/NanumSquareNeo-cBd.woff2';
import { media } from '@/styles/media';

const GlobalStyle = createGlobalStyle`
    @font-face {
        font-family: 'Light';
        font-style: normal;
        src: url(${NanumSquareLight}) format('woff2');
    }
    @font-face {
        font-family: 'Regular';
        font-style: normal;
        src: url(${NanumSquareRegular}) format('woff2');
    }
    @font-face {
        font-family: 'Bold';
        font-style: normal;
        src: url(${NanumSquareBold}) format('woff2');
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


    // message(alert) 커스텀 스타일을 위한 antd 자체 스타일 제거 및 아이콘 사이즈 변경
    .ant-message-notice-content {
        background-color: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
        & svg {
            font-size: 1.5rem;
        }
    }
`;

export default GlobalStyle;
