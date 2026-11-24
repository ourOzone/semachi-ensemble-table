import { useState, type ComponentType, type ReactNode } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
    CalendarCheck,
    CalendarClock,
    CalendarOff,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Repeat,
    Trash2,
    Undo2,
    X,
} from 'lucide-react';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerTitle,
} from '@/components/ui/drawer';
import type {
    CheckEnsembleExists,
    HandleClickTeamInfo,
    HandleDeleteEnsemble,
    HandleSkipEnsemble,
} from '@/components/board/types';
import { useTeamContext, useEnsembleContext } from '@/context';
import { days, eventIds } from '@/constants';
import { buildColorMap } from '@/lib/board';
import { getEnsembleSchedule } from '@/lib/calendar';
import { cn } from '@/lib/utils';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { useTeams } from '@/queries/teams';
import { useDrawerStore } from '@/stores/drawer';
import theme from '@/styles/theme';
import type { TimeSlot } from '@/types';
import {
    BookFooter,
    boxShape,
    formatDate,
    formatTimeRange,
    overlayClassName,
    pressable,
    scrollAreaClassName,
    sheetClassName,
} from './drawerParts';
import PinStep from './PinStep';

// 합주 정보 Drawer (View 개편 V-2). 아래에서 올라오고, 아래로 끌어내리면 닫힌다 (vaul).
// 위쪽은 팀 색 머리(팀 이름·요일·시간·반복 여부), 아래는 다음 합주와 미루기·바로 하기(미루기 취소)·수정·삭제.
// 서버 데이터로는 "미룬 반복 합주"와 "처음부터 미래에 시작하는 반복 합주"를 구분할 수 없어(ISSUES V9),
// 두 경우 모두에 맞는 문구를 쓴다 ("…엔 합주가 없어요", "…부터 바로 하기").
// 미루기·바로 하기·반복으로 바꾸기·삭제·수정의 PIN 단계는 이 Drawer 안에서 내용을 바꿔 보여준다 (step, 뒤로 가면 정보로).
// 수정의 다음 단계(반복 여부·날짜·시간)는 아직 옛 Drawer라, 그 Drawer가 쌓이면 이 Drawer는 잠시 내려간다 (stores/drawer의 BOTTOM_DRAWERS).

interface EnsembleInfoDrawerProps {
    checkEnsembleExists: CheckEnsembleExists;
    handleClickTeamInfo: HandleClickTeamInfo;
    handleSkipEnsemble: HandleSkipEnsemble;
    handleUnskipEnsemble: HandleSkipEnsemble;
    handleRepeatEnsemble: HandleSkipEnsemble;
    handleDeleteEnsemble: HandleDeleteEnsemble;
}

/** Drawer 안의 단계: 정보, 또는 그 동작의 PIN 확인 */
type Step = 'info' | 'skip' | 'unskip' | 'repeat' | 'delete' | 'update';

/** 보여주는 합주 (Drawer가 열려 있을 때의 context 값) */
interface ShownEnsemble {
    id: string;
    teamId: string;
    name: string;
    repeat: boolean;
    nextDate: Dayjs;
    startTime: TimeSlot;
    endTime: TimeSlot;
}

/** "2시간", "1시간 30분", "30분" (시간칸 하나 = 30분) */
function formatDuration(startTime: TimeSlot, endTime: TimeSlot): string {
    const slots = endTime + 1 - startTime;
    const hours = Math.floor(slots / 2);
    const minutes = slots % 2 === 1 ? '30분' : '';
    return hours > 0 ? `${hours}시간${minutes ? ` ${minutes}` : ''}` : minutes;
}

/** 오늘부터 며칠 뒤인지: "오늘", "내일", "이틀 뒤", "9일 뒤" */
function formatDaysLeft(date: Dayjs, now: Dayjs): string {
    const diff = date.startOf('day').diff(now.startOf('day'), 'day');
    if (diff <= 0) return '오늘';
    if (diff === 1) return '내일';
    if (diff === 2) return '이틀 뒤';
    return `${diff}일 뒤`;
}

interface ActionButtonProps {
    icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    danger?: boolean;
    onClick: () => void;
    children: ReactNode;
}

const ActionButton = ({ icon: Icon, danger = false, onClick, children }: ActionButtonProps) => (
    <button
        type="button"
        className={cn(
            pressable,
            boxShape,
            'flex h-13 w-full items-center justify-center gap-2 border border-neutral-200 bg-white px-3 text-[16px] font-medium hover:bg-neutral-50 md:h-14',
            danger ? 'text-red-700 hover:bg-red-50' : 'text-ink',
        )}
        onClick={onClick}
    >
        <Icon className="size-5 shrink-0" aria-hidden />
        <span className="truncate">{children}</span>
    </button>
);

