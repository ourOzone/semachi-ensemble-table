// 푸터 (V-3 1차에 새 코드로, 이전: styled-components)
// 활동 기록 알림 (백엔드 개편 B-7): 사람을 짐작할 수 있는 정보(접속 정보)를 모으므로 숨기지 않고 알린다 (계획 문서 권장)
const Footer = () => (
    <footer className="ui mt-6 mb-14 flex flex-col items-center gap-1 px-4 text-center text-[13px] text-neutral-500">
        <span className="select-none">32기 G.이승우 37기 B.고민재</span>
        <span className="text-[12px] break-keep text-neutral-400">
            운영을 위해 활동 기록(접속 정보 포함)을 1년 보관하고, 관리자만 열람해요.
        </span>
    </footer>
);

export default Footer;
