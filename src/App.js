import { useEffect, Suspense } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import theme from './theme';
import Title from './Components/Title';
import TeamList from './Components/TeamList';
import Board from './Components/Board';
import Notes from './Components/Notes';
import Footer from './Components/Footer';
import Loading from './Components/Loading';
import { useCustomContext } from './Context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
	defaultOptions: {
	  queries: {
		suspense: true,
	  },
	},
  })

function App() {
    const { init } = useCustomContext();

    useEffect(() => {
		init();
    }, []);

	return (
		<ThemeProvider theme={theme}>
			<QueryClientProvider client={queryClient}>
					<Container>
						<Title />
						<TeamList />
						<Board />
						<Suspense>
							<Notes />
						</Suspense>
					</Container>
			</QueryClientProvider>
		</ThemeProvider>
	);
}

const Container = styled.div`
	display: flex;
	flex-direction: column;
	width: 100%;
	align-items: center;
	padding: 0 4% 64px;
	& > * + * {
		margin-top: 32px;
		
		@media (max-width: 560px) {
            margin-top: 16px;
        }
	}
`;

export default App;
