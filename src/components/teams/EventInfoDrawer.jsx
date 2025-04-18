import { useState } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useDrawerContext } from "context";

const drawerId = 'eventInfo';

const name2FullName = {
    '보소': '보컬 소모임',
    '기소': '기타 소모임',
    '베소': '베이스 소모임',
    '드소': '드럼 소모임',
    '키소': '키보드 소모임',
    '메인 회의': '메인 회의',
    '재학생 회의': '재학생 회의',
    '그냥 회의': '회의',
}

const EventInfoDrawer = ({ name, setAllState }) => {
    const { openDrawer } = useDrawerContext();

    // const handleClick = (value) => {
    //     openDrawer('addTeam2');
    // };

    return (
        <>
            <Drawer drawerId={drawerId} onClose={setAllState} background>
                <Card>
                    <Name>{name2FullName[name]}</Name>
                    <ButtonWrapper>
                        <StyledButton type="primary"><PlusOutlined />일정 추가</StyledButton>
                    </ButtonWrapper>
                </Card>
            </Drawer>
        </>
    );
};

const Card = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: ${({ theme }) => theme.white};
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 1.5rem;
    box-shadow: 0 0.25rem 0 rgba(0, 0, 0, 0.02);
    padding: 1rem;
    margin-bottom: 1rem;
    gap: 3rem;
    ${({ heightFix }) => heightFix ? `height: 27.5rem` : ''};
`;

const ButtonWrapper = styled.div`
    display: flex;
    gap: 1.5rem;
    width: 100%;
    justify-content: center;
`;

const Name = styled.span`
    font-size: 2rem;
    font-family: Bold;
    text-align: center;
    margin-top: 0.5rem;
`;

const StyledButton = styled(Button)`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    border-radius: 1.5rem;
    height: auto;

    & span {
        margin: 1rem 0 !important;
        font-family: Bold;
        font-size: 1.5rem !important;
    }
    & svg {
        font-size: 1.5rem;
    }
`;

export default EventInfoDrawer;