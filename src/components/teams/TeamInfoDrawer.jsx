import { useState, useCallback } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Button, Divider, Segmented } from "antd";
import { PlusOutlined, PauseOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useDrawerContext } from "context";

const drawerId = 'teamInfo';

const memberLabels = ['보컬', '기타', '베이스', '드럼', '키보드', '매니저'];

const TeamInfoDrawer = ({ id, type, name, desc, setAllState }) => {
    const { openDrawer } = useDrawerContext();
    const [option, setOption] = useState('팀원');

    const onClose = useCallback(() => {
        setOption('팀원');
        setAllState();
    }, [setAllState]);

    return (
        <>
            <Drawer drawerId={drawerId} onClose={onClose} background>
                <Card>
                    <Name>{name}</Name>
                    <Type>{type}</Type>
                    <ButtonWrapper>
                        <StyledButton type="primary"><PlusOutlined />합주 추가</StyledButton>
                    </ButtonWrapper>
                    <ButtonWrapper>
                        <StyledButton><PauseOutlined />이번주 안 해요</StyledButton>
                    </ButtonWrapper>
                    <ButtonWrapper>
                        <StyledButton onClick={() => openDrawer('updateTeam1')}><EditOutlined />팀 수정</StyledButton>
                        <StyledButton danger onClick={() => openDrawer('deleteTeam')}><DeleteOutlined />팀 삭제</StyledButton>
                    </ButtonWrapper>
                </Card>
                <Card fixHeight>
                    <StyledSegmented
                        block
                        options={['팀원', '셋리']}
                        onChange={(opt) => setOption(opt)}
                    />
                    {option === '팀원' ? (
                        <MemberWrapper>
                            {memberLabels.map((label, idx) => (
                            <>
                                <Member>
                                    <MemberLabel idx={idx}>{label}</MemberLabel>
                                    <MemberName>{desc[idx]}</MemberName>
                                </Member>
                                {idx < memberLabels.length - 1 && <StyledDivider />}
                            </>
                            ))}
                        </MemberWrapper>
                    ) : (
                        <Desc>{desc[6]}</Desc>
                    )}
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
    gap: 0.5rem;
    ${({ fixHeight }) => fixHeight ? `height: 27.5rem` : ''};
`;

const ButtonWrapper = styled.div`
    display: flex;
    gap: 1.5rem;
    width: 100%;
    justify-content: center;
`;

const MemberWrapper = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0.5rem;
`;

const Name = styled.span`
    font-size: 2rem;
    font-family: Bold;
    text-align: center;
    margin-top: 0.5rem;
`;

const Type = styled.span`
    color: ${({ theme }) => theme.darkGray};
    font-size: 1.25rem;
    margin-bottom: 1rem;
`;

const Member = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
`;

const MemberLabel = styled.span`
    font-size: 1.5rem;
    font-family: Bold;
    min-width: 6rem;
    background-color: ${({ theme, idx }) => theme.eventColors[idx]};
    border-radius: 1rem;
    padding: 0.375rem;
    color: white;
    text-align: center;
    box-shadow: 0 0.25rem 0.125rem ${({ theme, idx }) => theme.eventColors[idx]}33;
`;

const MemberName = styled.span`
    font-size: 1.5rem;
    color: ${({ theme }) => theme.black};
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

const StyledSegmented = styled(Segmented)`
    width: 100%;
    border-radius: 1rem;
    padding: 0.375rem;
    & * {
        border-radius: 1rem !important;
    }
    & .ant-segmented-item-label {
        padding: 0.5rem;
        font-size: 1.5rem;
        font-family: Bold;
    }
`;

const StyledDivider = styled(Divider)`
    margin: 0.5rem 0;
`;

const Desc = styled.div`
    font-size: 1.25rem;
    white-space: pre-wrap; // 개행
    padding: 1.25rem;
    overflow: scroll;
    width: 100%;
    height: 100%;
    background-color: ${({ theme }) => theme.antGray};
    border-radius: 1rem;
    line-height: 1.5;
`;

export default TeamInfoDrawer;