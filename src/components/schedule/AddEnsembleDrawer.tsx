import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { ko } from 'react-day-picker/locale';
import {
    CalendarCheck,
    CalendarDays,
    Check,
    ChevronDown,
    Minus,
    OctagonAlert,
    Plus,
    Repeat,
    TriangleAlert,
    X,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerTitle,
} from '@/components/ui/drawer';
import { days, idx2hour } from '@/constants';
import { buildColorMap } from '@/lib/board';
import {
    eventsOnDate,
    findOverlapLimit,
    MAX_OVERLAP,
    overlapping,
    type CalendarEvent,
    type SlotRange,
    type WithLane,
} from '@/lib/calendar';
import { cn } from '@/lib/utils';
import { getTodayIdx } from '@/lib/week';
import { ensemblesQueryOptions } from '@/queries/ensembles';
import { useTeams } from '@/queries/teams';
import { useDrawerStore } from '@/stores/drawer';
import type { TimeSlot } from '@/types';
import { useAddEnsembleStore, type AddEnsemblePreset } from './addEnsembleStore';
import {
    boxShape,
    formatDate,
    formatSlots,
    formatTimeRange,
    overlayClassName,
    pressable,
    scrollAreaClassName,
    sheetClassName,
} from './drawerParts';

// 합주 잡기 Drawer (View 개편 V-2 21차). 옛 합주 추가 4단계(반복 여부 → 달력 → 시간 → 완료 화면)를 Drawer 하나로 합쳤다.
// 입력: 팀 → 반복 여부 → 날짜 → 시작 시간·소요 시간. PIN은 받지 않는다 (옛 흐름도 받지 않았다).
// - 팀 정보·소모임 정보에서 열면 팀이 골라져 있고 날짜·시간을 고른다
// - 합주판(빈 시간·겹친 합주 목록·합주 정보)에서 열면 날짜·시작 시간이 채워져 있고 팀을 고른다
// - 소요 시간은 2시간으로 시작한다 (30분·1시간·2시간·직접 입력)
// - 그날 동방에 잡힌 합주를 가로 막대로 보여주고, 겹치면 알린다. 한 시간에 MAX_OVERLAP개가 넘게 겹치면 잡을 수 없다
// 입력값은 이 Drawer의 로컬 상태다 (열 때마다 addEnsembleStore의 미리 채울 값으로 새로 시작).

/** 팀 고르기 목록의 한 항목 (팀 또는 소모임·일정) */
export interface TeamOption {
    id: string;
    name: string;
    color: string;
    /** 소모임·회의 등 팀 아닌 일정 */
    isEvent: boolean;
}

export interface AddEnsembleInput {
    team: TeamOption;
    repeat: boolean;
    /** 합주 날짜 (반복이면 시작 날짜), 0시 */
    date: Dayjs;
    startTime: TimeSlot;
    endTime: TimeSlot;
}

interface AddEnsembleDrawerProps {
    teams: TeamOption[];
    events: TeamOption[];
    /** 저장. 성공하면 true (Drawer는 호출한 쪽이 닫는다), 실패하면 false (입력을 그대로 두고 다시 누를 수 있다) */
    onSubmit: (input: AddEnsembleInput) => Promise<boolean>;
}

/** 시간칸 수 (09:00 ~ 24:00, 30분 단위) */
const SLOT_COUNT = 30;
/** 소요 시간 기본값: 2시간 */
const DEFAULT_DURATION = 4;
const DURATION_CHIPS = [1, 2, 4] as const;

/** "11월 26일 목요일" */
const formatLongDate = (date: Dayjs) =>
    `${date.month() + 1}월 ${date.date()}일 ${days[getTodayIdx(date)]}요일`;

