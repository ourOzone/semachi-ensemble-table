import type { CSSProperties, MouseEvent } from 'react';
import type { Dayjs } from 'dayjs';
import { days, hours, idx2hour } from '@/constants';
import { formatSlotRange, type CalendarEvent, type WithLane } from '@/lib/calendar';
import { cn } from '@/lib/utils';
import type { DayIndex, TimeSlot } from '@/types';

// 주 단위 캘린더 (View 개편 V-2). 가로선만 있는 흰 바탕 표에 합주를 시간 길이만큼의 블록으로 그린다.
// 시간칸(30분) 하나의 높이는 --slot (모바일 22px, PC 30px). 블록 위치·높이는 --slot의 배수다.

const SLOT_COUNT = 30; // 09:00 ~ 24:00, 30분 단위

/** 아주 옅은 회색 바탕을 까는 요일 (화·목·토: 월 0 기준) */
const ALT_DAYS: readonly number[] = [1, 3, 5];

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
    /** 시간칸을 누름: 빈 칸, 또는 이름이 안 보이는 곳(3개 이상 겹침, 1024px 미만)의 블록 (Board가 resolveSlotTap으로 처리) */
    onClickSlot: (day: DayIndex, slot: TimeSlot) => void;
}

/** 3개 이상 겹친 블록에 이름이 보이는 폭 (EventBlock의 max-lg:hidden과 같은 기준, Tailwind lg) */
const NAMES_VISIBLE_QUERY = '(min-width: 64rem)';

/** 블록 안에서 누른 위치의 시간칸. 위치를 알 수 없으면(키보드·테스트 환경) 블록의 첫 칸 */
function slotAtPointer(
    e: MouseEvent<HTMLElement>,
    { startTime, endTime }: CalendarEvent,
): TimeSlot {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.height <= 0) return startTime;
    const slots = endTime - startTime + 1;
    const offset = Math.floor(((e.clientY - rect.top) / rect.height) * slots);
    return startTime + Math.min(slots - 1, Math.max(0, offset));
}

const WeekCalendar = ({
    week,
    weekStart,
    todayIdx,
    direction,
    onClickEvent,
    onClickSlot,
}: WeekCalendarProps) => {
    // 이름이 안 보이는 좁은 화면에서 3개 이상 겹친 블록을 누르면, 누른 시간에 겹친 합주를 보여준다 (마우스·터치로 누른 경우만)
    const handleBlockClick = (
        e: MouseEvent<HTMLElement>,
        day: DayIndex,
        event: WithLane<CalendarEvent>,
    ) => {
        if (event.lanes >= 3 && e.detail > 0 && !window.matchMedia(NAMES_VISIBLE_QUERY).matches) {
            onClickSlot(day, slotAtPointer(e, event));
            return;
        }
        onClickEvent(event);
    };

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
                            // 요일을 크게, 날짜는 작게 (24차, 이전: 날짜를 크게). 오늘은 요일을 원으로
                            <div
                                key={label}
                                className="flex flex-col items-center gap-0.5"
                                aria-current={isToday ? 'date' : undefined}
                            >
                                <span
                                    className={cn(
                                        'flex size-7 items-center justify-center rounded-full text-[15px] font-bold text-neutral-900 md:size-9 md:text-xl',
                                        isToday && 'bg-today text-white',
                                    )}
                                >
                                    {label}
                                </span>
                                <span
                                    className={cn(
                                        'text-xs text-neutral-500 tabular-nums md:text-sm',
                                        isToday && 'font-bold text-today',
                                    )}
                                >
                                    {weekStart.add(idx, 'day').date()}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* 본문: 시간 라벨 + 요일 7칸 */}
                <div className="relative grid grid-cols-[var(--hour-col)_repeat(7,minmax(0,1fr))] pt-2 pb-2">
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
                        {/* 맨 아래 24는 기능은 없지만 표의 끝을 보여준다 */}
                        {[...hours, '24'].map((hour, i) => (
                            <span
                                key={hour}
                                className="absolute right-1.5 -translate-y-1/2 text-[11px] leading-none text-neutral-400 md:right-3 md:text-[13px]"
                                style={{ top: `calc(var(--slot) * ${i * 2})` }}
                            >
                                {hour}
                            </span>
                        ))}
                    </div>

                    {week.map((events, idx) => {
                        const date = weekStart.add(idx, 'day');
                        // 지난 요일은 합주를 잡을 수 없으므로 빈 칸을 누를 수 없다
                        const isPast = todayIdx !== null && idx < todayIdx;
                        return (
                            <div
                                key={idx}
                                className={cn(
                                    'relative h-[calc(var(--slot)*30)]',
                                    // 오늘 열이 화·목·토여도 오늘 표시가 우선
                                    idx === todayIdx
                                        ? 'bg-today-tint'
                                        : ALT_DAYS.includes(idx) && 'bg-day-alt',
                                )}
                            >
                                {/* 시간칸(30분): 마우스를 올리면 옅은 회색, 누르면 합주 잡기 Drawer. 블록 아래에 깔린다 */}
                                {!isPast &&
                                    Array.from({ length: SLOT_COUNT }, (_, slot) => (
                                        <button
                                            key={slot}
                                            type="button"
                                            tabIndex={-1}
                                            aria-label={`${date.month() + 1}월 ${date.date()}일 ${days[idx]} ${idx2hour[slot]}`}
                                            className="absolute inset-x-0 transition-colors duration-100 hover:bg-neutral-900/[0.05]"
                                            style={{
                                                top: `calc(var(--slot) * ${slot})`,
                                                height: 'var(--slot)',
                                            }}
                                            onClick={() => onClickSlot(idx, slot)}
                                        />
                                    ))}
                                {events.map((event) => (
                                    <EventBlock
                                        key={event.id}
                                        event={event}
                                        onClick={(e) => handleBlockClick(e, idx, event)}
                                    />
                                ))}
                            </div>
                        );
                    })}
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
    onClick: (e: MouseEvent<HTMLElement>) => void;
}

