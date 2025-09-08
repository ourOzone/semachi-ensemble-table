import { useEffect, useCallback } from "react";
import Drawer from "components/common/Drawer";
import styled from "styled-components";
import { Button, Divider, Segmented } from "antd";
import { PlusOutlined, PauseOutlined, EditOutlined, InfoCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTeamContext, useEnsembleContext, useDrawerContext } from "context";
import { idx2hour, eventIds } from "constants";
import useMessage from 'hooks/useMessage';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

const EnsembleInfoDrawer = ({ drawerId, checkEnsembleExists, handleClickTeamInfo, handleUpdateEnsemble }) => {
    const { id: teamId, name, setTeamStates } = useTeamContext();
    const {
        id,
        repeat,
        nextDate,
        setNextDate,
        startTime,
        endTime,
        setStartTime,
        setEndTime,
        setEnsembleStates,
        setEnsembleOrgStates 
    } = useEnsembleContext();
    const { openDrawer } = useDrawerContext();
    const [message, contextHolder] = useMessage();

    useEffect(() => {
        // 반복 합주인 경우
        if (repeat) {
            // nextDate가 오늘보다 이전인 경우 (특별한 업데이트가 없었을 경우)
            if (dayjs(nextDate).startOf('day').isBefore(dayjs().startOf('day'))) {
                // 가장 가까운 같은 요일로 변경
                setNextDate(dayjs().startOf('day').add((7 + dayjs(nextDate).day() - dayjs().day()) % 7, 'day').startOf('day'));
            }
            // // 합주 당일인데 시간만 지났을 경우
            // if (dayjs(`${dayjs().format("YYYY-MM-DD")} ${idx2hour[endTime]}`).add(30, "minute").isBefore(dayjs())) {
            //     // 다음주 같은 요일로 변경
            //     setNextDate(dayjs().startOf('day').add((7 + dayjs(nextDate).day() - dayjs().day()) % 7, 'day').startOf('day'));
            // }
        }
        
        // endTime이 현재 시간보다 이전인 겨
        
        // nextDate가 오늘보다 이후이거나 일회성 합주인 경우는 그대로 둠
        
    }, [id, repeat, nextDate]);

    const onClose = useCallback(() => {
        setTeamStates();
        setEnsembleStates();
    }, [setTeamStates, setEnsembleStates]);

    // repeat false거나 오늘보다 7일 이후라면 (오늘이 수요일이라면 다음주 수요일부터) 다음 번에 안해요 버튼을 disabled
    const isDisabled = useCallback((repeat, nextDate) => {
        return !repeat || dayjs(nextDate).isAfter(dayjs().startOf('day').add(6, 'day').endOf('day'))
    }, []);

    // 다음 번에 안 해요 클릭 시 nextDate를 7일 뒤로 변경하고 바로 렌더링
    const handleClickSkip = useCallback(async (id, teamId, repeat, nextDate, startTime, endTime) => {
        try {
            if (await checkEnsembleExists(id)) {
                handleUpdateEnsemble(id, teamId, repeat, dayjs(nextDate).add(7, 'day'), startTime, endTime);
                setNextDate((prev) => dayjs(prev).add(7, 'day'));
            }
        } catch {
            message.error('인터넷이 안 좋거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.');
        }
    }, []);

    const handleClickUpdate = useCallback(async (id, repeat, nextDate, startTime, endTime) => {
        try {
            if (await checkEnsembleExists(id)) {
                // team 수정시 수정하다 뒤로가기 했을 때 state가 바뀌지 않도록 하기 위함
                setEnsembleOrgStates(repeat, nextDate, startTime, endTime);

                setStartTime(null);
                setEndTime(null);
                
                openDrawer('updateEnsemble1');
            }
        } catch {
            message.error('인터넷이 안 좋거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.');
        }
    }, [setEnsembleOrgStates, openDrawer]);

    const handleClickDelete = useCallback(async (id) => {
        try {
            if (await checkEnsembleExists(id)) {
                openDrawer('deleteEnsemble');
            }
        } catch {
            message.error('인터넷이 안 좋거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.');
        }
    }, []);

    return (
        <Drawer drawerId={drawerId} onClose={onClose} background>
            {contextHolder}
            <Card>
                <Name>{name}</Name>
                <ButtonWrapper>
                    {!eventIds.includes(teamId) && (
                        <StyledButton type="primary" onClick={() => handleClickTeamInfo(teamId)}>
                            <InfoCircleOutlined />팀 정보 보기
                        </StyledButton>
                    )}
                </ButtonWrapper>
                <ButtonWrapper>
                    <StyledButton
                        disabled={isDisabled(repeat, nextDate)}
                        onClick={() => handleClickSkip(id, teamId, repeat, nextDate, startTime, endTime)}
                    >
                        <PauseOutlined />
                        다음 번에 안 해요
                        {!isDisabled(repeat, nextDate) && (
                            <ButtonSmallText>(다음 {eventIds.includes(teamId) ? '일정을' : '합주를'} {dayjs(dayjs(nextDate).add(7, 'day')).format('M/D(dd)')}로)</ButtonSmallText>
                        )}
                    </StyledButton>
                </ButtonWrapper>
                <ButtonWrapper>
                    <StyledButton onClick={() => handleClickUpdate(id, repeat, nextDate, startTime, endTime)}><EditOutlined />{eventIds.includes(teamId) ? '일정' : '합주'} 수정</StyledButton>
                    <StyledButton danger onClick={() => handleClickDelete(id)}><DeleteOutlined />{eventIds.includes(teamId) ? '일정' : '합주'} 삭제</StyledButton>
                </ButtonWrapper>
            </Card>
            <Card>
                <NextEnsemble>
                    <NextEnsembleLabel>다음 {eventIds.includes(teamId) ? '일정' : '합주'}</NextEnsembleLabel>
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

const ButtonSmallText = styled.div`
    font-size: 1rem !important;
    color: ${({ theme }) => theme.darkGray};
`;


export default EnsembleInfoDrawer;