const AddEnsembleDrawer = ({ teams, events, onSubmit }: AddEnsembleDrawerProps) => {
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);
    const setOpenedDrawers = useDrawerStore((state) => state.setOpenedDrawers);
    const closeAllDrawers = useDrawerStore((state) => state.closeAllDrawers);
    const session = useAddEnsembleStore((state) => state.session);
    const preset = useAddEnsembleStore((state) => state.preset);
    const open = openedDrawers[openedDrawers.length - 1] === 'addEnsemble';

    // 저장하지 않고 닫으면 연 곳(팀 정보 등)으로 돌아간다. 저장에 성공하면 호출한 쪽이 모두 닫는다
    const handleClose = () => {
        if (preset.returnTo) setOpenedDrawers([preset.returnTo]);
        else closeAllDrawers();
    };

    return (
        <Drawer open={open} onOpenChange={(next) => !next && handleClose()}>
            <DrawerContent
                className={sheetClassName}
                overlayClassName={overlayClassName}
                handleClassName="absolute inset-x-0 top-2.5 z-10 mt-0 w-10 bg-neutral-300"
            >
                {/* 열 때마다(session) 입력을 새로 시작한다. 닫히는 동안은 마지막 입력이 그대로 보인다 */}
                {session > 0 && (
                    <AddEnsembleForm
                        key={session}
                        preset={preset}
                        teams={teams}
                        events={events}
                        onSubmit={onSubmit}
                    />
                )}
            </DrawerContent>
        </Drawer>
    );
};

interface AddEnsembleFormProps extends AddEnsembleDrawerProps {
    preset: AddEnsemblePreset;
}

