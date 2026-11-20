import { useCallback } from 'react';
import styled from 'styled-components';
import { teamExists } from '@/api/team';
import { updateEnsemble, deleteEnsemble, ensembleExists } from '@/api/ensemble';
import { useTeamContext, useEnsembleContext, useDrawerContext } from '@/context';
import { useBoard } from '@/queries/ensembles';
import { useRefetchAll } from '@/queries/refetchAll';
import { useTeams } from '@/queries/teams';
import useMessage from '@/hooks/useMessage';
import { useToday } from '@/hooks/useToday';
import { days, hours } from '@/constants';
import { Container } from '@/components/common/Container';
import EnsembleInfoDrawer from './EnsembleInfoDrawer';
import UpdateEnsembleDrawer1 from './updateEnsembleDrawers/UpdateEnsembleDrawer1';
import UpdateEnsembleDrawer2 from './updateEnsembleDrawers/UpdateEnsembleDrawer2';
import UpdateEnsembleDrawer3 from './updateEnsembleDrawers/UpdateEnsembleDrawer3';
import UpdateEnsembleDrawer4 from './updateEnsembleDrawers/UpdateEnsembleDrawer4';
import DeleteEnsembleDrawer from './DeleteEnsembleDrawer';
import SkipEnsembleDrawer from './SkipEnsembleDrawer';
import dayjs, { type Dayjs } from 'dayjs';
import { isSkipped } from '@/lib/board';
import { toEnsembleRequest } from '@/lib/ensemble';
import { getTodayIdx, getWeek } from '@/lib/week';
import type { EnsembleBlock, TimeSlot } from '@/types';
import 'dayjs/locale/ko';

dayjs.locale('ko');

