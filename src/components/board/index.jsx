import React, { useCallback } from 'react';
import styled from 'styled-components';
import dayjs from "dayjs";
import { teamExists } from 'api/team';
import { updateEnsemble, deleteEnsemble, ensembleExists } from 'api/ensemble';
import { useFetchContext, useTeamContext, useEnsembleContext, useDrawerContext } from 'context';
import useMessage from 'hooks/useMessage';
import { days, hours } from 'constants';
import { Container } from 'components/common/Container';
import EnsembleInfoDrawer from './EnsembleInfoDrawer';
import UpdateEnsembleDrawer1 from './updateEnsembleDrawers/UpdateEnsembleDrawer1'
import UpdateEnsembleDrawer2 from './updateEnsembleDrawers/UpdateEnsembleDrawer2'
import UpdateEnsembleDrawer3 from './updateEnsembleDrawers/UpdateEnsembleDrawer3'
import UpdateEnsembleDrawer4 from './updateEnsembleDrawers/UpdateEnsembleDrawer4'
import DeleteEnsembleDrawer from './DeleteEnsembleDrawer';

// 월요일 0 ~ 일요일 6 기준에서, 오늘의 idx값
const todayIdx = dayjs().day() === 0 ? 6 : dayjs().day() - 1;

// 이번주 날짜 7개 (시간은 현재 시간)
const week = Array.from({ length: 7 }, (_, i) =>
    dayjs().day(1).add(i, 'day')
);

const Board = () => {
    const { teams, ensembles, fetchData } = useFetchContext();
    const { setTeamStates } = useTeamContext();
    const { setEnsembleStates } = useEnsembleContext();
    const { setOpenedDrawers, openDrawer, closeAllDrawers } = useDrawerContext();
    const [message, contextHolder] = useMessage();

    // 이미 삭제된 합주인지 체크. 이미 있는 팀을 다루는 모든 작업에 적용해야 함, true를 리턴 시 각 작업 진행
    const checkEnsembleExists = useCallback(async (id) => {
        try {
            await ensembleExists(id);
            return true;
        } catch {
            message.warning('이미 삭제된 합주예요.');
            setTeamStates();
            setEnsembleStates();
            closeAllDrawers();
            fetchData();
            return false;
        }
    }, [closeAllDrawers, fetchData, message, setEnsembleStates]);

    // 이 합주가 "다음 번에 안 해요"에 해당하는지(회색인지) 판단
    const isSkipped = useCallback((nextDate) => nextDate.diff(dayjs().startOf('day'), 'day') >= 7, []);

    const handleEnsembleClick = useCallback(async ({ id, teamId, name, repeat, nextDate, startTime, endTime }) => {
        try {
            if (await checkEnsembleExists(id)) {
                setTeamStates(teamId, '', name);
                setEnsembleStates(id, repeat, nextDate, startTime, endTime); // TODO 화면에 띄울 state 추가
                openDrawer('ensembleInfo');
            }
            
        } catch {
            message.error('인터넷이 안 좋거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.');
        }
    }, [fetchData, message, openDrawer, setTeamStates, setEnsembleStates]);

    // 합주 정보 Drawer에서 팀 정보 보기 클릭 (id는 team id)
    const handleClickTeamInfo = useCallback(async (id) => {
        try {
            // 누른 팀이 이미 삭제됐으면 에러 (catch 매커니즘이 달라서 예외적으로 checkTeamExists는 사용 불가)
            await teamExists(id);

            const { type, name, desc } = teams.find(team => team.id === id);
            setTeamStates(id, type, name, desc);
            openDrawer('teamInfo');
        } catch {
            message.warning('이미 삭제된 팀이에요.');
            setTeamStates();
            setEnsembleStates();
            closeAllDrawers();
            fetchData();
        }

    }, [message, fetchData, openDrawer, teams, setTeamStates, setEnsembleStates, closeAllDrawers]);

    const handleUpdateEnsemble = useCallback(async (id, teamId, repeat, nextDate, startTime, endTime) => {
        try {
            if (await checkEnsembleExists(id)) {
                await updateEnsemble(id, {
                    teamId,
                    repeat,
                    nextDate,
                    startTime,
                    endTime,
                    day: (nextDate.day() + 6) % 7, // 월요일 0 ~ 일요일 6으로 변환
                    type: repeat ? '무기한' : '일회성', // TODO 삭제
                    due: repeat ? '2099-12-31' : nextDate.format('YYYY-MM-DD'), // TODO 삭제
                });
                fetchData();
                message.success('잘 바꿔놨어요.');
                setOpenedDrawers(['ensembleInfo']);
            }
        } catch {
            message.error('인터넷이 안 좋거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.');
        }
    }, [message, fetchData, setOpenedDrawers]);

    const handleDeleteEnsemble = useCallback(async (id) => {
        try {
            if (await checkEnsembleExists(id)) {
                await deleteEnsemble(id);
                message.success('삭제했어요.');
            }
        }
        catch {
            message.error('인터넷이 안 좋거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.');
        }
        finally {
            setEnsembleStates();
            closeAllDrawers();
            fetchData();
        }

    }, [closeAllDrawers, fetchData, message, setEnsembleStates]);
    
    return (
        <Container row>
            {contextHolder}
            <HourColumn>
                {hours.map(hour => <Hour key={hour}>{hour}</Hour>)}
            </HourColumn>
            <Table>
                {ensembles?.map((day, idx) => (
                    <ColumnWrapper key={idx}>
                        <LabelWrapper isToday={idx === todayIdx}>
                            <DateLabel>
                                {week[idx].date()}
                            </DateLabel>
                            <DayLabel>
                                {days[idx]}
                            </DayLabel>
                        </LabelWrapper>
                        <Column>
                            {day.map((block, time) => (
                                <Block key={`${idx}_${time}`}>
                                    {block.map((ensemble) => (
                                        <Ensemble
                                            key={`${idx}_${time}_${ensemble.id}`}
                                            teamColor={ensemble.teamColor}
                                            // nextDate가 일요일보다 이후면(즉 다음주면) 회색 처리
                                            gray={isSkipped(ensemble.nextDate)}
                                            onClick={() => handleEnsembleClick(ensemble)}
                                        >
                                            {/* 한 타임에 겹치는 팀이 5개 미만이면 팀명을 표시 */}
                                            {block.length < 5 && ensemble.displayName}
                                        </Ensemble>
                                    ))}
                                </Block>
                            ))}
                        </Column>
                    </ColumnWrapper>
                ))}
            </Table>
            
            {/* DRAWERS */}
            <EnsembleInfoDrawer
                drawerId='ensembleInfo'
                checkEnsembleExists={checkEnsembleExists}
                handleClickTeamInfo={handleClickTeamInfo}
                handleUpdateEnsemble={handleUpdateEnsemble}
            />
            <UpdateEnsembleDrawer1 drawerId='updateEnsemble1' checkEnsembleExists={checkEnsembleExists} />
            <UpdateEnsembleDrawer2 drawerId='updateEnsemble2' />
            <UpdateEnsembleDrawer3 drawerId='updateEnsemble3' />
            <UpdateEnsembleDrawer4 drawerId='updateEnsemble4' handleUpdateEnsemble={handleUpdateEnsemble} />
            <DeleteEnsembleDrawer drawerId='deleteEnsemble' checkEnsembleExists={checkEnsembleExists} handleDeleteEnsemble={handleDeleteEnsemble} />
        </Container>
    )
};