const AddEnsembleForm = ({ preset, teams, events, onSubmit }: AddEnsembleFormProps) => {
    const [teamId, setTeamId] = useState<string | null>(preset.teamId ?? null);
    const team = [...teams, ...events].find((option) => option.id === teamId) ?? null;
    const [teamOpen, setTeamOpen] = useState(team === null);
    const [repeat, setRepeat] = useState<boolean | null>(null);
    const [date, setDate] = useState<Dayjs | null>(preset.date ?? null);
    const [dateOpen, setDateOpen] = useState(date === null);
    const [startTime, setStartTime] = useState<TimeSlot | null>(preset.startTime ?? null);
    // 소요 시간(시간칸 수). 24:00을 넘지 않게 시작 시간을 바꿀 때마다 줄인다
    const [duration, setDuration] = useState(
        Math.min(DEFAULT_DURATION, SLOT_COUNT - (preset.startTime ?? 0)),
    );
    const [customDuration, setCustomDuration] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const maxDuration = SLOT_COUNT - (startTime ?? 0);
    const range: SlotRange | null =
        startTime === null ? null : { startTime, endTime: startTime + duration - 1 };

    const pickStart = (slot: TimeSlot) => {
        setStartTime(slot);
        setDuration((prev) => Math.min(prev, SLOT_COUNT - slot));
    };

    // 그날 동방: 합주판과 같은 기준으로 그날 보이는 합주 (색은 팀의 지금 색)
    const allTeams = useTeams();
    const { data: ensembles = [] } = useQuery(ensemblesQueryOptions);
    const dayEvents = date ? eventsOnDate(ensembles, buildColorMap(allTeams), date, dayjs()) : [];
    const conflicts = range
        ? overlapping(
              dayEvents.filter((event) => event.status === 'normal'),
              range,
          )
        : [];
    // 반복 여부를 고르기 전에는 그날만 본다
    const limitDate =
        date && range
            ? findOverlapLimit(ensembles, { date, repeat: repeat ?? false, ...range })
            : null;

    const noun = team?.isEvent ? '일정' : '합주';
    const color = team?.color ?? '#18181b';
    const missing = !team
        ? '팀을 골라 주세요'
        : repeat === null
          ? '반복 여부를 골라 주세요'
          : !date
            ? '날짜를 골라 주세요'
            : startTime === null
              ? '시작 시간을 골라 주세요'
              : null;
    const ready = missing === null && limitDate === null && !submitting;

    const submit = async () => {
        if (!ready || !team || repeat === null || !date || !range) return;
        setSubmitting(true);
        // 실패하면 입력을 그대로 두고 다시 누를 수 있게 한다 (성공하면 Drawer가 닫힌다)
        if (!(await onSubmit({ team, repeat, date, ...range }))) setSubmitting(false);
    };

    return (
        <>
            <div className={cn(scrollAreaClassName, 'flex-1')}>
                {/* 머리 */}
                <div className="flex items-start justify-between gap-3 px-5 pt-[26px] md:px-7">
                    <div className="min-w-0">
                        <DrawerTitle className="text-[26px] leading-tight font-bold text-ink md:text-[28px]">
                            {noun} 잡기
                        </DrawerTitle>
                        <DrawerDescription className="mt-1.5 truncate text-[15px] text-neutral-500">
                            {date && range
                                ? `${formatLongDate(date)}${repeat ? '부터 매주' : ''} · ${formatTimeRange(range.startTime, range.endTime)}`
                                : '팀과 날짜, 시간을 골라 주세요'}
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

                <div className="flex flex-col gap-6 px-5 pt-6 pb-6 md:px-7">
                    {/* 팀 */}
                    <Section label="팀">
                        {team && !teamOpen ? (
                            <button
                                type="button"
                                aria-expanded={false}
                                className={`${pressable} ${boxShape} flex h-14 w-full items-center justify-between gap-3 border border-neutral-200 bg-white pr-3 pl-2 hover:bg-neutral-50`}
                                onClick={() => setTeamOpen(true)}
                            >
                                <span
                                    className="inline-flex min-w-0 items-center gap-1.5 rounded-full py-2 pr-4 pl-3 text-[16px] font-bold text-white"
                                    style={{ backgroundColor: team.color }}
                                >
                                    <Check className="size-4 shrink-0" aria-hidden />
                                    <span className="truncate">{team.name}</span>
                                </span>
                                <span className="flex shrink-0 items-center gap-0.5 text-[14px] text-neutral-500">
                                    바꾸기
                                    <ChevronDown className="size-4" aria-hidden />
                                </span>
                            </button>
                        ) : (
                            <TeamPicker
                                teams={teams}
                                events={events}
                                selectedId={teamId}
                                onSelect={(id) => {
                                    setTeamId(id);
                                    setTeamOpen(false);
                                }}
                            />
                        )}
                    </Section>

                    {/* 반복 여부 (옛 흐름: "매주 같은 타임에 할래요" / "하루만 할래요") */}
                    <Section label="반복">
                        <div
                            role="radiogroup"
                            aria-label="반복"
                            className="grid grid-cols-2 gap-1 rounded-2xl bg-neutral-100 p-1"
                        >
                            {(
                                [
                                    [true, '매주 반복', Repeat],
                                    [false, '이번 한 번', CalendarCheck],
                                ] as const
                            ).map(([value, label, Icon]) => (
                                <button
                                    key={label}
                                    type="button"
                                    role="radio"
                                    aria-checked={repeat === value}
                                    className={cn(
                                        'flex h-11 items-center justify-center gap-1.5 rounded-xl text-[15px] font-medium transition-[background-color,color,box-shadow] duration-150',
                                        repeat === value
                                            ? 'bg-white font-bold text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]'
                                            : 'text-neutral-600 hover:text-ink',
                                    )}
                                    onClick={() => setRepeat(value)}
                                >
                                    <Icon className="size-4" aria-hidden />
                                    {label}
                                </button>
                            ))}
                        </div>
                        {repeat !== null && (
                            <p className="mt-2 text-[13px] text-neutral-500">
                                {repeat
                                    ? date
                                        ? `${formatDate(date)}부터 매주 ${days[getTodayIdx(date)]}요일에 해요`
                                        : '고른 날짜부터 매주 같은 요일·시간에 해요'
                                    : `${noun}${team?.isEvent ? '이' : '가'} 끝나면 합주판에서 자동으로 사라져요`}
                            </p>
                        )}
                    </Section>

                    {/* 날짜 */}
                    <Section label={repeat ? '시작 날짜' : '날짜'}>
                        <button
                            type="button"
                            aria-expanded={dateOpen}
                            className={cn(
                                pressable,
                                boxShape,
                                'flex h-14 w-full items-center justify-between gap-3 border border-neutral-200 bg-white px-4 text-left hover:bg-neutral-50',
                            )}
                            onClick={() => setDateOpen((prev) => !prev)}
                        >
                            <span className="flex min-w-0 items-center gap-2.5">
                                <CalendarDays
                                    className="size-5 shrink-0 text-neutral-500"
                                    aria-hidden
                                />
                                <span
                                    className={cn(
                                        'truncate text-[16px]',
                                        date ? 'font-bold text-ink' : 'text-neutral-500',
                                    )}
                                >
                                    {date ? formatLongDate(date) : '날짜 고르기'}
                                </span>
                            </span>
                            <ChevronDown
                                className={cn(
                                    'size-5 shrink-0 text-neutral-400 transition-transform duration-200',
                                    dateOpen && 'rotate-180',
                                )}
                                aria-hidden
                            />
                        </button>
                        {dateOpen && (
                            <DatePicker
                                date={date}
                                onSelect={(picked) => {
                                    setDate(picked);
                                    setDateOpen(false);
                                }}
                            />
                        )}
                    </Section>

                    {/* 시간 */}
                    <Section
                        label="시간"
                        aside={
                            range && (
                                <span className="text-[15px] font-bold text-ink">
                                    {formatTimeRange(range.startTime, range.endTime)}
                                    <span className="font-normal text-neutral-500">
                                        {' '}
                                        · {formatSlots(duration)}
                                    </span>
                                </span>
                            )
                        }
                    >
                        {date && (
                            <DayBar
                                date={date}
                                events={dayEvents}
                                range={range}
                                color={color}
                                onPick={pickStart}
                            />
                        )}

                        <p className="mt-4 mb-2 text-[13px] font-medium text-neutral-500">시작</p>
                        <StartTimePicker
                            startTime={startTime}
                            range={range}
                            color={color}
                            onPick={pickStart}
                        />

                        <p className="mt-4 mb-2 text-[13px] font-medium text-neutral-500">
                            소요 시간
                        </p>
                        <div
                            role="radiogroup"
                            aria-label="소요 시간"
                            className="flex flex-wrap gap-1.5"
                        >
                            {DURATION_CHIPS.map((slots) => (
                                <Chip
                                    key={slots}
                                    checked={!customDuration && duration === slots}
                                    disabled={slots > maxDuration}
                                    onClick={() => {
                                        setCustomDuration(false);
                                        setDuration(slots);
                                    }}
                                >
                                    {formatSlots(slots)}
                                </Chip>
                            ))}
                            <Chip checked={customDuration} onClick={() => setCustomDuration(true)}>
                                직접 입력
                            </Chip>
                        </div>
                        {customDuration && (
                            <div
                                className={`${boxShape} mt-3 flex h-16 items-center justify-between gap-2 border border-neutral-200 px-2`}
                            >
                                <StepButton
                                    label="30분 줄이기"
                                    disabled={duration <= 1}
                                    onClick={() => setDuration((prev) => prev - 1)}
                                >
                                    <Minus className="size-5" aria-hidden />
                                </StepButton>
                                <div className="text-center" aria-live="polite">
                                    <p className="text-[18px] font-bold text-ink">
                                        {formatSlots(duration)}
                                    </p>
                                    {range && (
                                        <p className="text-[13px] text-neutral-500">
                                            {idx2hour[range.endTime + 1]}에 끝나요
                                        </p>
                                    )}
                                </div>
                                <StepButton
                                    label="30분 늘리기"
                                    disabled={duration >= maxDuration}
                                    onClick={() => setDuration((prev) => prev + 1)}
                                >
                                    <Plus className="size-5" aria-hidden />
                                </StepButton>
                            </div>
                        )}

                        {/* 겹침: 최대 개수를 넘으면 막고, 아니면 알리기만 한다 */}
                        {limitDate && date ? (
                            <Notice tone="danger">
                                <p className="font-bold">최대 {MAX_OVERLAP}개까지만 가능해요</p>
                                <p className="mt-0.5 text-[14px]">
                                    {limitDate.isSame(date, 'day')
                                        ? `이 시간엔 이미 ${MAX_OVERLAP}개가 겹쳐 있어요`
                                        : `${formatDate(limitDate)}엔 이 시간에 ${MAX_OVERLAP}개가 겹쳐 있어요`}
                                </p>
                            </Notice>
                        ) : (
                            conflicts.length > 0 && (
                                <Notice tone="warn">
                                    <p>
                                        {conflicts[0]!.name} 일정
                                        {conflicts.length > 1
                                            ? ` 외 ${conflicts.length - 1}개와`
                                            : '과'}{' '}
                                        겹쳐요
                                    </p>
                                </Notice>
                            )
                        )}
                    </Section>
                </div>
            </div>

            {/* 저장 버튼은 스크롤과 관계없이 맨 아래 */}
            <div className="border-t border-neutral-100 bg-white px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:px-7">
                <button
                    type="button"
                    disabled={!ready}
                    className={cn(
                        boxShape,
                        'flex h-14 w-full items-center justify-center text-[17px] font-bold transition-[background-color,scale] duration-150',
                        ready
                            ? 'bg-ink text-white hover:bg-neutral-800 active:scale-[0.98]'
                            : 'bg-neutral-100 text-neutral-400',
                    )}
                    onClick={submit}
                >
                    {submitting
                        ? '저장하는 중…'
                        : (missing ??
                          (limitDate ? `최대 ${MAX_OVERLAP}개까지만 가능해요` : `${noun} 잡기`))}
                </button>
            </div>
        </>
    );
};

