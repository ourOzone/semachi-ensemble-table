import { useState, type ComponentType, type ReactNode } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
    CalendarCheck,
    CalendarClock,
    CalendarOff,
    CalendarPlus,
    ChevronRight,
    Pencil,
    Repeat,
    Trash2,
    Undo2,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerTitle,
} from '@/components/ui/drawer';
import type { CheckEnsembleExists, HandleClickTeamInfo } from '@/components/board/types';
import { useTeamContext, useEnsembleContext } from '@/context';
import { days, eventIds, idx2hour } from '@/constants';
import { buildColorMap } from '@/lib/board';
import { getEnsembleSchedule } from '@/lib/calendar';
import { cn } from '@/lib/utils';
import { useTeams } from '@/queries/teams';
import { useDrawerStore } from '@/stores/drawer';
import theme from '@/styles/theme';
import type { TimeSlot } from '@/types';

// 합주 정보 Drawer (View 개편 V-2). 아래에서 올라오고, 아래로 끌어내리면 닫힌다 (vaul).
// 위쪽은 팀 색 머리(팀 이름·요일·시간·반복 여부), 아래는 다음 합주와 미루기·미루기 취소·수정·삭제.
// 미루기 등의 PIN·입력 단계는 아직 옛 Drawer라, 그 Drawer가 쌓이면 이 Drawer는 잠시 내려간다 (stores/drawer의 BOTTOM_DRAWERS).

interface EnsembleInfoDrawerProps {
    checkEnsembleExists: CheckEnsembleExists;
    handleClickTeamInfo: HandleClickTeamInfo;
}

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

/** "11/26(목)" */
function formatDate(date: Dayjs): string {
    return `${date.month() + 1}/${date.date()}(${days[(date.day() + 6) % 7]})`;
}

/** "20:00 – 22:00" */
function formatTimeRange(startTime: TimeSlot, endTime: TimeSlot): string {
    return `${idx2hour[startTime] ?? ''} – ${idx2hour[endTime + 1] ?? ''}`;
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

/** 누를 수 있는 것: 마우스를 올리면 바탕이 바뀌고, 누르면 살짝 작아짐 */
const pressable = 'transition-[background-color,scale] duration-150 active:scale-[0.97]';

// 모양이 고정된 버튼·카드는 스쿼클 (corner-shape 지원 브라우저만, 그 외는 일반 둥근 모서리)
const boxShape = 'squircle rounded-2xl supports-[corner-shape:squircle]:rounded-[24px]';

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
    const [shown, setShown] = useState<{
        key: string | null;
        ensemble: ShownEnsemble;
        /** 붙잡은 시각 (오늘부터 며칠 뒤, 쉬는 날짜 계산용) */
        now: Dayjs;
    } | null>(null);
    if (live && liveKey !== shown?.key) {
        setShown({ key: liveKey, ensemble: live, now: dayjs() });
    } else if (!live && shown && shown.key !== null) {
        setShown({ ...shown, key: null }); // 다시 열면 새로 붙잡는다
    }

    const handleClose = () => {
        closeDrawer(); // 열려 있을 때는 맨 위가 이 Drawer
        setTeamStates();
        setEnsembleStates();
    };

    // 다음 단계(옛 Drawer)로 가기 전에 합주가 아직 있는지 확인한다 (없으면 checkEnsembleExists가 Drawer를 모두 닫는다)
    const goNext = async (next: () => void) => {
        try {
            if (await checkEnsembleExists(id)) next();
        } catch {
            // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
        }
    };

    const handleClickUpdate = () =>
        goNext(() => {
            // 수정하다 뒤로 가면 원래 값으로 되돌리기 위해 저장해 둔다
            setEnsembleOrgStates(repeat, nextDate, startTime, endTime);
            setStartTime(null);
            setEndTime(null);
            openDrawer('updateEnsemble1');
        });

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

        return (
            // 위 모서리는 바깥(Drawer)과 같은 모양으로 잘라 팀 색 머리가 모서리 밖으로 나가지 않게
            <div className="squircle min-h-0 overflow-y-auto rounded-t-[24px] supports-[corner-shape:squircle]:rounded-t-[36px]">
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
                                ? `${formatDate(skippedDates[0]!)} 쉬어요`
                                : `${formatDate(skippedDates[0]!)}부터 ${skippedDates.length}주 쉬어요`}
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
                            <ActionButton
                                icon={CalendarClock}
                                onClick={() => goNext(() => openDrawer('skipEnsemble'))}
                            >
                                {formatDate(next.add(7, 'day'))}로 {skipped ? '더 ' : ''}미루기
                            </ActionButton>
                        ) : (
                            <ActionButton
                                icon={Repeat}
                                onClick={() => goNext(() => openDrawer('repeatEnsemble'))}
                            >
                                매주 반복으로 바꾸기
                            </ActionButton>
                        )}
                        {skipped && (
                            <ActionButton
                                icon={Undo2}
                                onClick={() => goNext(() => openDrawer('unskipEnsemble'))}
                            >
                                미루기 취소 ({formatDate(skippedDates[0]!)})
                            </ActionButton>
                        )}
                        <div className="grid grid-cols-2 gap-2.5">
                            <ActionButton icon={Pencil} onClick={handleClickUpdate}>
                                수정
                            </ActionButton>
                            <ActionButton
                                icon={Trash2}
                                danger
                                onClick={() => goNext(() => openDrawer('deleteEnsemble'))}
                            >
                                삭제
                            </ActionButton>
                        </div>
                    </div>
                </div>

                {!isEvent && (
                    <div className="border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
                        <button
                            type="button"
                            className="flex w-full items-center justify-center gap-1.5 py-4 text-[15px] font-medium text-[#1d5fb4] transition-colors duration-150 hover:bg-neutral-50 active:bg-neutral-100"
                            onClick={() => toast('준비 중인 기능이에요')}
                        >
                            <CalendarPlus className="size-[18px]" aria-hidden />
                            같은 시간에 다른 팀 합주 잡기
                        </button>
                    </div>
                )}
            </div>
        );
    })();

    return (
        <Drawer open={open} onOpenChange={(next) => !next && handleClose()}>
            <DrawerContent
                // Drawer 자체는 흰 바탕: vaul이 Drawer 아래에 바탕색을 이어 붙여(::after) 위로 끌어올려도 뒤가 비치지 않고,
                // 사파리 아래 도구 막대 쪽 여백도 흰색이 된다 (overflow-hidden이면 이 ::after가 잘린다)
                className="ui mx-auto w-full max-w-[520px] bg-white data-[vaul-drawer-direction=bottom]:border-t-0 data-[vaul-drawer-direction=bottom]:max-h-[92dvh] data-[vaul-drawer-direction=bottom]:rounded-t-[24px] squircle supports-[corner-shape:squircle]:data-[vaul-drawer-direction=bottom]:rounded-t-[36px]"
                overlayClassName="ui bg-black/40 supports-backdrop-filter:backdrop-blur-none"
                // 손잡이는 팀 색 머리 위에 겹친다
                handleClassName="absolute inset-x-0 top-2.5 z-10 mt-0 w-10 bg-white/60"
            >
                {content}
            </DrawerContent>
        </Drawer>
    );
};

export default EnsembleInfoDrawer;
