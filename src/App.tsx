import styled from 'styled-components';
import { useDrawerStore } from '@/stores/drawer';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Notice from '@/components/notice';
import Teams from '@/components/teams';
import Board from '@/components/board';
import Note from '@/components/note';
import { media } from '@/styles/media';
import type { DrawerId } from '@/types';

function App() {
    // 데이터는 각 컴포넌트의 query 훅(src/queries)이 마운트될 때 불러온다 (이전에는 여기서 fetchData()를 한 번 호출)
    // 열린 Drawer 스택만 구독한다 (Drawer가 열리고 닫힐 때만 다시 렌더링)
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);

    return (
        <>
            <Header />
            <Container openedDrawers={openedDrawers}>
                <Notice />
                <Teams />
                <Board />
                <Note />
                <Footer />
            </Container>
        </>
    );
}

interface ContainerProps {
    /** Drawer가 하나라도 열려 있으면 본문을 왼쪽으로 민다 */
    openedDrawers: DrawerId[];
}

const Container = styled.div<ContainerProps>`
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1rem 0;

    // Drawer 열 때 트랜지션 (384는 media large 기준인 767의 절반)
    transition: transform 0.3s ease;
    transform: translateX(${({ openedDrawers }) => (openedDrawers.length > 0 ? '-384px' : '0')});
    ${media.large(
        ({ openedDrawers }) => `
		transform: translateX(${openedDrawers.length > 0 ? '-50%' : '0'});
	`,
    )}
`;

export default App;
