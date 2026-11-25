import type { CSSProperties, MouseEvent } from 'react';
import type { Dayjs } from 'dayjs';
import { days, hours, idx2hour } from '@/constants';
import {
    formatSlotRange,
    type BoardDay,
    type BoardView,
    type CalendarEvent,
    type WithLane,
} from '@/lib/calendar';
import { EVENT_STRIPES } from '@/styles/patterns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getTodayIdx } from '@/lib/week';
import type { TimeSlot } from '@/types';

// 주 단위 캘린더 (View 개편 V-2). 가로선만 있는 흰 바탕 표에 합주를 시간 길이만큼의 블록으로 그린다.
// 열은 날짜 7개 (26차부터: 오늘부터 7일 / 요일 고정 / 일~토 한 주. lib/calendar의 getBoardDays). 지난 날짜는 없다.
// 시간칸(30분) 하나의 높이는 --slot (모바일 22px, PC 30px). 블록 위치·높이는 --slot의 배수다.

const SLOT_COUNT = 30; // 09:00 ~ 24:00, 30분 단위

/**
 * 아주 옅은 회색 바탕을 까는 열: 왼쪽부터 1·3·5·7번째 (28차, 이전: 화·목·토 요일 기준).
 * 보기 방식(오늘부터·요일 고정)과 관계없이 열 위치로 정해 줄을 눈으로 따라가기 쉽게
 */
const isAltColumn = (column: number) => column % 2 === 0;

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

/**
 * 마지막 합주 표시: 블록 맨 아래 가운데에 입장권처럼 반원 구멍 (25차 일회성, 32차부터 반복 합주의 반복 종료 전 마지막 날도).
 * 어느 블록이 마지막인지는 lib/calendar의 isLastOccurrence. 반지름은 --notch (모바일 3px·PC 3.5px, 27차에 작은 쪽으로 통일).
 * 마스크로 블록(바탕·테두리)을 그 모양만큼 비운다. 점선 블록은 비운 자리에 반원 점선 테두리를 따로 그린다 (NotchOutline)
 */
const LAST_NOTCH =
    'radial-gradient(circle at 50% 100%, transparent var(--notch), #000 calc(var(--notch) + 0.5px))';

/** 불러오는 동안 열마다 보여줄 회색 상자 자리 [시작 칸, 끝 칸] (실제 합주처럼 보이게 흩어 둠) */
const SKELETON_BLOCKS: readonly (readonly [number, number])[][] = [
    [
        [2, 5],
        [12, 15],
    ],
    [[4, 7]],
    [
        [1, 3],
        [9, 12],
    ],
    [[6, 9]],
    [
        [3, 6],
        [14, 17],
    ],
    [[8, 11]],
    [
        [2, 4],
        [10, 12],
    ],
];

interface WeekCalendarProps {
    /** 열마다 날짜 (왼쪽부터) */
    days: BoardDay[];
    /** [열][그날 보이는 합주] */
    columns: WithLane<CalendarEvent>[][];
    today: Dayjs;
    /** 보기 방식이 바뀌면 새로 그린다 */
    view: BoardView;
    /** 주를 바꿀 때 들어오는 방향 (애니메이션). 처음 그릴 때는 null */
    direction: 'prev' | 'next' | null;
    /** 블록을 누름 (date: 그 블록이 있는 열의 날짜) */
    onClickEvent: (event: CalendarEvent, date: Dayjs) => void;
    /** 시간칸을 누름 (column: 열 번호): 빈 칸, 또는 이름이 안 보이는 곳(3개 이상 겹침, 1024px 미만)의 블록 (Board가 resolveSlotTap으로 처리) */
    onClickSlot: (column: number, slot: TimeSlot) => void;
    /** 처음 불러오는 중: 합주 대신 회색 상자, 시간칸은 누를 수 없다 (V-3 1차) */
    loading?: boolean;
}