function EventBlock({ event, onClick }: EventBlockProps) {
    const { name, color, isEvent, status, startTime, endTime, lane, lanes } = event;
    const slots = endTime - startTime + 1;
    const skipped = status === 'skipped';
    const time = formatSlotRange(startTime, endTime);
    // 점선(이번 주엔 없음) 블록은 시간 대신 다음 합주 날짜: 반복 "12/4~", 일회성 "12/4"
    const dateLabel = skipped
        ? `${event.nextDate.month() + 1}/${event.nextDate.date()}${event.repeat ? '~' : ''}`
        : null;
    const showTime = slots >= TIME_MIN_SLOTS;
    // 시간은 PC에서 항상 보이게 자리를 먼저 잡는다. 겹쳐서 폭이 좁으면 두 줄로 나뉠 수 있어 두 줄을 잡는다
    const timeLines = lanes >= 2 && !dateLabel ? 2 : 1; // 날짜는 짧아 한 줄
    const timeHeight = showTime ? SIZE.pc.time * TIME_LINE_HEIGHT * timeLines + 2 : 0;
    // 점선 블록의 날짜는 모바일에서도 보이므로 모바일 이름 줄에서도 자리를 뺀다 (10px 한 줄)
    const mobileDateHeight = showTime && dateLabel ? 9 * TIME_LINE_HEIGHT + 2 : 0;

    const style: CSSProperties & Record<`--${string}`, string> = {
        top: `calc(var(--slot) * ${startTime} + 1px)`,
        height: `calc(var(--slot) * ${slots} - 2px)`,
        left: `calc(${lane} * 100% / ${lanes} + 1px)`,
        width: `calc(100% / ${lanes} - 2px)`,
        '--name-lines': String(nameLines(slots, SIZE.mobile, mobileDateHeight)),
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
                '@container squircle absolute flex flex-col overflow-hidden rounded-md px-0.5 py-0.5 text-left transition-[filter,background-color] duration-150 md:rounded-lg md:py-1',
                // 스쿼클이면 반지름을 키워 일반 둥근 모서리와 비슷한 크기로 보이게
                'supports-[corner-shape:squircle]:rounded-[11px] md:supports-[corner-shape:squircle]:rounded-[15px]',
                // 3개 이상 겹치면 폭이 좁아 PC에서도 좌우 여백을 줄인다 (시간 글자가 잘리지 않게)
                lanes >= 3 ? 'md:px-0.5' : 'md:px-1.5',
                // 쉼: 바탕을 비워 뒤의 가로선이 보이게
                // 마우스를 올리면: 색 블록은 살짝 진하게, 쉼(바탕 없음)은 옅은 회색 바탕
                skipped
                    ? 'border-[1.5px] border-dashed bg-transparent hover:bg-neutral-500/5'
                    : 'text-white hover:brightness-90',
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
                )}
            >
                {name}
            </span>
            {/*
              시간 (PC): 한 줄에 들어가면 "18:00–20:00", 안 들어가면 언제나 시작·끝을 두 줄로 쌓는다 (하이픈 없이).
              이전에는 저절로 줄바꿈될 때 "18:00–" / "20:00", 아주 좁을 때 "18:00" / "20:00"로 하이픈이 들쭉날쭉했다.
              76px = 11px 글씨로 가장 긴 "HH:MM–HH:MM"의 폭 (NanumSquare Neo, Chrome 측정). 56px 이하는 글씨를 10px로
              점선 블록은 시간 대신 날짜 (dateLabel). 날짜는 짧아서 모바일에서도 보인다. 모바일은 줄바꿈하지 않는다:
              9px·자간 -0.025em으로 가장 긴 "12/31~"이 31.6px (390px 화면 한 칸 안쪽 폭 약 35px), 그보다 좁으면 8.5px(29.8px),
              그것도 안 들어가면(두 개 겹친 칸 등) 날짜를 숨기고 이름만
              자리는 이름보다 먼저 잡는다 (--name-lines-md 계산에서 시간 두 줄 몫을 뺌)
            */}
            {showTime && (
                <span
                    className={cn(
                        'mt-0.5 hidden shrink-0 text-[11px] leading-[1.3] opacity-90',
                        // 3개 이상 겹치면 1024px 이상에서만 (그보다 좁으면 이름처럼 색 띠만).
                        // 시간은 PC에서만, 점선 블록의 날짜는 모바일에서도
                        lanes >= 3 ? 'lg:block' : dateLabel ? 'block' : 'md:block',
                        dateLabel &&
                            'text-[9px] tracking-[-0.025em] whitespace-nowrap max-md:@max-[32px]:text-[8.5px] max-md:@max-[30px]:hidden md:text-[11px] md:tracking-normal md:whitespace-normal md:wrap-anywhere',
                    )}
                >
                    {dateLabel ?? (
                        <>
                            <span className="whitespace-nowrap @max-[76px]:hidden">{time}</span>
                            <span
                                className="hidden @max-[76px]:block @max-[56px]:text-[10px]"
                                aria-hidden
                            >
                                {idx2hour[startTime]}
                                <br />
                                {idx2hour[endTime + 1]}
                            </span>
                        </>
                    )}
                </span>
            )}
        </button>
    );
}

export default WeekCalendar;