const Section = ({
    label,
    aside,
    children,
}: {
    label: string;
    aside?: ReactNode;
    children: ReactNode;
}) => (
    <section aria-label={label}>
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h3 className="text-[15px] font-bold text-ink">{label}</h3>
            {aside}
        </div>
        {children}
    </section>
);

/** 고르는 칩 (반복·소요 시간·시작 시간). 고르면 검정 */
const Chip = ({
    checked,
    disabled = false,
    onClick,
    children,
}: {
    checked: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
}) => (
    <button
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={disabled}
        className={cn(
            pressable,
            'h-10 rounded-full border px-4 text-[15px] font-medium',
            checked
                ? 'border-ink bg-ink text-white'
                : 'border-neutral-200 bg-white text-ink hover:bg-neutral-50 disabled:border-neutral-100 disabled:text-neutral-300 disabled:hover:bg-white',
        )}
        onClick={onClick}
    >
        {children}
    </button>
);

const StepButton = ({
    label,
    disabled,
    onClick,
    children,
}: {
    label: string;
    disabled: boolean;
    onClick: () => void;
    children: ReactNode;
}) => (
    <button
        type="button"
        aria-label={label}
        disabled={disabled}
        className={`${pressable} inline-flex size-12 items-center justify-center rounded-full bg-neutral-100 text-ink hover:bg-neutral-200 disabled:bg-neutral-50 disabled:text-neutral-300`}
        onClick={onClick}
    >
        {children}
    </button>
);

