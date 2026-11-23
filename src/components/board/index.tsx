import { useCallback } from 'react';
import styled from 'styled-components';
import { isNotFound } from '@/api';
import { ensembleExists } from '@/api/ensemble';
import { useTeamContext, useEnsembleContext, useDrawerContext } from '@/context';
import {
    useBoard,
    useDeleteEnsemble,
    useRefreshEnsembles,
    useUpdateEnsemble,
} from '@/queries/ensembles';
import { useRefreshTeamsAndEnsembles, useTeams } from '@/queries/teams';
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
    const refreshEnsembles = useRefreshEnsembles();
    const refreshTeamsAndEnsembles = useRefreshTeamsAndEnsembles();
    const { mutateAsync: updateEnsembleAsync } = useUpdateEnsemble();
    const { mutateAsync: deleteEnsembleAsync } = useDeleteEnsemble();
    const { setTeamStates } = useTeamContext();
    const { setEnsembleStates, setNextDate } = useEnsembleContext();
    const { setOpenedDrawers, openDrawer, closeAllDrawers } = useDrawerContext();

    // 이미 삭제된 합주를 만났을 때: 상태·Drawer 초기화 후 합주 목록을 다시 불러온다
    const handleEnsembleGone = useCallback(() => {
        setTeamStates();
        setEnsembleStates();
        closeAllDrawers();
        refreshEnsembles();
    }, [closeAllDrawers, refreshEnsembles, setEnsembleStates, setTeamStates]);

    // 이미 삭제된 합주인지 체크. 정보·PIN Drawer가 다음 단계로 가기 전에 사용한다 (true를 리턴하면 계속 진행)
    const checkEnsembleExists = useCallback(
        async (id: string) => {
            try {
                await ensembleExists(id);
                return true;
            } catch {
                handleEnsembleGone();
                return false;
            }
        },
        [handleEnsembleGone],
    );

    // 합주 블록 클릭: 바로 정보 Drawer를 연다 (이전에는 여기서 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5)
    const handleEnsembleClick = useCallback(
        ({ id, teamId, name, repeat, nextDate, startTime, endTime }: EnsembleBlock) => {
            setTeamStates(teamId, '', name);
            setEnsembleStates(id, repeat, nextDate, startTime, endTime);
            openDrawer('ensembleInfo');
        },
        [openDrawer, setTeamStates, setEnsembleStates],
    );

    // 합주 정보 Drawer에서 팀 정보 보기 클릭 (id는 team id).
    // 불러온 팀 목록에서 찾는다. 없으면 이미 삭제된 팀 (이전에는 존재 확인 요청 후 찾았다: 사전 결정 5)
    const handleClickTeamInfo = useCallback(
        (id: string) => {
            const team = teams.find((team) => team.id === id);
            if (!team) {
                setTeamStates();
                setEnsembleStates();
                closeAllDrawers();
                refreshTeamsAndEnsembles();
                return;
            }
            setTeamStates(id, team.type, team.name, team.desc);
            openDrawer('teamInfo');
        },
        [
            closeAllDrawers,
            openDrawer,
            refreshTeamsAndEnsembles,
            setEnsembleStates,
            setTeamStates,
            teams,
        ],
    );

    // 이미 삭제됐으면 서버가 404를 준다 → 이미 삭제된 합주 처리 (이전에는 수정 전에 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5)
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
                // 선택을 마친 뒤에만 호출되어 null이 아님 (null이면 nextDate.day()에서 TypeError → catch, 기존 동작)
                await updateEnsembleAsync({
                    id,
                    ...toEnsembleRequest(teamId, repeat, nextDate!, startTime!, endTime!),
                });
                setOpenedDrawers(['ensembleInfo']);
                return true;
            } catch (err) {
                if (isNotFound(err)) handleEnsembleGone();
                // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
                return false;
            }
        },
        [handleEnsembleGone, setOpenedDrawers, updateEnsembleAsync],
    );

    const handleDeleteEnsemble = useCallback(
        async (id: string) => {
            try {
                await deleteEnsembleAsync(id);
            } catch {
                // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
            } finally {
                setEnsembleStates();
                closeAllDrawers();
            }
        },
        [closeAllDrawers, deleteEnsembleAsync, setEnsembleStates],
    );

    // 다음 번에 안 해요 클릭 시 nextDate를 7일 뒤로 변경.
    // 저장에 성공한 뒤에 화면의 다음 날짜를 바꾼다 (이전: 저장을 기다리지 않고 먼저 바꿔, 실패해도 바뀐 날짜가 보였다: ISSUES F4)
    const handleSkipEnsemble = useCallback(
        async (
            id: string,
            teamId: string,
            repeat: boolean,
            nextDate: Dayjs | null,
            startTime: TimeSlot | null,
            endTime: TimeSlot | null,
        ) => {
            const saved = await handleUpdateEnsemble(
                id,
                teamId,
                repeat,
                dayjs(nextDate).add(7, 'day'),
                startTime,
                endTime,
            );
            if (saved) {
                setNextDate((prev) => dayjs(prev).add(7, 'day'));
            }
        },
        [handleUpdateEnsemble, setNextDate],
    );

    return (
        <Container row>
            <HourColumn>
                {hours.map((hour) => (
                    <Hour key={hour}>{hour}</Hour>
                ))}
            </HourColumn>
            <Table>
                {ensembles?.map((day, idx) => (
                    <ColumnWrapper key={idx}>
                        <LabelWrapper isToday={idx === todayIdx}>
                            <DateLabel>{week[idx]?.date()}</DateLabel>
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
