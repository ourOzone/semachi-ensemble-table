import type { CSSProperties } from 'react';
import type { Dayjs } from 'dayjs';
import { days, hours } from '@/constants';
import { formatSlotRange, type CalendarEvent, type WithLane } from '@/lib/calendar';
import { cn } from '@/lib/utils';

// 주 단위 캘린더 (View 개편 V-2). 가로선만 있는 흰 바탕 표에 합주를 시간 길이만큼의 블록으로 그린다.
// 시간칸(30분) 하나의 높이는 --slot (모바일 22px, PC 26px). 블록 위치·높이는 --slot의 배수다.

const SLOT_COUNT = 30; // 09:00 ~ 24:00, 30분 단위

/** 시간 표시는 1시간 30분(3칸) 이상인 블록에만 (흰 글씨 규칙) */
const TIME_MIN_SLOTS = 3;

/** 줄무늬: 팀 아닌 일정(소모임·회의 등) */
const EVENT_STRIPES =
    'repeating-linear-gradient(135deg, rgb(255 255 255 / 0.22) 0 3px, transparent 3px 7px)';

interface WeekCalendarProps {
    /** [요일 0~6][그날 보이는 합주] */
    week: WithLane<CalendarEvent>[][];
    /** 그 주 월요일 */
    weekStart: Dayjs;
    /** 오늘이 이 주에 있으면 요일 인덱스(월 0 ~ 일 6), 없으면 null */
    todayIdx: number | null;
    onClickEvent: (event: CalendarEvent) => void;
}

const WeekCalendar = ({ week, weekStart, todayIdx, onClickEvent }: WeekCalendarProps) => {
    return (
        <div className="mt-4 [--hour-col:28px] [--slot:22px] md:mt-5 md:[--hour-col:40px] md:[--slot:26px]">
            {/* 요일 머리글 */}
            <div className="grid grid-cols-[var(--hour-col)_repeat(7,minmax(0,1fr))] pb-2">
                <div />
                {days.map((label, idx) => {
                    const isToday = idx === todayIdx;
                    return (
                        <div key={label} className="flex flex-col items-center gap-1">
                            <span
                                className={cn(
                                    'text-xs text-neutral-500',
                                    isToday && 'font-bold text-blue-600',
                                )}
                            >
                                {label}
                            </span>
                            <span
                                className={cn(
                                    'flex size-7 items-center justify-center rounded-full text-[15px] font-bold text-neutral-900 md:size-8 md:text-base',
                                    isToday && 'bg-blue-600 text-white',
                                )}
                                aria-current={isToday ? 'date' : undefined}
                            >
                                {weekStart.add(idx, 'day').date()}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* 본문: 시간 라벨 + 요일 7칸 */}
            <div className="relative grid grid-cols-[var(--hour-col)_repeat(7,minmax(0,1fr))] pt-2">
                {/* 가로선: 한 시간마다 (요일 영역 전체) */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute top-2 right-0 left-[var(--hour-col)]"
                >
                    {Array.from({ length: SLOT_COUNT / 2 + 1 }, (_, i) => (
                        <div
                            key={i}
                            className="absolute inset-x-0 border-t border-neutral-200"
                            style={{ top: `calc(var(--slot) * ${i * 2})` }}
                        />
                    ))}
                </div>

                {/* 시간 라벨: 가로선 높이에 맞춘다 */}
                <div aria-hidden className="relative h-[calc(var(--slot)*30)]">
                    {hours.map((hour, i) => (
                        <span
                            key={hour}
                            className="absolute right-1.5 -translate-y-1/2 text-[11px] leading-none text-neutral-400 md:right-2.5 md:text-xs"
                            style={{ top: `calc(var(--slot) * ${i * 2})` }}
                        >
                            {hour}
                        </span>
                    ))}
                </div>

                {week.map((events, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            'relative h-[calc(var(--slot)*30)]',
                            idx === todayIdx && 'bg-blue-50/70',
                        )}
                    >
                        {events.map((event) => (
                            <EventBlock
                                key={event.id}
                                event={event}
                                onClick={() => onClickEvent(event)}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

interface EventBlockProps {
    event: WithLane<CalendarEvent>;
    onClick: () => void;
}

function EventBlock({ event, onClick }: EventBlockProps) {
    const { name, color, isEvent, status, startTime, endTime, lane, lanes } = event;
    const slots = endTime - startTime + 1;
    const skipped = status === 'skipped';
    const time = formatSlotRange(startTime, endTime);
    const showTime = slots >= TIME_MIN_SLOTS;

    const style: CSSProperties = {
        top: `calc(var(--slot) * ${startTime} + 1px)`,
        height: `calc(var(--slot) * ${slots} - 2px)`,
        left: `calc(${lane} * 100% / ${lanes} + 1px)`,
        width: `calc(100% / ${lanes} - 2px)`,
    };
    if (skipped) {
        style.borderColor = color;
        style.color = color;
    } else {
        style.backgroundColor = color;
        if (isEvent) style.backgroundImage = EVENT_STRIPES;
    }

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`${name} ${time}${skipped ? ' 이번 주 쉼' : ''}`}
            className={cn(
                '@container absolute flex flex-col overflow-hidden rounded-md px-[3px] py-0.5 text-left md:px-1.5 md:py-1',
                skipped ? 'border-[1.5px] border-dashed bg-white' : 'text-white',
            )}
            style={style}
        >
            {/* 폭이 20px보다 좁으면(모바일에서 3개 이상 겹침 등) 글씨 없이 색 띠만 */}
            <span
                className={cn(
                    'text-[11px] leading-[1.25] font-medium wrap-anywhere @max-[20px]:hidden md:text-xs',
                    slots === 1 ? 'line-clamp-1' : slots === 2 ? 'line-clamp-2' : 'line-clamp-3',
                    // 시간을 보여줄 만큼 넓으면 이름 한 줄 + 둘째 줄에 시간
                    showTime && '@min-[72px]:line-clamp-1',
                    skipped && 'line-through',
                )}
            >
                {name}
            </span>
            {showTime && (
                <span className="hidden text-[10px] leading-[1.25] opacity-90 @min-[72px]:block md:text-[11px]">
                    {time}
                </span>
            )}
        </button>
    );
}

export default WeekCalendar;