const EnsembleInfoDrawer = ({
    checkEnsembleExists,
    handleClickTeamInfo,
    handleSkipEnsemble,
    handleUnskipEnsemble,
    handleRepeatEnsemble,
    handleDeleteEnsemble,
}: EnsembleInfoDrawerProps) => {
    const teams = useTeams();
    const { id: teamId, name, setTeamStates } = useTeamContext();
    const {
        id,
        repeat,
        nextDate,
        startTime,
        endTime,
        setStartTime,
        setEndTime,
        setEnsembleStates,
        setEnsembleOrgStates,
    } = useEnsembleContext();
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);
    const openDrawer = useDrawerStore((state) => state.openDrawer);
    const closeDrawer = useDrawerStore((state) => state.closeDrawer);

    // 스택의 맨 위일 때만 열린다 (위에 옛 Drawer가 쌓이면 잠시 내려간다)
    const open = openedDrawers[openedDrawers.length - 1] === 'ensembleInfo';

    // 보여줄 값은 열려 있는 동안의 context 값을 붙잡아 둔다. 닫히면서 context가 초기화되거나,
    // 수정 단계로 넘어가며 시간이 비워져도 내려가는 동안 내용이 그대로 보이게 한다
    const live: ShownEnsemble | null =
        open && nextDate && startTime !== null && endTime !== null
            ? { id, teamId, name, repeat, nextDate, startTime, endTime }
            : null;
    const liveKey = live
        ? [id, teamId, name, repeat, nextDate!.valueOf(), startTime, endTime].join('|')
        : null;
    const [step, setStep] = useState<Step>('info');
    const [shown, setShown] = useState<{
        key: string | null;
        ensemble: ShownEnsemble;
        /** 붙잡은 시각 (오늘부터 며칠 뒤, 쉬는 날짜 계산용) */
        now: Dayjs;
    } | null>(null);
    if (live && liveKey !== shown?.key) {
        // 새로 열리거나 저장으로 값이 바뀌면 정보 단계부터
        setShown({ key: liveKey, ensemble: live, now: dayjs() });
        setStep('info');
    } else if (!live && shown && shown.key !== null) {
        setShown({ ...shown, key: null }); // 다시 열면 새로 붙잡는다
    }

    const handleClose = () => {
        closeDrawer(); // 열려 있을 때는 맨 위가 이 Drawer
        setTeamStates();
        setEnsembleStates();
    };

    // PIN 단계로 가기 전에 합주가 아직 있는지 확인한다 (없으면 checkEnsembleExists가 Drawer를 모두 닫는다).
    // PIN을 넣을 때 한 번 더 확인하던 것은 없앴다: 그새 삭제됐으면 저장할 때 서버가 404를 준다 (이미 삭제됨 처리)
    const goStep = async (next: Step) => {
        try {
            if (await checkEnsembleExists(id)) setStep(next);
        } catch {
            // checkEnsembleExists는 실패를 false로 돌려준다
        }
    };

    // 수정: PIN이 맞으면 다음 단계(옛 Drawer: 반복 여부 → 날짜 → 시간)로
    const startUpdate = () => {
        // 수정하다 뒤로 가면 원래 값으로 되돌리기 위해 저장해 둔다 (UpdateEnsembleDrawer2의 onClose)
        setEnsembleOrgStates(repeat, nextDate, startTime, endTime);
        setStartTime(null);
        setEndTime(null);
        openDrawer('updateEnsemble2');
    };

    // PIN이 맞은 뒤 실행 (삭제는 확인 버튼을 누른 뒤). 삭제는 Drawer가 모두 닫힌다.
    // 저장에 성공하면 값(날짜·반복)이 바뀌어 위의 붙잡기에서 정보 단계로 돌아가고, 실패하면 false → PIN을 다시 넣는다
    const runAction = async (action: Exclude<Step, 'info' | 'update'>): Promise<boolean> => {
        if (action === 'delete') {
            await handleDeleteEnsemble(id);
            return true;
        }
        const handler = {
            skip: handleSkipEnsemble,
            unskip: handleUnskipEnsemble,
            repeat: handleRepeatEnsemble,
        }[action];
        return handler(id, teamId, repeat, nextDate, startTime, endTime);
    };

    // 화면 키보드가 열리면 Drawer를 보이는 영역의 아래 끝(키보드 바로 위)에 두고 그 안에 들어가게 한다 (hooks/useKeyboardInset)
    const { inset, viewportHeight } = useKeyboardInset();

    // 머리 색: 팀의 지금 색 (캘린더 블록과 같음)
    const color = shown
        ? (buildColorMap(teams)[shown.ensemble.teamId] ?? theme.blueGray)
        : theme.blueGray;

    const content = (() => {
        if (!shown) return null;
        const { ensemble, now } = shown;
        const day = (ensemble.nextDate.day() + 6) % 7;
        const { nextDate: next, skippedDates } = getEnsembleSchedule(
            { ...ensemble, day, nextDate: ensemble.nextDate.format() },
            now,
        );
        const isEvent = eventIds.includes(ensemble.teamId);
        const noun = isEvent ? '일정' : '합주';
        const skipped = skippedDates.length > 0;
        const timeRange = formatTimeRange(ensemble.startTime, ensemble.endTime);

        if (step !== 'info') {
            const object = `${noun}${isEvent ? '을' : '를'}`;
            const pinStep = {
                // 확인 버튼은 되돌릴 수 없는 삭제만. 나머지는 PIN이 맞는 즉시 실행
                skip: { title: `${formatDate(next.add(7, 'day'))}로 미룰까요?`, label: undefined },
                unskip: {
                    title: `${skippedDates[0] ? formatDate(skippedDates[0]) : ''}부터 바로 할까요?`,
                    label: undefined,
                },
                repeat: { title: '매주 반복으로 바꿀까요?', label: undefined },
                delete: { title: `${object} 삭제할까요?`, label: '삭제하기' },
                update: { title: `${object} 수정할까요?`, label: undefined },
            }[step];
            return (
                <div className={scrollAreaClassName}>
                    <div
                        key={step}
                        className="px-5 pt-[26px] pb-[calc(24px+env(safe-area-inset-bottom))] duration-200 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 md:px-7"
                    >
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                aria-label="뒤로"
                                className={`${pressable} -ml-2 inline-flex size-10 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100`}
                                onClick={() => setStep('info')}
                            >
                                <ChevronLeft className="size-6" aria-hidden />
                            </button>
                            <DrawerClose asChild>
                                <button
                                    type="button"
                                    aria-label="닫기"
                                    className={`${pressable} -mr-2 inline-flex size-10 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100`}
                                >
                                    <X className="size-6" aria-hidden />
                                </button>
                            </DrawerClose>
                        </div>
                        {/* 어떤 합주인지 */}
                        <p className="mt-3 flex min-w-0 items-center gap-1.5 text-[14px] text-neutral-500">
                            <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                            />
                            <span className="truncate">
                                {ensemble.name} · {days[day]} {timeRange}
                            </span>
                        </p>
                        <DrawerTitle className="mt-1.5 text-[24px] leading-tight font-bold text-ink md:text-[26px]">
                            {pinStep.title}
                        </DrawerTitle>
                        <DrawerDescription className="mt-1.5 text-[15px] text-neutral-500">
                            {step === 'delete' && '삭제하면 되돌릴 수 없어요. '}팀 PIN 4자리를
                            입력해 주세요
                        </DrawerDescription>
                        <div className="mt-7">
                            <PinStep
                                teamId={ensemble.teamId}
                                confirmLabel={pinStep.label}
                                danger={step === 'delete'}
                                onConfirm={() =>
                                    step === 'update' ? startUpdate() : runAction(step)
                                }
                            />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className={scrollAreaClassName}>
                {/* 머리: 팀 색 (손잡이는 이 위에 겹쳐 그린다) */}
                <div
                    className="px-5 pt-[26px] pb-6 text-white md:px-7"
                    style={{ backgroundColor: color }}
                >
                    <div className="flex items-center justify-between gap-3">
                        {isEvent ? (
                            <span className="truncate rounded-full bg-white/20 px-4 py-1.5 text-[17px] font-bold">
                                {ensemble.name}
                            </span>
                        ) : (
                            <button
                                type="button"
                                aria-label={`${ensemble.name} 팀 정보`}
                                className={`${pressable} flex min-w-0 items-center gap-0.5 rounded-full bg-white/20 py-1.5 pr-2.5 pl-4 text-[17px] font-bold hover:bg-white/30`}
                                onClick={() => handleClickTeamInfo(ensemble.teamId)}
                            >
                                <span className="truncate">{ensemble.name}</span>
                                <ChevronRight className="size-5 shrink-0" aria-hidden />
                            </button>
                        )}
                        <DrawerClose asChild>
                            <button
                                type="button"
                                aria-label="닫기"
                                className={`${pressable} -mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/20`}
                            >
                                <X className="size-6" aria-hidden />
                            </button>
                        </DrawerClose>
                    </div>
                    <DrawerTitle className="mt-4 text-[28px] leading-tight font-bold text-white md:text-[32px]">
                        {days[day]} {timeRange}
                    </DrawerTitle>
                    <DrawerDescription className="mt-1.5 flex items-center gap-1.5 text-[15px] text-white/90">
                        {ensemble.repeat ? (
                            <Repeat className="size-4" aria-hidden />
                        ) : (
                            <CalendarCheck className="size-4" aria-hidden />
                        )}
                        {ensemble.repeat ? '매주 반복' : '이번 한 번'}
                    </DrawerDescription>
                </div>

                {/* 본문 */}
                <div
                    className={cn(
                        'bg-white px-5 pt-5 pb-5 md:px-7 md:pt-6',
                        // 아래 줄이 없으면 본문이 화면 맨 아래 (아이폰 홈 막대 영역)
                        isEvent && 'pb-[calc(20px+env(safe-area-inset-bottom))]',
                    )}
                >
                    {skipped && (
                        <div
                            className={`${boxShape} mb-4 flex items-center gap-2.5 border border-dashed px-4 py-3 text-[15px] text-ink`}
                            style={{ borderColor: color }}
                        >
                            <CalendarOff
                                className="size-5 shrink-0"
                                style={{ color }}
                                aria-hidden
                            />
                            {skippedDates.length === 1
                                ? `${formatDate(skippedDates[0]!)}엔 ${noun}${isEvent ? '이' : '가'} 없어요`
                                : `${formatDate(skippedDates[0]!)} ~ ${formatDate(skippedDates[skippedDates.length - 1]!)}엔 ${noun}${isEvent ? '이' : '가'} 없어요`}
                        </div>
                    )}

                    <p className="text-[14px] text-neutral-500">
                        {ensemble.repeat ? `다음 ${noun}` : `${noun} 날짜`}
                    </p>
                    <div
                        className={`${boxShape} mt-2 flex items-center justify-between gap-3 border border-neutral-200 bg-neutral-50 px-4 py-3.5`}
                    >
                        <div className="min-w-0">
                            <p className="text-[18px] font-bold text-ink">{formatDate(next)}</p>
                            <p className="mt-0.5 text-[14px] text-neutral-600">
                                {timeRange} · {formatDuration(ensemble.startTime, ensemble.endTime)}
                            </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-neutral-200/70 px-2.5 py-1 text-[13px] text-neutral-600">
                            {formatDaysLeft(next, now)}
                        </span>
                    </div>
                    {!ensemble.repeat && (
                        <p className="mt-3 text-[13px] text-neutral-500">
                            {isEvent ? '일정이' : '합주가'} 끝나면 합주판에서 자동으로 사라져요
                        </p>
                    )}

                    <div className="mt-5 flex flex-col gap-2.5">
                        {ensemble.repeat ? (
                            <ActionButton icon={CalendarClock} onClick={() => goStep('skip')}>
                                {formatDate(next.add(7, 'day'))}로 미루기
                            </ActionButton>
                        ) : (
                            <ActionButton icon={Repeat} onClick={() => goStep('repeat')}>
                                매주 반복으로 바꾸기
                            </ActionButton>
                        )}
                        {skipped && (
                            <ActionButton icon={Undo2} onClick={() => goStep('unskip')}>
                                {formatDate(skippedDates[0]!)}부터 바로 하기
                            </ActionButton>
                        )}
                        <div className="grid grid-cols-2 gap-2.5">
                            <ActionButton icon={Pencil} onClick={() => goStep('update')}>
                                수정
                            </ActionButton>
                            <ActionButton icon={Trash2} danger onClick={() => goStep('delete')}>
                                삭제
                            </ActionButton>
                        </div>
                    </div>
                </div>

                {!isEvent && <BookFooter label="같은 시간에 다른 팀 합주 잡기" />}
            </div>
        );
    })();

    return (
        <Drawer
            open={open}
            onOpenChange={(next) => !next && handleClose()}
            // 키보드 위치 맞추기는 직접 한다 (vaul의 방식은 아이폰 사파리에서 너무 올라가고 높이가 남는다: hooks/useKeyboardInset)
            repositionInputs={false}
        >
            <DrawerContent
                className={sheetClassName}
                style={{
                    bottom: inset > 0 ? `${inset}px` : undefined,
                    maxHeight:
                        viewportHeight === null
                            ? undefined
                            : `min(92dvh, ${viewportHeight - 12}px)`,
                }}
                overlayClassName={overlayClassName}
                // 손잡이는 머리 위에 겹친다 (정보: 팀 색 머리, PIN: 흰 머리)
                handleClassName={cn(
                    'absolute inset-x-0 top-2.5 z-10 mt-0 w-10',
                    step === 'info' ? 'bg-white/60' : 'bg-neutral-300',
                )}
            >
                {content}
            </DrawerContent>
        </Drawer>
    );
};

export default EnsembleInfoDrawer;