/** 팀 고르기: 팀 색 점이 있는 칩. 고른 팀은 팀 색으로 칠한다. 팀 뒤에 소모임·일정 */
const TeamPicker = ({
    teams,
    events,
    selectedId,
    onSelect,
}: {
    teams: TeamOption[];
    events: TeamOption[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) => {
    const chip = (option: TeamOption) => {
        const selected = option.id === selectedId;
        return (
            <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={cn(
                    pressable,
                    'inline-flex h-10 max-w-full items-center gap-2 rounded-full border px-3.5 text-[15px] font-medium',
                    selected
                        ? 'border-transparent font-bold text-white'
                        : 'border-neutral-200 bg-white text-ink hover:bg-neutral-50',
                )}
                style={selected ? { backgroundColor: option.color } : undefined}
                onClick={() => onSelect(option.id)}
            >
                {selected ? (
                    <Check className="size-4 shrink-0" aria-hidden />
                ) : (
                    <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: option.color }}
                    />
                )}
                <span className="truncate">{option.name}</span>
            </button>
        );
    };

    return (
        <div
            role="radiogroup"
            aria-label="팀"
            className={`${boxShape} max-h-[264px] overflow-y-auto overscroll-contain border border-neutral-200 bg-neutral-50/60 p-3`}
        >
            <div className="flex flex-wrap gap-1.5">{teams.map(chip)}</div>
            {events.length > 0 && (
                <>
                    <p className="mt-3.5 mb-2 text-[13px] font-medium text-neutral-500">
                        소모임·일정
                    </p>
                    <div className="flex flex-wrap gap-1.5">{events.map(chip)}</div>
                </>
            )}
        </div>
    );
};