/** 요일 색 (27차): 토요일 파랑, 일요일 빨강 (합주 잡기 달력과 같음). 오늘 표시의 원·날짜도 이 색 */
function weekendColor(date: Dayjs): { text: string; today: string; todayText: string } | null {
    if (date.day() === 6)
        return { text: 'text-blue-600', today: 'bg-blue-600', todayText: 'text-blue-600' };
    if (date.day() === 0)
        return { text: 'text-red-500', today: 'bg-red-500', todayText: 'text-red-500' };
    return null;
}

/** 날짜 표시: 보통 "25", 달의 첫날은 "12/1" (달이 바뀌는 곳을 알 수 있게) */
const dayLabel = (date: Dayjs) =>
    date.date() === 1 ? `${date.month() + 1}/${date.date()}` : String(date.date());

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
    days: boardDays,
    columns,
    today,
    view,
    direction,
    onClickEvent,
    onClickSlot,
    loading = false,
}: WeekCalendarProps) => {
    // 이름이 안 보이는 좁은 화면에서 3개 이상 겹친 블록을 누르면, 누른 시간에 겹친 합주를 보여준다 (마우스·터치로 누른 경우만)
    const handleBlockClick = (
        e: MouseEvent<HTMLElement>,
        column: number,
        event: WithLane<CalendarEvent>,
    ) => {
        if (event.lanes >= 3 && e.detail > 0 && !window.matchMedia(NAMES_VISIBLE_QUERY).matches) {
            onClickSlot(column, slotAtPointer(e, event));
            return;
        }
        onClickEvent(event, boardDays[column]!.date);
    };

    return (
        <div
            aria-busy={loading}
            className="mt-3 overflow-hidden [--hour-col:28px] [--slot:22px] md:mt-4 md:[--hour-col:44px] md:[--slot:30px]"
        >
            {/* 주가 바뀌면 새로 그려지며(key) 옆에서 살짝 밀려 들어온다. 투명도는 바꾸지 않는다 (흰색으로 깜빡임) */}
            <div
                key={`${view}-${boardDays[0]!.date.valueOf()}`}
                className={cn(
                    direction && 'duration-200 ease-out motion-safe:animate-in',
                    direction === 'next' && 'motion-safe:slide-in-from-right-4',
                    direction === 'prev' && 'motion-safe:slide-in-from-left-4',
                )}
            >
                {/* 요일 머리글. 아래 여백은 늘 자리를 잡는 "다음주" 줄이 대신한다 (29차, 이전: pb-2·PC pb-3) */}
                <div className="grid grid-cols-[var(--hour-col)_repeat(7,minmax(0,1fr))] md:pb-0.5">
                    <div />
                    {boardDays.map(({ date, nextWeek }) => {
                        const isToday = date.isSame(today, 'day');
                        const weekend = weekendColor(date);
                        return (
                            // 요일을 크게, 날짜는 작게 (24차, 이전: 날짜를 크게). 오늘은 요일을 원으로
                            <div
                                key={date.valueOf()}
                                className="flex flex-col items-center gap-0.5"
                                data-board-day
                                aria-current={isToday ? 'date' : undefined}
                            >
                                <span
                                    className={cn(
                                        'flex size-7 items-center justify-center rounded-full text-[15px] font-bold md:size-9 md:text-xl',
                                        isToday
                                            ? cn(weekend?.today ?? 'bg-today', 'text-white')
                                            : (weekend?.text ?? 'text-neutral-900'),
                                    )}
                                >
                                    {days[getTodayIdx(date)]}
                                </span>
                                <span
                                    className={cn(
                                        'text-xs whitespace-nowrap text-neutral-500 tabular-nums md:text-sm',
                                        isToday &&
                                            cn('font-bold', weekend?.todayText ?? 'text-today'),
                                    )}
                                >
                                    {dayLabel(date)}
                                </span>
                                {/*
                                  요일 고정 보기: 지난 요일 대신 들어간 다음 주 날짜에 "다음주".
                                  자리는 늘 잡아 둔다 (28차, 이전: 그 글자가 있는 화면에서만 줄이 생겨 주를 넘길 때마다 시간표가 오르내렸다)
                                */}
                                <span className="h-3.5 text-[10px] leading-3.5 whitespace-nowrap text-neutral-400 md:h-4 md:text-[11px] md:leading-4">
                                    {nextWeek && '다음주'}
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

                    {columns.map((events, column) => {
                        const date = boardDays[column]!.date;
                        return (
                            <div
                                key={date.valueOf()}
                                className={cn(
                                    'relative h-[calc(var(--slot)*30)]',
                                    // 오늘 열이 회색 열이어도 오늘 표시가 우선
                                    date.isSame(today, 'day')
                                        ? 'bg-today-tint'
                                        : isAltColumn(column) && 'bg-day-alt',
                                )}
                            >
                                {/* 불러오는 중: 열마다 정해 둔 자리에 회색 상자 */}
                                {loading &&
                                    (SKELETON_BLOCKS[column] ?? []).map(([start, end]) => (
                                        <Skeleton
                                            key={start}
                                            className="absolute inset-x-[3px] rounded-md md:rounded-lg"
                                            style={{
                                                top: `calc(var(--slot) * ${start} + 1px)`,
                                                height: `calc(var(--slot) * ${end - start + 1} - 2px)`,
                                            }}
                                        />
                                    ))}
                                {/* 시간칸(30분): 마우스를 올리면 옅은 회색, 누르면 합주 잡기 Drawer. 블록 아래에 깔린다 */}
                                {!loading &&
                                    Array.from({ length: SLOT_COUNT }, (_, slot) => (
                                        <button
                                            key={slot}
                                            type="button"
                                            tabIndex={-1}
                                            aria-label={`${date.month() + 1}월 ${date.date()}일 ${days[getTodayIdx(date)]} ${idx2hour[slot]}`}
                                            className="absolute inset-x-0 transition-colors duration-100 hover:bg-neutral-900/[0.05]"
                                            style={{
                                                top: `calc(var(--slot) * ${slot})`,
                                                height: 'var(--slot)',
                                            }}
                                            onClick={() => onClickSlot(column, slot)}
                                        />
                                    ))}
                                {events.map((event) => (
                                    <EventBlock
                                        key={event.id}
                                        event={event}
                                        onClick={(e) => handleBlockClick(e, column, event)}
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
    if (event.last) {
        style.maskImage = LAST_NOTCH;
        style.WebkitMaskImage = LAST_NOTCH;
    }

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`${name} ${time}${skipped ? ' 이번 주 쉼' : ''}`}
            data-last={event.last ? '' : undefined}
            className={cn(
                // 구멍 반지름 (모든 길이 같음). 점선 블록은 둘레에 반원 테두리를 그려 같은 크기여도 더 커 보여
                // 구멍을 0.5px 줄인다 (28차: 테두리 바깥 반지름이 실선 블록의 구멍보다 1px 남짓 컸다)
                event.last &&
                    (skipped
                        ? '[--notch:2.5px] md:[--notch:3px]'
                        : '[--notch:3px] md:[--notch:3.5px]'),
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
            {/* 점선 블록의 구멍: 둘레에 반원 테두리 (마스크가 아래 테두리를 끊은 자리를 잇는다) */}
            {event.last && skipped && <NotchOutline />}
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

/**
 * 점선 블록의 구멍 테두리: 블록 아래 끝에 중심을 둔 원(바깥 반지름 = 구멍 + 테두리 두께)의 점선 테두리.
 * 원의 안쪽은 마스크로 비워진 구멍과 같고, 테두리 고리는 구멍 바로 바깥이라 보인다.
 * 아래 절반은 블록 밖이라 잘려(overflow-hidden) 위쪽 반원만 남는다. 색은 블록 테두리 색(currentColor).
 * 점선이 아니라 실선: 둘레가 10px 남짓이라 점선 무늬가 한두 조각으로 끊겨 보이고(Chrome), 사파리(WebKit)는 거의 다 빈칸으로 그렸다
 */
function NotchOutline() {
    return (
        <span
            aria-hidden
            data-notch-outline
            className="pointer-events-none absolute bottom-0 left-1/2 size-[calc(var(--notch)*2+3px)] -translate-x-1/2 translate-y-1/2 rounded-full border-[1.5px] border-solid border-current"
        />
    );
}

export default WeekCalendar;
