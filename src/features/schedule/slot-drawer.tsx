import type { Dayjs } from 'dayjs';
import { CalendarCheck, ChevronRight, X } from 'lucide-react';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerTitle,
} from '@/components/ui/drawer';
import { days, idx2hour } from '@/constants/index';
import { isSlotFull, type CalendarEvent, type SlotRange } from '@/lib/calendar';
import { ensemblesQueryOptions } from '@/queries/ensembles';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useDrawerStore } from '@/stores/drawer';
import type { DayIndex, TimeSlot } from '@/types/index';
import {
    BookFooter,
    boxShape,
    formatTimeRange,
    overlayClassName,
    pressable,
    scrollAreaClassName,
    sheetClassName,
} from '@/components/sheet/drawer-parts';
import { scrollFadeRef } from '@/components/ui/scroll-fade';
import { openAddEnsemble } from './add-ensemble-store';

// 합주 잡기 Drawer (View 개편 V-2). 합주판에서 시간을 눌렀을 때 아래에서 올라온다.
// - 빈 시간: 누른 시간과 비어 있다는 것, "이 시간에 합주 잡기"
// - 겹친 합주: 그 시간에 겹친 합주 목록 (누르면 합주 정보 Drawer로), "같은 시간에 다른 팀 합주 잡기".
//   이름이 안 보이는 좁은 화면에서 3개 이상 겹친 곳을 눌렀을 때, 또는 겹친 곳의 빈 자리를 눌렀을 때 (lib/calendar의 resolveSlotTap)

export interface SlotView {
    /** 누른 날짜 */
    date: Dayjs;
    day: DayIndex;
    tap:
        | { kind: 'empty'; slot: TimeSlot; range: SlotRange }
        | { kind: 'list'; events: CalendarEvent[] };
}

interface SlotDrawerProps {
    /** 보여줄 내용. 닫혀도 지우지 않아 내려가는 동안 그대로 보인다 */
    view: SlotView | null;
    /** 목록에서 합주를 고름 → 합주 정보 Drawer로 */
    onSelect: (event: CalendarEvent) => void;
}

/** 목록 오른쪽 막대의 시간 축: 겹친 합주 전체를 덮는 정시 구간 [start, end) (시간칸) */
function hourAxis(events: readonly SlotRange[]) {
    const min = Math.min(...events.map((e) => e.startTime));
    const max = Math.max(...events.map((e) => e.endTime));
    const start = Math.floor(min / 2) * 2;
    const end = Math.ceil((max + 1) / 2) * 2;
    const hours = (end - start) / 2;
    // 눈금은 많아야 5개 정도
    const step = Math.max(1, Math.ceil(hours / 4));
    const ticks: TimeSlot[] = [];
    for (let slot = start; slot <= end; slot += step * 2) ticks.push(slot);
    return { min, max, start, end, ticks };
}

const percent = (value: number, total: number) => `${(value / total) * 100}%`;

