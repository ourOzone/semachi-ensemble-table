import { useEffect } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { useCustomContext } from 'context';
import Header from 'components/layout/Header';
import Footer from 'components/layout/Footer';
import Teams from 'components/teams';
import Board from 'components/board';
import Notes from 'components/notes';
import { media } from 'styles/media';

function App() {
    const { openedDrawers, init } = useCustomContext();

    useEffect(() => {
		init();
    }, []);

	return (
		<>
			<Header />
			<Container openedDrawers={openedDrawers}>
				<Teams />
				<Board />
				<Notes />
				<Footer />
			</Container>
		</>
	);
}

const Container = styled.div`
	display: flex;
	flex-direction: column;
	width: 100%;
	align-items: center;
	gap: 1rem;
	padding: 1rem 1rem 0;

	// Drawer 열 때 트랜지션 (384는 media large 기준인 767의 절반)
	transition: transform 0.3s ease;
	transform: translateX(${(props) => (props.openedDrawers.length > 0 ? '-384px' : '0')});
	${media.large((props) => `
		transform: translateX(${props.openedDrawers.length > 0 ? '-50%' : '0'});
	`)}

`;

export default App;
