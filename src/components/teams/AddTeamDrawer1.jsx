import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Button } from "antd";
import { useDrawerContext } from "context";

const drawerId = 'addTeam1';

const options = [
    { value: '세마치공연(정기/연말)', label: '세마치공연', desc: '정기공연, 연말공연' },
    { value: '교내공연(축제/버스킹)', label: '교내공연', desc: '축제, 버스킹'},
    { value: '외부공연(연합/대외)', label: '외부공연', desc: '연합공연, 대외공연'},
    { value: '기타 등등', label: '기타', desc: '등등'},
];

const AddTeamDrawer1 = ({ setType }) => {
    const { openDrawer } = useDrawerContext();

    const handleClick = (value) => {
        setType(value);
        openDrawer('addTeam2');
    };

    const onClose = () => {
        setType('');
    }

    return (
        <>
            <Drawer drawerId={drawerId} onClose={onClose}>
                <Title>뭔 팀인가요 🤘</Title>
                <GridContainer>
                    {options.map((opt) => (
                        <OptionButton
                            key={opt.value}
                            onClick={() => handleClick(opt.value)}
                        >
                            <Label>{opt.label}</Label>
                            <Desc>{opt.desc}</Desc>
                        </OptionButton>
                    ))}
                </GridContainer>
            </Drawer>
        </>
    );
};

const Title = styled.span`
    font-size: 2.5rem;
    font-family: Bold;
`;

const GridContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    margin-top: 8rem;
    gap: 1.5rem;
`;

const OptionButton = styled(Button)`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 10rem;
    /* background-color: ${({ theme }) => theme.background}; */
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 1.5rem;
    box-shadow: 0 0.25rem 0 rgba(0, 0, 0, 0.02);
`;

const Label = styled.span`
    font-family: Bold;
    font-size: 2rem;
    color: ${({ theme }) => theme.title};
`;

const Desc = styled.span`
    color: ${({ theme }) => theme.darkGray};
    font-size: 1.25rem;
`;

export default AddTeamDrawer1;