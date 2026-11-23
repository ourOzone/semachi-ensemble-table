import type { CSSProperties } from 'react';
import type { Dayjs } from 'dayjs';
import { days, hours, idx2hour } from '@/constants';
import { formatSlotRange, type CalendarEvent, type WithLane } from '@/lib/calendar';
import { cn } from '@/lib/utils';

// 주 단위 캘린더 (View 개편 V-2). 가로선만 있는 흰 바탕 표에 합주를 시간 길이만큼의 블록으로 그린다.
// 시간칸(30분) 하나의 높이는 --slot (모바일 22px, PC 30px). 블록 위치·높이는 --slot의 배수다.

const SLOT_COUNT = 30; // 09:00 ~ 24:00, 30분 단위

// 블록 글씨 크기 (px). 줄 수 계산에 쓰므로 아래 클래스와 맞춘다
const SIZE = {
    mobile: { slot: 22, padY: 2, name: 11 },
    pc: { slot: 30, padY: 4, name: 14, time: 11 },
} as const;
// 이름 줄 간격. 줄 사이에 여유를 두어, 잘리는 다음 줄 글자의 윗부분이 비치지 않게 한다 (아래 NAME_CLIP_MARGIN)
const NAME_LINE_HEIGHT = 1.4;
const TIME_LINE_HEIGHT = 1.3;
const MAX_NAME_LINES = 3;

/** 시간 표시는 1시간(2칸) 이상인 블록에만, PC에서만 (30분 블록은 이름 한 줄 높이뿐, 모바일은 폭이 좁다) */
const TIME_MIN_SLOTS = 2;

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
    /** 주를 바꿀 때 들어오는 방향 (애니메이션). 처음 그릴 때는 null */
    direction: 'prev' | 'next' | null;
    onClickEvent: (event: CalendarEvent) => void;
}

const WeekCalendar = ({
    week,
    weekStart,
    todayIdx,
    direction,
    onClickEvent,
}: WeekCalendarProps) => {
    return (
        <div className="mt-3 overflow-hidden [--hour-col:28px] [--slot:22px] md:mt-4 md:[--hour-col:44px] md:[--slot:30px]">
            {/* 주가 바뀌면 새로 그려지며(key) 옆에서 살짝 밀려 들어온다. 투명도는 바꾸지 않는다 (흰색으로 깜빡임) */}
            <div
                key={weekStart.valueOf()}
                className={cn(
                    direction && 'duration-200 ease-out motion-safe:animate-in',
                    direction === 'next' && 'motion-safe:slide-in-from-right-4',
                    direction === 'prev' && 'motion-safe:slide-in-from-left-4',
                )}
            >
                {/* 요일 머리글 */}
                <div className="grid grid-cols-[var(--hour-col)_repeat(7,minmax(0,1fr))] pb-2 md:pb-3">
                    <div />
                    {days.map((label, idx) => {
                        const isToday = idx === todayIdx;
                        return (
                            <div key={label} className="flex flex-col items-center gap-1">
                                <span
                                    className={cn(
                                        'text-xs text-neutral-500 md:text-sm',
                                        isToday && 'font-bold text-today',
                                    )}
                                >
                                    {label}
                                </span>
                                <span
                                    className={cn(
                                        'flex size-7 items-center justify-center rounded-full text-[15px] font-bold text-neutral-900 md:size-9 md:text-xl',
                                        isToday && 'bg-today text-white',
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
                                className="absolute right-1.5 -translate-y-1/2 text-[11px] leading-none text-neutral-400 md:right-3 md:text-[13px]"
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
                                idx === todayIdx && 'bg-today-tint',
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
        </div>
    );
};

/** 블록 높이에 들어가는 이름 줄 수 (1 ~ 3). 넘치는 글씨는 말줄임 없이 잘린다 */
function nameLines(
    slots: number,
    size: { slot: number; padY: number; name: number },
    reserved = 0,
) {
    const available = size.slot * slots - 2 - size.padY * 2 - reserved;
    const lines = Math.floor(available / (size.name * NAME_LINE_HEIGHT));
    return Math.max(1, Math.min(MAX_NAME_LINES, lines));
}

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
    // 시간은 PC에서 항상 보이게 자리를 먼저 잡는다. 겹쳐서 폭이 좁으면 두 줄로 나뉠 수 있어 두 줄을 잡는다
    const timeLines = lanes >= 2 ? 2 : 1;
    const timeHeight = showTime ? SIZE.pc.time * TIME_LINE_HEIGHT * timeLines + 2 : 0;

    const style: CSSProperties & Record<`--${string}`, string> = {
        top: `calc(var(--slot) * ${startTime} + 1px)`,
        height: `calc(var(--slot) * ${slots} - 2px)`,
        left: `calc(${lane} * 100% / ${lanes} + 1px)`,
        width: `calc(100% / ${lanes} - 2px)`,
        '--name-lines': String(nameLines(slots, SIZE.mobile)),
        '--name-lines-md': String(nameLines(slots, SIZE.pc, timeHeight)),
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
                '@container absolute flex flex-col overflow-hidden rounded-md px-0.5 py-0.5 text-left md:rounded-lg md:py-1',
                // 3개 이상 겹치면 폭이 좁아 PC에서도 좌우 여백을 줄인다 (시간 글자가 잘리지 않게)
                lanes >= 3 ? 'md:px-0.5' : 'md:px-1.5',
                // 쉼: 바탕을 비워 뒤의 가로선이 보이게
                skipped ? 'border-[1.5px] border-dashed bg-transparent' : 'text-white',
            )}
            style={style}
        >
            {/* 이름: 블록 높이만큼의 줄까지만 (말줄임표 없이 잘림) */}
            <span
                className={cn(
                    // 줄 단위로 자르되, 끝을 0.15em 위로 당겨 다음 줄 글자 윗부분이 보이지 않게 (기기마다 픽셀 반올림이 달라도 여유)
                    'max-h-[calc(var(--name-lines)*1.4em-0.15em)] shrink-0 overflow-hidden text-[11px] leading-[1.4] font-medium wrap-anywhere md:max-h-[calc(var(--name-lines-md)*1.4em-0.15em)] md:text-sm',
                    // 3개 이상 겹치면 1024px 미만(모바일·태블릿)에서는 폭이 20px 안팎이라 색 띠만
                    lanes >= 3 && 'max-lg:hidden',
                    skipped && 'line-through',
                )}
            >
                {name}
            </span>
            {/*
              시간 (PC): 넓으면 "18:00–20:00"(좁으면 두 줄로 나뉨), 겹쳐서 아주 좁으면 시작·끝을 두 줄로 쌓아 잘리지 않게.
              자리는 이름보다 먼저 잡는다 (--name-lines-md 계산에서 시간 두 줄 몫을 뺌)
            */}
            {showTime && (
                <span
                    className={cn(
                        'mt-0.5 hidden shrink-0 text-[11px] leading-[1.3] opacity-90',
                        // 3개 이상 겹치면 1024px 이상에서만 (그보다 좁으면 이름처럼 색 띠만)
                        lanes >= 3 ? 'lg:block' : 'md:block',
                    )}
                >
                    <span className="@max-[56px]:hidden">{time}</span>
                    <span className="hidden text-[10px] @max-[56px]:block" aria-hidden>
                        {idx2hour[startTime]}
                        <br />
                        {idx2hour[endTime + 1]}
                    </span>
                </span>
            )}
        </button>
    );
}

export default WeekCalendar;
