import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Notice from '@/components/notice';
import Schedule from '@/components/schedule';
import Note from '@/components/note';
import SettingsDrawer from '@/components/settings/SettingsDrawer';
import ToolbarTint from '@/components/layout/ToolbarTint';

// 화면 배치: 헤더 → 공지 → 합주판(팀 목록 포함) → 날적이 → 푸터.
// 데이터는 각 컴포넌트의 query 훅(src/queries)이 마운트될 때 불러온다.
// 본문 간격은 옛 styled-components(rem, 옛 전역 스타일이 html 글자 크기를 화면 폭에 따라 16·12·10px로 바꿨다)와 같은 값 (V-6)
function App() {
    return (
        <>
            <Header />
            <main className="flex w-full flex-col items-center gap-2.5 px-2.5 pt-2.5 min-[426px]:gap-3 min-[426px]:px-3 min-[426px]:pt-3 md:gap-4 md:px-4 md:pt-4">
                <Notice />
                <Schedule />
                <Note />
                <Footer />
            </main>
            <SettingsDrawer />
            {/* 아이폰 사파리 아래 도구 막대를 Drawer 바탕색으로 (Drawer가 열려 있는 동안) */}
            <ToolbarTint />
        </>
    );
}

export default App;
