import { useState, useEffect, useMemo } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Input } from "antd";
import { useCustomContext } from "context";
import OkButton from "components/common/OkButton";

const drawerId = 'teamAdd2';

const demoName = [
    "비틀즈",
    "레드제플린",
    "롤링스톤즈",
    "퀸",
    "핑크플로이드",
    "너바나",
    "메탈리카",
    "AC/DC",
    "건즈앤로지스",
    "콜드플레이",
    "라디오헤드",
    "레드핫칠리페퍼스",
    "린킨파크",
    "그린데이",
    "비치보이스",
    "오아시스",
    "고릴라즈",
    "악틱몽키즈",
    "이매진드래곤스",
    "스트록스",
    "아이언메이든",
    "마룬5",
    "뮤즈",
];

const maxInput = 20;

const TeamAddDrawer2 = ({ name, setName }) => {
    const { openDrawer } = useCustomContext();

    const randomDemoName = useMemo(() => {
        const randomIndex = Math.floor(Math.random() * demoName.length);
        return demoName[randomIndex];
    }, []);

    const handleClick = () => {
        openDrawer('teamAdd3');
    };

    const onClose = () => {
        setName('');
    }

    return (
        <Drawer drawerId={drawerId} onClose={onClose}>
            <Title>팀 이름을 지어요</Title>
            <StyledInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={randomDemoName}
                count={{
                    show: true,
                    max: maxInput,
                }}
            />
            <OkButton
                onClick={handleClick}
                disabled={name.length < 1 || name.length > 20}
            />
        </Drawer>
    );
};

const Title = styled.span`
    font-size: 2.5rem;
    font-family: Bold;
`;

const StyledInput = styled(Input)`
    margin: 4rem 0;
    font-size: 3rem;
    font-family: Bold !important;
    color: ${({ theme }) => theme.title};
    border-radius: 1.5rem;

    & * {
        font-family: Regular;
    }

    & .ant-input-show-count-suffix {
        font-size: 1.5rem;
    }
`;

export default TeamAddDrawer2;