import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
import { getEnsembleSchedule, isSlotFull } from '@/lib/calendar';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { getRepeatEnd } from '@/lib/ensemble';
import { ensemblesQueryOptions } from '@/queries/ensembles';
import { LOCKED_SCROLL_VAR, lockPageScroll } from '@/lib/pageScrollLock';
import { useTeams } from '@/queries/teams';
import { useDrawerStore } from '@/stores/drawer';
import theme from '@/styles/theme';
import type { TimeSlot } from '@/types';
import {
    BookFooter,
    boxShape,
    formatDate,
    formatSlots,
    formatTimeRange,
    headerBackdrop,
    overlayClassName,
    pressable,
    scrollAreaClassName,
    sheetClassName,
} from './drawerParts';
import { scrollFadeRef } from '@/components/ui/scroll-fade';
import PinStep from './PinStep';
import { openAddEnsemble, openUpdateEnsemble } from './addEnsembleStore';

// 합주 정보 Drawer (View 개편 V-2). 아래에서 올라오고, 아래로 끌어내리면 닫힌다 (vaul).
// 위쪽은 팀 색 머리(팀 이름·요일·시간·반복 여부), 아래는 다음 합주와 미루기·바로 하기(미루기 취소)·수정·삭제.
// 서버 데이터로는 "미룬 반복 합주"와 "처음부터 미래에 시작하는 반복 합주"를 구분할 수 없어(ISSUES V9),
// 두 경우 모두에 맞는 문구를 쓴다 ("…엔 합주가 없어요", "…부터 바로 하기").
// 미루기·바로 하기·반복으로 바꾸기·삭제·수정의 PIN 단계는 이 Drawer 안에서 내용을 바꿔 보여준다 (step, 뒤로 가면 정보로).
// 수정은 PIN이 맞으면 합주 수정 Drawer(합주 잡기 Drawer의 수정 모드, 31차)로 바뀌고, 저장하거나 닫으면 다시 이 Drawer로 온다.

interface EnsembleInfoDrawerProps {
    checkEnsembleExists: CheckEnsembleExists;
    handleClickTeamInfo: HandleClickTeamInfo;
    handleSkipEnsemble: HandleSkipEnsemble;
    handleUnskipEnsemble: HandleSkipEnsemble;
    handleRepeatEnsemble: HandleSkipEnsemble;
    handleDeleteEnsemble: HandleDeleteEnsemble;
    /** 캘린더에서 누른 블록의 날짜 (보고 있던 주의 그 요일). "같은 시간에 다른 팀 합주 잡기"의 날짜 (24차) */
    calendarDate: Dayjs | null;
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
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
}