const HourColumn = styled.div`
    display: flex;
    flex-direction: column;
    margin: 4rem 0.5rem 0; // 4rem = LabelWrapper height + margin-bottom + 여유 0.25rem
`;

const Hour = styled.div`
    text-align: center;
    user-select: none;
    height: 5.25rem; // 5.25rem = block 2.5rem * 2 + even margin-bottom 0.25rem
`;

const Table = styled.div`
    display: flex;
    width: 100%;
`;

const ColumnWrapper = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
`;

const LabelWrapper = styled.div`
    display: flex;
    flex-direction: column;
    height: 3.25rem;
    margin-bottom: 0.5rem;
    gap: 0.25rem;

    & > * {
        ${({ theme, isToday }) => isToday && `
            color: ${theme.primary};
            font-family: Bold;
        `};
    }
`;

const DateLabel = styled.div`
    text-align: center;
    user-select: none;
`;

const DayLabel = styled(DateLabel)`
    font-size: 1.75rem;
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
    
    & > *:nth-child(even) {
        margin-bottom: 0.25rem;
    }
`;

const Block = styled.div`
    display: flex;
    background-color: ${({ theme }) => theme.boardBackground};
    height: 2.5rem;
    margin-right: 0.25rem;
`;

const Ensemble = styled.div`
    width: 100%;
    height: 2.5rem;
    background-color: ${({ theme, teamColor, gray }) => gray ? theme.disabledGray : teamColor};
    color: ${({ theme }) => theme.white};
    padding: 0.125rem;
    user-select: none;
    cursor: pointer;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    word-break: break-word;
`;

export default Board;