const Board = () => {
    // 자정이 지나면 다시 계산된다 (이전에는 모듈을 불러올 때 한 번만 계산: ISSUES F2)
    const today = useToday();
    const todayIdx = getTodayIdx(today); // 월요일 0 ~ 일요일 6 기준에서, 오늘의 idx값
    const week = getWeek(today); // 이번주 날짜 7개 (월~일)
    const teams = useTeams();
    const ensembles = useBoard();
    // fetchData: 화면 전체 다시 불러오기 (임시, 3-7·3-8에서 mutation으로 대체)
    const fetchData = useRefetchAll();
    const { setTeamStates } = useTeamContext();
    const { setEnsembleStates, setNextDate } = useEnsembleContext();
    const { setOpenedDrawers, openDrawer, closeAllDrawers } = useDrawerContext();
    const [message, contextHolder] = useMessage();

    // 이미 삭제된 합주인지 체크. 이미 있는 팀을 다루는 모든 작업에 적용해야 함, true를 리턴 시 각 작업 진행
    const checkEnsembleExists = useCallback(
        async (id: string) => {
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
        },
        [closeAllDrawers, fetchData, message, setEnsembleStates],
    );

    // 이 합주가 "다음 번에 안 해요"에 해당하는지(회색인지) 판단
    // const isSkipped = useCallback((nextDate) => nextDate.diff(dayjs().startOf('day'), 'day') >= 7, []);

    const handleEnsembleClick = useCallback(
        async ({ id, teamId, name, repeat, nextDate, startTime, endTime }: EnsembleBlock) => {
            try {
                if (await checkEnsembleExists(id)) {
                    setTeamStates(teamId, '', name);
                    setEnsembleStates(id, repeat, nextDate, startTime, endTime);
                    openDrawer('ensembleInfo');
                }
            } catch {
                message.error(
                    '인터넷이 안 좋거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.',
                );
            }
        },
        [fetchData, message, openDrawer, setTeamStates, setEnsembleStates],
    );

    // 합주 정보 Drawer에서 팀 정보 보기 클릭 (id는 team id)
    const handleClickTeamInfo = useCallback(
        async (id: string) => {
            try {
                // 누른 팀이 이미 삭제됐으면 에러 (catch 매커니즘이 달라서 예외적으로 checkTeamExists는 사용 불가)
                await teamExists(id);

                // 목록에 없으면 구조분해에서 TypeError → catch에서 "이미 삭제된 팀" 처리 (기존 동작)
                const { type, name, desc } = teams.find((team) => team.id === id)!;
                setTeamStates(id, type, name, desc);
                openDrawer('teamInfo');
            } catch {
                message.warning('이미 삭제된 팀이에요.');
                setTeamStates();
                setEnsembleStates();
                closeAllDrawers();
                fetchData();
            }
        },
        [message, fetchData, openDrawer, teams, setTeamStates, setEnsembleStates, closeAllDrawers],
    );

    const handleUpdateEnsemble = useCallback(
        async (
            id: string,
            teamId: string,
            repeat: boolean,
            nextDate: Dayjs | null,
            startTime: TimeSlot | null,
            endTime: TimeSlot | null,
        ) => {
            try {
                if (await checkEnsembleExists(id)) {
                    // 선택을 마친 뒤에만 호출되어 null이 아님 (null이면 nextDate.day()에서 TypeError → catch, 기존 동작)
                    await updateEnsemble(
                        id,
                        toEnsembleRequest(teamId, repeat, nextDate!, startTime!, endTime!),
                    );
                    fetchData();
                    message.success('잘 바꿔놨어요.');
                    setOpenedDrawers(['ensembleInfo']);
                }
            } catch {
                message.error(
                    '인터넷이 안 좋거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.',
                );
            }
        },
        [message, fetchData, setOpenedDrawers],
    );

    const handleDeleteEnsemble = useCallback(
        async (id: string) => {
            try {
                if (await checkEnsembleExists(id)) {
                    await deleteEnsemble(id);
                    message.success('합주를 삭제했어요.');
                }
            } catch {
                message.error(
                    '인터넷이 안 좋거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.',
                );
            } finally {
                setEnsembleStates();
                closeAllDrawers();
                fetchData();
            }
        },
        [closeAllDrawers, fetchData, message, setEnsembleStates],
    );

    // 다음 번에 안 해요 클릭 시 nextDate를 7일 뒤로 변경
    const handleSkipEnsemble = useCallback(
        async (
            id: string,
            teamId: string,
            repeat: boolean,
            nextDate: Dayjs | null,
            startTime: TimeSlot | null,
            endTime: TimeSlot | null,
        ) => {
            try {
                if (await checkEnsembleExists(id)) {
                    handleUpdateEnsemble(
                        id,
                        teamId,
                        repeat,
                        dayjs(nextDate).add(7, 'day'),
                        startTime,
                        endTime,
                    );
                    setNextDate((prev) => dayjs(prev).add(7, 'day'));
                    message.success('잘 미뤘어요.');
                }
            } catch {
                message.error(
                    '인터넷이 안 좋거나 서버에 문제가 있어요. 잠시 후 다시 시도해주세요.',
                );
            }
        },
        [handleUpdateEnsemble, message, checkEnsembleExists],
    );

    return (
        <Container row>
            {contextHolder}
            <HourColumn>
                {hours.map((hour) => (
                    <Hour key={hour}>{hour}</Hour>
                ))}
            </HourColumn>
            <Table>
                {ensembles?.map((day, idx) => (
                    <ColumnWrapper key={idx}>
                        <LabelWrapper isToday={idx === todayIdx}>
                            <DateLabel>{week[idx].date()}</DateLabel>
                            <DayLabel>{days[idx]}</DayLabel>
                        </LabelWrapper>
                        <Column>
                            {day.map((block, time) => (
                                <Block key={`${idx}_${time}`}>
                                    {block.map((ensemble) => (
                                        <Ensemble
                                            key={`${idx}_${time}_${ensemble.id}`}
                                            teamColor={ensemble.teamColor}
                                            // nextDate의 날짜 + endTime이 시간이 현재 날짜/시간보다 일주일 이상 멀면 회색 처리
                                            gray={isSkipped(ensemble, dayjs())}
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
                drawerId="ensembleInfo"
                checkEnsembleExists={checkEnsembleExists}
                handleClickTeamInfo={handleClickTeamInfo}
                handleSkipEnsemble={handleSkipEnsemble}
            />
            <UpdateEnsembleDrawer1
                drawerId="updateEnsemble1"
                checkEnsembleExists={checkEnsembleExists}
            />
            <UpdateEnsembleDrawer2 drawerId="updateEnsemble2" />
            <UpdateEnsembleDrawer3 drawerId="updateEnsemble3" />
            <UpdateEnsembleDrawer4
                drawerId="updateEnsemble4"
                handleUpdateEnsemble={handleUpdateEnsemble}
            />
            <DeleteEnsembleDrawer
                drawerId="deleteEnsemble"
                checkEnsembleExists={checkEnsembleExists}
                handleDeleteEnsemble={handleDeleteEnsemble}
            />
            <SkipEnsembleDrawer
                drawerId="skipEnsemble"
                checkEnsembleExists={checkEnsembleExists}
                handleSkipEnsemble={handleSkipEnsemble}
            />
        </Container>
    );
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

interface LabelWrapperProps {
    isToday: boolean;
}

const LabelWrapper = styled.div<LabelWrapperProps>`
    display: flex;
    flex-direction: column;
    height: 3.25rem;
    margin-bottom: 0.5rem;
    gap: 0.25rem;

    & > * {
        ${({ theme, isToday }) =>
            isToday &&
            `
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

interface EnsembleProps {
    /** 팀 색상 (색상 매핑에 없는 팀은 theme.blueGray) */
    teamColor: string;
    /** 다음 합주가 일주일 이상 뒤면 회색 */
    gray: boolean;
}

const Ensemble = styled.div<EnsembleProps>`
    width: 100%;
    height: 2.5rem;
    background-color: ${({ theme, teamColor, gray }) => (gray ? theme.disabledGray : teamColor)};
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