const ActionButton = ({
    icon: Icon,
    danger = false,
    disabled = false,
    onClick,
    children,
}: ActionButtonProps) => (
    <button
        type="button"
        disabled={disabled}
        className={cn(
            pressable,
            boxShape,
            'flex h-13 w-full items-center justify-center gap-2 border border-neutral-200 bg-surface px-3 text-[16px] font-medium hover:bg-neutral-50 disabled:text-neutral-300 disabled:hover:bg-surface disabled:active:scale-100 md:h-14',
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
    calendarDate,
}: EnsembleInfoDrawerProps) => {
    const teams = useTeams();
    const { data: ensembleList } = useQuery(ensemblesQueryOptions);
    const { id: teamId, name, setTeamStates } = useTeamContext();
    const { id, repeat, nextDate, startTime, endTime, setEnsembleStates } = useEnsembleContext();
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);
    const closeDrawer = useDrawerStore((state) => state.closeDrawer);

    // 스택의 맨 위일 때만 열린다
    const open = openedDrawers[openedDrawers.length - 1] === 'ensembleInfo';

    // 보여줄 값은 열려 있는 동안의 context 값을 붙잡아 둔다. 닫히면서 context가 초기화되어도
    // 내려가는 동안 내용이 그대로 보이게 한다
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

    // 화면 키보드가 열리면 내용을 보이는 영역의 아래 끝(키보드 바로 위)까지 올리고, 그 안에 들어가게 한다 (hooks/useKeyboardInset).
    // Drawer 자체는 화면 맨 아래에 둔 채 키보드 높이만큼 아래 여백을 준다: Drawer의 흰 바탕이 키보드 뒤까지 덮어,
    // 키보드 위 막대(완료 버튼)와 반투명 키보드 사이로 뒤 화면이 비치지 않는다
    // (17차, 이전: Drawer를 키보드 높이만큼 올렸더니 아이폰에서 그 아래가 비었다)
    const { inset, viewportHeight, visibleBottom } = useKeyboardInset();

    // PIN 단계 동안 뒤 페이지를 스크롤할 수 없게 고정한다 (20차, lib/pageScrollLock).
    // 아이폰 사파리는 입력칸에 포커스가 가거나 커서가 움직일 때마다(틀린 PIN을 비울 때 등) 입력칸을 보이려고 페이지를 스크롤한다.
    // Drawer 위치는 보이는 영역 기준으로 직접 맞추므로 이 스크롤은 필요 없고, 뒤 합주판만 계속 내려갔다
    const pinStepOpen = open && step !== 'info';
    useEffect(() => (pinStepOpen ? lockPageScroll() : undefined), [pinStepOpen]);

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
        // 반복 종료 날짜 (23차, 합주 잡기에서 지정). 계속 반복이면 null
        // 서버 기록도 반복일 때만 (일회성을 반복으로 바꾼 직후에는 다시 불러오기 전까지 기록의 due가 일회성 날짜다)
        const record = ensembleList?.find(({ _id: ensembleId }) => ensembleId === ensemble.id);
        const repeatEnd = ensemble.repeat && record?.repeat ? getRepeatEnd(record.due, now) : null;
        // 반복 종료 날짜 뒤로는 미룰 수 없다 (24차, 이전: 12/10에 끝나는 합주를 12/15로 미룰 수 있었다)
        const skipTo = next.add(7, 'day');
        const canSkip = !repeatEnd || !skipTo.isAfter(repeatEnd, 'day');
        // 같은 시간에 다른 팀 합주 잡기: 날짜는 캘린더에서 보던 날 (24차, 이전: 이 합주의 다음 날짜).
        // 그 시간에 이미 4개가 겹쳐 있으면 잡을 수 없다
        const bookDate = calendarDate ?? next;
        const bookFull = isSlotFull(ensembleList ?? [], bookDate, ensemble.startTime);
        // 수정: PIN이 맞으면 지금 값을 채운 합주 수정 Drawer로 (31차, 이전: 옛 Drawer 반복 여부 → 날짜 → 시간).
        // context는 그대로 둔다: 저장하지 않고 닫으면 이 Drawer가 같은 내용으로 다시 열린다
        const startUpdate = () =>
            openUpdateEnsemble({
                id: ensemble.id,
                team: { id: ensemble.teamId, name: ensemble.name, color, isEvent },
                repeat: ensemble.repeat,
                date: next.startOf('day'),
                startTime: ensemble.startTime,
                endTime: ensemble.endTime,
                repeatEnd,
            });

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
                <div ref={scrollFadeRef} className={scrollAreaClassName}>
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
            <div ref={scrollFadeRef} className={scrollAreaClassName} style={headerBackdrop(color)}>
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
                        {ensemble.repeat
                            ? `매주 반복${repeatEnd ? ` · ${formatDate(repeatEnd)}까지` : ''}`
                            : '이번 한 번'}
                    </DrawerDescription>
                </div>

                {/* 본문 */}
                <div
                    className={cn(
                        'bg-surface px-5 pt-5 pb-5 md:px-7 md:pt-6',
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
                                {timeRange} ·{' '}
                                {formatSlots(ensemble.endTime + 1 - ensemble.startTime)}
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
                            <>
                                <ActionButton
                                    icon={CalendarClock}
                                    disabled={!canSkip}
                                    onClick={() => goStep('skip')}
                                >
                                    {formatDate(skipTo)}로 미루기
                                </ActionButton>
                                {!canSkip && (
                                    <p className="-mt-1 text-center text-[13px] text-neutral-500">
                                        반복 종료({formatDate(repeatEnd!)}) 뒤로는 미룰 수 없어요
                                    </p>
                                )}
                            </>
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

                {!isEvent && (
                    <BookFooter
                        label="같은 시간에 다른 팀 합주 잡기"
                        // 캘린더에서 보던 날짜·이 합주의 시작 시간을 채운 합주 잡기 Drawer로 바뀐다 (보던 합주의 상태는 비운다)
                        full={bookFull}
                        onClick={() => {
                            setTeamStates();
                            setEnsembleStates();
                            openAddEnsemble({ date: bookDate, startTime: ensemble.startTime });
                        }}
                    />
                )}
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
                    paddingBottom: inset > 0 ? `${inset}px` : undefined,
                    // 높이에는 아래 여백(키보드)이 들어가므로, 보이는 부분 = 보이는 영역 - 위 12px
                    maxHeight:
                        viewportHeight === null
                            ? undefined
                            : inset > 0
                              ? `${viewportHeight - 12 + inset}px`
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
            {pinStepOpen && visibleBottom !== null && (
                <KeyboardCover visibleBottom={visibleBottom} />
            )}
        </Drawer>
    );
};

/** KeyboardCover가 보이는 영역 아래 끝보다 얼마나 위에서 시작하는지 (Drawer 아래에 숨는 부분, 줄바꿈 오차 여유) */
const KEYBOARD_COVER_OVERLAP = 240;
/**
 * 흰 판의 높이: 키보드(약 300~400px)와 그 위 막대를 덮고도 남게. 너무 길면 문서가 그만큼 길어져
 * 사파리가 입력칸을 보이려고 스크롤할 공간이 생긴다 (19차 이전 3000px: 틀릴 때마다 뒤 페이지가 계속 내려갔다)
 */
const KEYBOARD_COVER_HEIGHT = 1000;

/**
 * 아이폰 사파리 26: 키보드 위 막대(^ v 완료)와 반투명 키보드 쪽에는 고정(position: fixed) 요소가 아니라
 * "페이지 내용"의 그 부분이 그대로 비친다 (어둡게 하는 덮개·Drawer·vaul의 흰 연장 모두 닿지 않음. 17차까지 그대로였던 이유).
 * 그래서 페이지 문서 안에(absolute) 흰 판을 깔아, 보이는 영역 아래 끝 조금 위부터 그 아래를 덮는다.
 * 보이는 영역 안에 걸친 부분은 Drawer(z-50) 아래에 숨는다. 보이는 영역 밖이라 다른 브라우저에서는 보이지 않는다
 */
const KeyboardCover = ({ visibleBottom }: { visibleBottom: number }) =>
    createPortal(
        <div
            aria-hidden
            data-keyboard-cover
            className="pointer-events-none absolute inset-x-0 z-40 bg-surface"
            style={{
                // body가 고정(lockPageScroll)되면 body 기준 위치라 고정할 때의 스크롤만큼 더한다
                top: `calc(var(${LOCKED_SCROLL_VAR}, 0px) + ${visibleBottom - KEYBOARD_COVER_OVERLAP}px)`,
                height: `${KEYBOARD_COVER_HEIGHT}px`,
            }}
        />,
        document.body,
    );

export default EnsembleInfoDrawer;