/** 달력: 오늘부터 고를 수 있다 (옛 달력과 같음) */
const DatePicker = ({
    date,
    onSelect,
}: {
    date: Dayjs | null;
    onSelect: (date: Dayjs) => void;
}) => {
    const today = dayjs().startOf('day');
    return (
        <div className={`${boxShape} mt-2 border border-neutral-200 bg-white p-2`}>
            {/* 칸이 정사각형이라 넓은 화면(PC 520px)에서는 너무 길어진다 → 폭을 제한 */}
            <div className="mx-auto max-w-[360px]">
                <Calendar
                    mode="single"
                    required
                    locale={ko}
                    // 합주판과 같이 월요일부터
                    weekStartsOn={1}
                    selected={date?.toDate()}
                    defaultMonth={(date ?? today).toDate()}
                    startMonth={today.toDate()}
                    disabled={{ before: today.toDate() }}
                    showOutsideDays={false}
                    onSelect={(picked) => onSelect(dayjs(picked).startOf('day'))}
                    className="w-full bg-transparent p-0 [--cell-radius:9999px] [--cell-size:--spacing(10)] [&_button]:rounded-full"
                    // 글자 크기는 px로 (공존 기간에는 html 글자 크기가 바뀌어 rem이 작아진다: 계획 문서 "공존 기간 규칙")
                    classNames={{
                        root: 'w-full',
                        caption_label: 'text-[16px] font-bold select-none',
                        weekday: 'flex-1 text-[13px] font-normal text-neutral-400 select-none',
                    }}
                />
            </div>
        </div>
    );
};

/**
 * 그날 동방: 09~24시 가로 막대에 그날 합주(겹치면 줄을 나눔)와 고른 시간.
 * 막대를 누르면 그 시간이 시작 시간이 된다 (마우스·터치용. 키보드는 아래 시작 시간 칩)
 */
