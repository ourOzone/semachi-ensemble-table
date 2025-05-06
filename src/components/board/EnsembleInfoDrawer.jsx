import { useCallback } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Button, Divider, Segmented } from "antd";
import { PlusOutlined, PauseOutlined, EditOutlined, InfoCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTeamContext, useEnsembleContext, useDrawerContext } from "context";
import { idx2hour } from "constants";
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

const EnsembleInfoDrawer = ({ drawerId, handleTeamInfoClick, handleSkip }) => {
    const { id: teamId, name } = useTeamContext();
    const { id, repeat, nextDate, startTime, endTime, setStartTime, setEndTime, setEnsembleOrgStates } = useEnsembleContext();
    const { openDrawer } = useDrawerContext();

    const handleUpdateEnsemble = useCallback((repeat, nextDate, startTime, endTime) => {
        // team 수정시 수정하다 뒤로가기 했을 때 state가 바뀌지 않도록 하기 위함
        setEnsembleOrgStates(repeat, nextDate, startTime, endTime);

        // 이 2개는 null 상태가 아니면 이미 선택 돼있음 (repeat과 nextDate는 값이 있어도 선택 안 돼있음)
        setStartTime(null);
        setEndTime(null);
        
        openDrawer('updateEnsemble1');
    }, [setEnsembleOrgStates, openDrawer]);

    return (
        <Drawer drawerId={drawerId} background>
            <Card>
                <Name>{name}</Name>
                <ButtonWrapper>
                    <StyledButton type="primary" onClick={() => handleTeamInfoClick(teamId)}>
                        <InfoCircleOutlined />팀 정보 보기
                    </StyledButton>
                </ButtonWrapper>
                <ButtonWrapper>
                    <StyledButton onClick={() => handleSkip(id)}><PauseOutlined />이번주 안 해요</StyledButton>
                </ButtonWrapper>
                <ButtonWrapper>
                    <StyledButton onClick={() => handleUpdateEnsemble(repeat, nextDate, startTime, endTime)}><EditOutlined />합주 수정</StyledButton>
                    <StyledButton danger onClick={() => openDrawer('deleteEnsemble')}><DeleteOutlined />합주 삭제</StyledButton>
                </ButtonWrapper>
            </Card>
            <Card>
                <NextEnsemble>
                    <NextEnsembleLabel>다음 합주</NextEnsembleLabel>
                    <TimeWrapper>
                        <Time>{nextDate?.format('YYYY-MM-DD')} ({nextDate?.format('dd')})</Time>
                        <Time>{idx2hour[startTime]} - {idx2hour[endTime + 1]}</Time>
                        <Repeat>{repeat ? '매주 이 시간에 반복' : '이거 한 번만 하고 삭제'}</Repeat>
                    </TimeWrapper>
                </NextEnsemble>
            </Card>
        </Drawer>
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
`;

const ButtonWrapper = styled.div`
    display: flex;
    gap: 0.5rem;
    width: 100%;
    justify-content: center;
`;

const Name = styled.span`
    font-size: 2rem;
    font-family: Bold;
    text-align: center;
    margin: 0.5rem 0 1rem;
`;

const NextEnsemble = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
`;

const NextEnsembleLabel = styled.span`
    font-size: 1.5rem;
    font-family: Bold;
    background-color: ${({ theme }) => theme.primary};
    border-radius: 1rem;
    padding: 0.75rem 1rem;
    color: white;
    text-align: center;
    box-shadow: 0 0.25rem 0.125rem ${({ theme }) => theme.black}33;
`;

const TimeWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
`;

const Time = styled.span`
    font-size: 1.5rem;
    color: ${({ theme }) => theme.black};
`;

const Repeat = styled(Time)`
    color: ${({ theme }) => theme.darkGray};
    font-size: 1.25rem;
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

export default EnsembleInfoDrawer;