const SlotDrawer = ({ view, onSelect }: SlotDrawerProps) => {
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);
    const closeDrawer = useDrawerStore((state) => state.closeDrawer);
    const open = openedDrawers[openedDrawers.length - 1] === 'slotInfo';
    const { data: ensembles = [] } = useQuery(ensemblesQueryOptions);

    const content = (() => {
        if (!view) return null;
        const { date, day, tap } = view;
        const dateLabel = `${date.month() + 1}월 ${date.date()}일`;
        const axis = tap.kind === 'list' ? hourAxis(tap.events) : null;
        const total = axis ? axis.end - axis.start : 1;

        return (
            <div ref={scrollFadeRef} className={scrollAreaClassName}>
                {/* 머리 */}
                <div className="flex items-start justify-between gap-3 px-5 pt-[26px] md:px-7">
                    <div className="min-w-0">
                        <DrawerTitle className="text-[26px] leading-tight font-bold text-ink md:text-[28px]">
                            {days[day]}{' '}
                            {tap.kind === 'list'
                                ? formatTimeRange(axis!.min, axis!.max)
                                : formatTimeRange(tap.slot, tap.slot)}
                        </DrawerTitle>
                        <DrawerDescription className="mt-1.5 text-[15px] text-neutral-500">
                            {tap.kind === 'list'
                                ? `${dateLabel} · ${tap.events.length}개가 겹쳐 있어요`
                                : dateLabel}
                        </DrawerDescription>
                    </div>
                    <DrawerClose asChild>
                        <button
                            type="button"
                            aria-label="닫기"
                            className={`${pressable} -mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100`}
                        >
                            <X className="size-6" aria-hidden />
                        </button>
                    </DrawerClose>
                </div>

                {/* 본문 */}
                <div className="px-5 pt-5 pb-5 md:px-7">
                    {tap.kind === 'empty' ? (
                        <div
                            className={`${boxShape} flex items-center gap-3 border border-neutral-200 bg-neutral-50 px-4 py-4`}
                        >
                            <CalendarCheck
                                className="size-6 shrink-0 text-neutral-500"
                                aria-hidden
                            />
                            <div className="min-w-0">
                                <p className="text-[16px] font-bold text-ink">
                                    비어 있는 시간이에요
                                </p>
                                <p className="mt-0.5 text-[14px] text-neutral-500">
                                    {formatTimeRange(tap.range.startTime, tap.range.endTime)} 동안
                                    잡힌 합주가 없어요
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 시간 눈금 (오른쪽 막대와 같은 폭) */}
                            <div aria-hidden className="flex items-end gap-3 pr-7">
                                <div className="flex-1" />
                                <div className="relative h-4 w-[38%] max-w-[180px] text-[12px] leading-none text-neutral-400">
                                    {axis!.ticks.map((slot, i) => (
                                        <span
                                            key={slot}
                                            className={cn(
                                                'absolute bottom-0',
                                                i === 0
                                                    ? ''
                                                    : slot === axis!.end
                                                      ? '-translate-x-full'
                                                      : '-translate-x-1/2',
                                            )}
                                            style={{ left: percent(slot - axis!.start, total) }}
                                        >
                                            {(idx2hour[slot] ?? '24').slice(0, 2)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <ul className="mt-1">
                                {tap.events.map((event) => {
                                    const skipped = event.status === 'skipped';
                                    return (
                                        <li
                                            key={event.id}
                                            className="border-b border-neutral-100 last:border-b-0"
                                        >
                                            <button
                                                type="button"
                                                aria-label={`${event.name} 합주 정보`}
                                                className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-xl px-2 py-3.5 text-left transition-colors duration-150 hover:bg-neutral-50 active:bg-neutral-100"
                                                onClick={() => onSelect(event)}
                                            >
                                                <span
                                                    className={cn(
                                                        'size-2.5 shrink-0 rounded-full',
                                                        skipped && 'border-[1.5px] border-dashed',
                                                    )}
                                                    style={
                                                        skipped
                                                            ? { borderColor: event.color }
                                                            : { backgroundColor: event.color }
                                                    }
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[16px] font-bold text-ink">
                                                        {event.name}
                                                    </span>
                                                    <span className="mt-0.5 block truncate text-[13px] text-neutral-500">
                                                        {formatTimeRange(
                                                            event.startTime,
                                                            event.endTime,
                                                        )}{' '}
                                                        ·{' '}
                                                        {skipped
                                                            ? '이번 주엔 없어요'
                                                            : event.repeat
                                                              ? '매주 반복'
                                                              : '이번 한 번'}
                                                    </span>
                                                </span>
                                                {/* 겹친 합주들 사이에서의 시간 위치 */}
                                                <span className="relative h-2 w-[38%] max-w-[180px] shrink-0 rounded-full bg-neutral-100">
                                                    <span
                                                        className={cn(
                                                            'absolute inset-y-0 rounded-full',
                                                            skipped && 'border border-dashed',
                                                        )}
                                                        style={{
                                                            left: percent(
                                                                event.startTime - axis!.start,
                                                                total,
                                                            ),
                                                            width: percent(
                                                                event.endTime + 1 - event.startTime,
                                                                total,
                                                            ),
                                                            ...(skipped
                                                                ? { borderColor: event.color }
                                                                : { backgroundColor: event.color }),
                                                        }}
                                                    />
                                                </span>
                                                <ChevronRight
                                                    className="size-4 shrink-0 text-neutral-400"
                                                    aria-hidden
                                                />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </div>

                {/* 누른 날짜와 시작 시간(빈 시간: 누른 칸, 겹친 합주: 위에 보이는 시간의 시작)을 채운 합주 잡기 Drawer로 */}
                <BookFooter
                    label={
                        tap.kind === 'list'
                            ? '같은 시간에 다른 팀 합주 잡기'
                            : '이 시간에 합주 잡기'
                    }
                    onClick={() =>
                        openAddEnsemble({
                            date,
                            startTime: tap.kind === 'list' ? axis!.min : tap.slot,
                        })
                    }
                    // 그 시간에 이미 4개가 겹쳐 있으면 잡을 수 없다 (24차)
                    full={tap.kind === 'list' && isSlotFull(ensembles, date, axis!.min)}
                />
            </div>
        );
    })();

    return (
        <Drawer open={open} onOpenChange={(next) => !next && closeDrawer()}>
            <DrawerContent
                className={sheetClassName}
                overlayClassName={overlayClassName}
                handleClassName="absolute inset-x-0 top-2.5 z-10 mt-0 w-10 bg-neutral-300"
            >
                {content}
            </DrawerContent>
        </Drawer>
    );
};

export default SlotDrawer;