const DayBar = ({
    date,
    events,
    range,
    color,
    onPick,
}: {
    date: Dayjs;
    events: WithLane<CalendarEvent>[];
    range: SlotRange | null;
    color: string;
    onPick: (slot: TimeSlot) => void;
}) => {
    const percent = (slots: number) => `${(slots / SLOT_COUNT) * 100}%`;
    return (
        <div>
            <p className="mb-1.5 text-[13px] text-neutral-500">이날 동방 · {formatDate(date)}</p>
            <div
                aria-hidden
                data-vaul-no-drag
                className="relative h-11 cursor-pointer overflow-hidden rounded-xl bg-neutral-100"
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const slot = Math.floor(((e.clientX - rect.left) / rect.width) * SLOT_COUNT);
                    onPick(Math.min(SLOT_COUNT - 1, Math.max(0, slot)));
                }}
            >
                {events.map((event) => (
                    <span
                        key={event.id}
                        className={cn(
                            'absolute rounded-[5px] border-white',
                            event.status === 'skipped' && 'border border-dashed opacity-70',
                        )}
                        style={{
                            left: percent(event.startTime),
                            width: percent(event.endTime + 1 - event.startTime),
                            top: `calc(${(event.lane / event.lanes) * 100}% + 1px)`,
                            height: `calc(${100 / event.lanes}% - 2px)`,
                            ...(event.status === 'skipped'
                                ? { borderColor: event.color }
                                : { backgroundColor: event.color, opacity: 0.55 }),
                        }}
                    />
                ))}
                {range && (
                    <span
                        data-selected-range
                        className="absolute inset-y-0 rounded-[6px] border-2 transition-[left,width] duration-150"
                        style={{
                            left: percent(range.startTime),
                            width: percent(range.endTime + 1 - range.startTime),
                            borderColor: color,
                            backgroundColor: `color-mix(in srgb, ${color} 30%, transparent)`,
                        }}
                    />
                )}
            </div>
            <div
                aria-hidden
                className="relative mt-1 h-4 text-[12px] leading-none text-neutral-400"
            >
                {[0, 6, 12, 18, 24, 30].map((slot) => (
                    <span
                        key={slot}
                        className={cn(
                            'absolute top-0',
                            slot === 0
                                ? ''
                                : slot === SLOT_COUNT
                                  ? '-translate-x-full'
                                  : '-translate-x-1/2',
                        )}
                        style={{ left: percent(slot) }}
                    >
                        {(idx2hour[slot] ?? '').slice(0, 2)}
                    </span>
                ))}
            </div>
        </div>
    );
};

/** 시작 시간: 09:00 ~ 23:30 칩을 좌우로 밀어 고른다. 고른 시간이 가운데 오게 스크롤한다 */
const StartTimePicker = ({
    startTime,
    range,
    color,
    onPick,
}: {
    startTime: TimeSlot | null;
    range: SlotRange | null;
    color: string;
    onPick: (slot: TimeSlot) => void;
}) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller || startTime === null) return;
        const chip = scroller.children[startTime] as HTMLElement | undefined;
        if (!chip) return;
        scroller.scrollLeft = chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2;
    }, [startTime]);

    return (
        <div
            ref={scrollerRef}
            role="radiogroup"
            aria-label="시작 시간"
            data-vaul-no-drag
            className="relative -mx-5 flex gap-1.5 overflow-x-auto scroll-smooth px-5 py-0.5 [scrollbar-width:none] md:-mx-7 md:px-7 [&::-webkit-scrollbar]:hidden"
        >
            {idx2hour.slice(0, SLOT_COUNT).map((label, slot) => {
                const checked = slot === startTime;
                const inRange =
                    !checked && range && range.startTime < slot && slot <= range.endTime;
                return (
                    <button
                        key={label}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        className={cn(
                            pressable,
                            'h-10 min-w-[68px] shrink-0 rounded-full border text-[15px] font-medium tabular-nums',
                            checked
                                ? 'border-transparent font-bold text-white'
                                : inRange
                                  ? 'border-transparent text-ink'
                                  : 'border-neutral-200 bg-white text-ink hover:bg-neutral-50',
                        )}
                        style={
                            checked
                                ? { backgroundColor: color }
                                : inRange
                                  ? { backgroundColor: `color-mix(in srgb, ${color} 16%, white)` }
                                  : undefined
                        }
                        onClick={() => onPick(slot)}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
};

const Notice = ({ tone, children }: { tone: 'warn' | 'danger'; children: ReactNode }) => {
    const Icon = tone === 'danger' ? OctagonAlert : TriangleAlert;
    return (
        <div
            role="status"
            className={cn(
                boxShape,
                'mt-4 flex items-start gap-2.5 border px-4 py-3 text-[15px]',
                tone === 'danger'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-amber-200 bg-amber-50 text-amber-900',
            )}
        >
            <Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden />
            <div className="min-w-0">{children}</div>
        </div>
    );
};

export default AddEnsembleDrawer;
