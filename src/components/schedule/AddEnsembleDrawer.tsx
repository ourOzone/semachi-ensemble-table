import {
    useEffect,
    useRef,
    useState,
    type ComponentType,
    type KeyboardEvent,
    type PointerEvent,
    type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { ko } from 'react-day-picker/locale';
import {
    CalendarCheck,
    CalendarDays,
    CalendarX2,
    Check,
    ChevronDown,
    GripVertical,
    Infinity as InfinityIcon,
    Info,
    Minus,
    OctagonAlert,
    Plus,
    Repeat,
    TriangleAlert,
    X,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { attachScrollFade, scrollFadeRef } from '@/components/ui/scroll-fade';
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
import { useAddEnsembleStore, type AddEnsemblePreset, type EditTarget } from './addEnsembleStore';
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
// 입력: 팀 → 반복 여부 → 날짜 → 시간(그날 동방 막대에서 끌어 고름)·소요 시간 → 반복 종료(매주 반복일 때, 고르지 않아도 됨).
// PIN은 받지 않는다 (옛 흐름도 받지 않았다).
// - 팀 정보·소모임 정보에서 열면 팀이 골라져 있고 날짜를 고른다 (시간은 12:00부터 2시간으로 시작)
// - 합주판(빈 시간·겹친 합주 목록·합주 정보)에서 열면 날짜·시작 시간이 채워져 있고 팀을 고른다
// - 소요 시간은 2시간으로 시작한다 (30분·1시간·2시간·직접 입력)
// - 그날 동방에 잡힌 합주를 가로 막대로 보여주고, 겹치면 알린다. 한 시간에 MAX_OVERLAP개가 넘게 겹치면 잡을 수 없다
// - 무언가를 고르면 그 항목의 소제목이 Drawer 맨 위에 오게 스크롤한다 (22차, 더 내려갈 곳이 없으면 거기까지)
// 입력값은 이 Drawer의 로컬 상태다 (열 때마다 addEnsembleStore의 미리 채울 값으로 새로 시작).
// 합주 수정도 이 Drawer다 (31차, mode="update", 이전: 옛 Drawer 3단계 반복 여부 → 달력 → 시작·끝 칸).
// 합주 정보에서 PIN이 맞으면 열리고(openUpdateEnsemble), 지금 값이 채워져 있다. 팀은 바꿀 수 없다(PIN이 그 팀의 PIN).
// 겹침은 수정하는 합주 자신을 빼고 센다. 바뀐 것이 없으면 저장할 수 없다

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
    /** 반복 종료 날짜 (이 날짜 이후에 자동 삭제). 일회성이거나 고르지 않으면 null (계속 반복) */
    repeatEnd: Dayjs | null;
}

interface AddEnsembleDrawerProps {
    /** add: 합주 잡기(addEnsemble), update: 합주 수정(updateEnsemble, 31차) */
    mode?: 'add' | 'update';
    /** 고를 수 있는 팀·소모임 (합주 잡기만. 수정은 팀을 바꿀 수 없다) */
    teams?: TeamOption[];
    events?: TeamOption[];
    /**
     * 저장. 성공하면 true (Drawer는 호출한 쪽이 닫는다), 실패하면 false (입력을 그대로 두고 다시 누를 수 있다).
     * 수정이면 target이 그 합주
     */
    onSubmit: (input: AddEnsembleInput, target: EditTarget | null) => Promise<boolean>;
}

/** 시간칸 수 (09:00 ~ 24:00, 30분 단위) */
const SLOT_COUNT = 30;
/** 소요 시간 기본값: 2시간 */
const DEFAULT_DURATION = 4;
const DURATION_CHIPS = [1, 2, 4] as const;
/** 시작 시간을 미리 채우지 않고 열 때(팀 정보에서)의 시작: 12:00 */
const DEFAULT_START = 6;
/** 소제목을 맨 위로 스크롤할 때 위에 남기는 여백 (손잡이가 겹치는 자리) */
const SCROLL_TOP_GAP = 24;
type SectionKey = 'team' | 'repeat' | 'date' | 'time' | 'end';

/** "11월 26일 목요일" */
const formatLongDate = (date: Dayjs) =>
    `${date.month() + 1}월 ${date.date()}일 ${days[getTodayIdx(date)]}요일`;

const AddEnsembleDrawer = ({
    mode = 'add',
    teams = [],
    events = [],
    onSubmit,
}: AddEnsembleDrawerProps) => {
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);
    const setOpenedDrawers = useDrawerStore((state) => state.setOpenedDrawers);
    const closeAllDrawers = useDrawerStore((state) => state.closeAllDrawers);
    const session = useAddEnsembleStore((state) => state.session);
    const preset = useAddEnsembleStore((state) => state.preset);
    const edit = useAddEnsembleStore((state) => state.edit);
    const open =
        openedDrawers[openedDrawers.length - 1] ===
        (mode === 'update' ? 'updateEnsemble' : 'addEnsemble');
    // 합주 잡기·수정 Drawer는 같은 store로 열린다. 이 Drawer의 모드로 연 것만 그린다
    const forThisMode = (edit !== null) === (mode === 'update');

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
                {session > 0 && forThisMode && (
                    <AddEnsembleForm
                        key={session}
                        preset={preset}
                        edit={edit}
                        teams={teams}
                        events={events}
                        onSubmit={onSubmit}
                    />
                )}
            </DrawerContent>
        </Drawer>
    );
};

interface AddEnsembleFormProps {
    preset: AddEnsemblePreset;
    edit: EditTarget | null;
    teams: TeamOption[];
    events: TeamOption[];
    onSubmit: AddEnsembleDrawerProps['onSubmit'];
}

const AddEnsembleForm = ({ preset, edit, teams, events, onSubmit }: AddEnsembleFormProps) => {
    const [teamId, setTeamId] = useState<string | null>(preset.teamId ?? null);
    const team = edit
        ? edit.team
        : ([...teams, ...events].find((option) => option.id === teamId) ?? null);
    const [teamOpen, setTeamOpen] = useState(team === null);
    // 수정이면 모두 지금 값으로 시작한다
    const [repeat, setRepeat] = useState<boolean | null>(edit?.repeat ?? null);
    const [date, setDate] = useState<Dayjs | null>(edit?.date ?? preset.date ?? null);
    const [dateOpen, setDateOpen] = useState(date === null);
    // 시작 시간: 합주판에서 열면 누른 시간, 팀 정보에서 열면 12:00 (그날 동방 막대의 창이 처음부터 보이게, 23차)
    const initialStart = edit?.startTime ?? preset.startTime ?? DEFAULT_START;
    const [startTime, setStartTime] = useState<TimeSlot>(initialStart);
    // 소요 시간(시간칸 수). 24:00을 넘지 않게
    const initialDuration = edit
        ? edit.endTime + 1 - edit.startTime
        : Math.min(DEFAULT_DURATION, SLOT_COUNT - initialStart);
    const [duration, setDuration] = useState(initialDuration);
    // 수정하는 합주의 길이가 칩(30분·1시간·2시간)에 없으면 직접 입력으로
    const [customDuration, setCustomDuration] = useState(
        edit !== null && !DURATION_CHIPS.some((slots) => slots === initialDuration),
    );
    // 반복 종료 날짜 (매주 반복일 때만, 고르지 않아도 됨 = 계속 반복). 이 날짜 이후에 자동으로 삭제된다 (서버 due)
    const [hasRepeatEnd, setHasRepeatEnd] = useState(edit?.repeatEnd != null);
    const [repeatEnd, setRepeatEnd] = useState<Dayjs | null>(edit?.repeatEnd ?? null);
    const [repeatEndOpen, setRepeatEndOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // 고른 항목의 소제목을 맨 위로 (bottom: 맨 아래까지). 그려진 뒤(접힘·펼침이 반영된 뒤)에 스크롤한다.
    // 팀 정보에서 열면 팀이 골라져 있으므로 처음부터 "반복"을 맨 위로
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const sectionRefs = useRef<Partial<Record<SectionKey, HTMLElement | null>>>({});
    // 위·아래 끝 흐림 (scrollAreaRef는 소제목 스크롤에도 쓰여 scrollFadeRef 대신 직접 붙인다)
    useEffect(() => {
        const area = scrollAreaRef.current;
        return area ? attachScrollFade(area) : undefined;
    }, []);
    const [scrollRequest, setScrollRequest] = useState<{
        target: SectionKey | 'bottom';
        smooth: boolean;
        count: number;
    } | null>(preset.teamId && !edit ? { target: 'repeat', smooth: false, count: 0 } : null);
    const scrollToSection = (target: SectionKey | 'bottom') =>
        setScrollRequest((prev) => ({ target, smooth: true, count: (prev?.count ?? 0) + 1 }));
    useEffect(() => {
        const area = scrollAreaRef.current;
        if (!scrollRequest || !area || typeof area.scrollTo !== 'function') return;
        const section =
            scrollRequest.target === 'bottom' ? null : sectionRefs.current[scrollRequest.target];
        const top = section
            ? section.getBoundingClientRect().top -
              area.getBoundingClientRect().top +
              area.scrollTop -
              SCROLL_TOP_GAP
            : area.scrollHeight;
        area.scrollTo({ top, behavior: scrollRequest.smooth ? 'smooth' : 'auto' });
    }, [scrollRequest]);
    const sectionRef = (key: SectionKey) => (el: HTMLElement | null) => {
        sectionRefs.current[key] = el;
    };

    const maxDuration = SLOT_COUNT - startTime;
    const range: SlotRange = { startTime, endTime: startTime + duration - 1 };

    const pickDuration = (slots: number, custom: boolean) => {
        setCustomDuration(custom);
        setDuration(slots);
        // 직접 입력은 맨 아래의 −/+ 가 보이게
        scrollToSection(custom ? 'bottom' : 'time');
    };
    const pickDate = (picked: Dayjs) => {
        setDate(picked);
        setDateOpen(false);
        // 시작 날짜보다 앞선 종료 날짜는 다시 고르게 한다
        if (repeatEnd && repeatEnd.isBefore(picked, 'day')) setRepeatEnd(null);
        scrollToSection('date');
    };

    // 그날 동방: 합주판과 같은 기준으로 그날 보이는 합주 (색은 팀의 지금 색). 수정이면 그 합주 자신은 빼고 본다
    const allTeams = useTeams();
    const { data: allEnsembles = [] } = useQuery(ensemblesQueryOptions);
    const ensembles = edit
        ? allEnsembles.filter(({ _id: ensembleId }) => ensembleId !== edit.id)
        : allEnsembles;
    const dayEvents = date ? eventsOnDate(ensembles, buildColorMap(allTeams), date, dayjs()) : [];
    const conflicts = overlapping(
        dayEvents.filter((event) => event.status === 'normal'),
        range,
    );
    // 반복 여부를 고르기 전에는 그날만 본다. 반복 종료 날짜가 있으면 그날까지만
    const endDate = repeat && hasRepeatEnd ? repeatEnd : null;
    const limitDate = date
        ? findOverlapLimit(ensembles, { date, repeat: repeat ?? false, until: endDate, ...range })
        : null;

    const noun = team?.isEvent ? '일정' : '합주';
    const color = team?.color ?? 'var(--color-ink)';
    const missing = !team
        ? '팀을 골라 주세요'
        : repeat === null
          ? '반복 여부를 골라 주세요'
          : !date
            ? '날짜를 골라 주세요'
            : repeat && hasRepeatEnd && !repeatEnd
              ? '종료 날짜를 골라 주세요'
              : null;
    // 수정: 지금 값에서 바뀐 것이 없으면 저장할 수 없다
    const unchanged =
        edit !== null &&
        repeat === edit.repeat &&
        date !== null &&
        date.isSame(edit.date, 'day') &&
        range.startTime === edit.startTime &&
        range.endTime === edit.endTime &&
        (endDate === null
            ? edit.repeatEnd === null
            : edit.repeatEnd !== null && endDate.isSame(edit.repeatEnd, 'day'));
    const ready = missing === null && limitDate === null && !unchanged && !submitting;

    const submit = async () => {
        if (!ready || !team || repeat === null || !date) return;
        setSubmitting(true);
        // 실패하면 입력을 그대로 두고 다시 누를 수 있게 한다 (성공하면 Drawer가 닫힌다)
        const saved = await onSubmit({ team, repeat, date, ...range, repeatEnd: endDate }, edit);
        if (!saved) setSubmitting(false);
    };

    return (
        <>
            <div
                ref={scrollAreaRef}
                // 스크롤 막대는 숨기고 위·아래 끝을 흐리게 (23차, V-3 5차부터 공용 edge-fade: 아래 effect)
                className={cn(scrollAreaClassName, 'flex-1')}
            >
                {/* 머리 */}
                <div className="flex items-start justify-between gap-3 px-5 pt-[26px] md:px-7">
                    <div className="min-w-0">
                        <DrawerTitle className="text-[26px] leading-tight font-bold text-ink md:text-[28px]">
                            {noun} {edit ? '수정' : '잡기'}
                        </DrawerTitle>
                        <DrawerDescription className="mt-1.5 truncate text-[15px] text-neutral-500">
                            {date
                                ? `${formatLongDate(date)}${repeat === true ? '부터 매주' : repeat === false ? ' 한 번만' : ''} · ${formatTimeRange(range.startTime, range.endTime)}`
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

                <div className="flex flex-col gap-5 px-5 pt-5 pb-6 md:px-7">
                    {/* 팀 */}
                    <Section label="팀" sectionRef={sectionRef('team')}>
                        {edit ? (
                            // 수정: 팀은 바꿀 수 없다
                            <div
                                className={`${boxShape} flex h-14 w-full items-center justify-between gap-3 border border-neutral-200 bg-surface pr-4 pl-2`}
                            >
                                <TeamBadge team={edit.team} />
                                <span className="shrink-0 text-[13px] text-neutral-400">
                                    팀은 바꿀 수 없어요
                                </span>
                            </div>
                        ) : team && !teamOpen ? (
                            <button
                                type="button"
                                aria-expanded={false}
                                className={`${pressable} ${boxShape} flex h-14 w-full items-center justify-between gap-3 border border-neutral-200 bg-surface pr-3 pl-2 hover:bg-neutral-50`}
                                onClick={() => setTeamOpen(true)}
                            >
                                <TeamBadge team={team} checked />
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
                                    scrollToSection('team');
                                }}
                            />
                        )}
                    </Section>

                    {/* 반복 여부 (옛 흐름: "매주 같은 타임에 할래요" / "하루만 할래요") */}
                    <Section label="반복" sectionRef={sectionRef('repeat')}>
                        <Segmented
                            label="반복"
                            value={repeat}
                            options={[
                                [true, '매주 반복', Repeat],
                                [false, '한 번만', CalendarCheck],
                            ]}
                            onChange={(value) => {
                                setRepeat(value);
                                scrollToSection('repeat');
                            }}
                        />
                    </Section>

                    {/* 날짜 */}
                    <Section label={repeat ? '시작 날짜' : '날짜'} sectionRef={sectionRef('date')}>
                        <DateToggle
                            open={dateOpen}
                            text={date ? formatLongDate(date) : null}
                            placeholder="날짜 선택"
                            onClick={() => {
                                // 달력을 열면 소제목이 맨 위로 (달력 전체가 보이게)
                                if (!dateOpen) scrollToSection('date');
                                setDateOpen(!dateOpen);
                            }}
                        />
                        {dateOpen && (
                            <DatePicker selected={date} min={dayjs()} onSelect={pickDate} />
                        )}
                    </Section>

                    {/* 시간: 그날 동방 막대에서 창을 끌어 시작 시간을 고르고, 아래에서 소요 시간 */}
                    <Section
                        label="시간"
                        sectionRef={sectionRef('time')}
                        aside={
                            <span className="text-[15px] font-bold text-ink">
                                {formatTimeRange(range.startTime, range.endTime)}
                                <span className="font-normal text-neutral-500">
                                    {' '}
                                    · {formatSlots(duration)}
                                </span>
                            </span>
                        }
                    >
                        <DayBar
                            date={date}
                            events={dayEvents}
                            range={range}
                            duration={duration}
                            color={color}
                            // 막대를 끄는 동안에는 스크롤하지 않는다
                            onMove={setStartTime}
                            notice={
                                // 겹침: 최대 개수를 넘으면 막고, 아니면 알리기만 한다. 막대 바로 아래 고정된 한 줄 (있든 없든 배치가 바뀌지 않게)
                                limitDate && date ? (
                                    <span className="flex min-w-0 items-center gap-1.5 text-red-700">
                                        <OctagonAlert className="size-4 shrink-0" aria-hidden />
                                        <span className="truncate">
                                            {limitDate.isSame(date, 'day')
                                                ? `이 시간엔 이미 ${MAX_OVERLAP}개가 겹쳐 있어요`
                                                : `${formatDate(limitDate)}엔 이 시간에 ${MAX_OVERLAP}개가 겹쳐 있어요`}
                                        </span>
                                    </span>
                                ) : conflicts.length > 0 ? (
                                    <span className="flex min-w-0 items-center gap-1.5 text-amber-700">
                                        <TriangleAlert className="size-4 shrink-0" aria-hidden />
                                        <span className="truncate">{conflicts[0]!.name}</span>{' '}
                                        <span className="shrink-0">
                                            일정
                                            {conflicts.length > 1
                                                ? ` 외 ${conflicts.length - 1}개와`
                                                : '과'}{' '}
                                            겹쳐요
                                        </span>
                                    </span>
                                ) : null
                            }
                        />

                        <p className="mt-3 mb-2 text-[13px] font-medium text-neutral-500">
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
                                    onClick={() => pickDuration(slots, false)}
                                >
                                    {formatSlots(slots)}
                                </Chip>
                            ))}
                            <Chip
                                checked={customDuration}
                                onClick={() => pickDuration(duration, true)}
                            >
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
                                    <p className="text-[13px] text-neutral-500">
                                        {formatTimeRange(range.startTime, range.endTime)}
                                    </p>
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
                    </Section>

                    {/* 반복 종료 (매주 반복일 때만). 고르지 않아도 된다: "계속 반복"이 처음부터 골라져 있다 */}
                    {repeat && (
                        <Section label="반복 종료" sectionRef={sectionRef('end')}>
                            <Segmented
                                label="반복 종료"
                                value={hasRepeatEnd}
                                options={[
                                    [false, '계속 반복', InfinityIcon],
                                    [true, '종료 날짜 지정', CalendarX2],
                                ]}
                                onChange={(value) => {
                                    setHasRepeatEnd(value);
                                    // 날짜를 지정하면 바로 달력을 연다
                                    setRepeatEndOpen(value && !repeatEnd);
                                    scrollToSection(value ? 'end' : 'bottom');
                                }}
                            />
                            {hasRepeatEnd && (
                                <div className="mt-2.5">
                                    <DateToggle
                                        open={repeatEndOpen}
                                        text={repeatEnd ? `${formatLongDate(repeatEnd)}까지` : null}
                                        placeholder="종료 날짜 선택"
                                        onClick={() => {
                                            if (!repeatEndOpen) scrollToSection('end');
                                            setRepeatEndOpen(!repeatEndOpen);
                                        }}
                                    />
                                    {repeatEndOpen && (
                                        <DatePicker
                                            selected={repeatEnd}
                                            min={date ?? dayjs()}
                                            onSelect={(picked) => {
                                                setRepeatEnd(picked);
                                                setRepeatEndOpen(false);
                                                scrollToSection('end');
                                            }}
                                        />
                                    )}
                                    <p className="mt-2 flex items-center gap-1.5 text-[13px] text-neutral-500">
                                        <Info className="size-3.5 shrink-0" aria-hidden />이 날짜
                                        이후에 자동으로 삭제돼요
                                    </p>
                                </div>
                            )}
                        </Section>
                    )}
                </div>
            </div>

            {/* 저장 버튼은 스크롤과 관계없이 맨 아래 */}
            <div className="border-t border-neutral-100 bg-surface px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:px-7">
                <button
                    type="button"
                    disabled={!ready}
                    className={cn(
                        boxShape,
                        'flex h-14 w-full items-center justify-center text-[17px] font-bold transition-[background-color,scale] duration-150',
                        ready
                            ? 'bg-ink text-on-ink hover:bg-neutral-800 active:scale-[0.98]'
                            : 'bg-neutral-100 text-neutral-400',
                    )}
                    onClick={submit}
                >
                    {submitting
                        ? '저장하는 중…'
                        : (missing ??
                          (limitDate
                              ? `최대 ${MAX_OVERLAP}개까지만 가능해요`
                              : unchanged
                                ? '바뀐 내용이 없어요'
                                : edit
                                  ? '수정하기'
                                  : `${noun} 잡기`))}
                </button>
            </div>
        </>
    );
};

/** 고른 팀 (팀 색 바탕 알약). 합주 잡기는 체크 표시, 수정은 없음 */
const TeamBadge = ({ team, checked = false }: { team: TeamOption; checked?: boolean }) => (
    <span
        className={cn(
            'inline-flex min-w-0 items-center gap-1.5 rounded-full py-2 pr-4 text-[16px] font-bold text-white',
            checked ? 'pl-3' : 'pl-4',
        )}
        style={{ backgroundColor: team.color }}
    >
        {checked && <Check className="size-4 shrink-0" aria-hidden />}
        <span className="truncate">{team.name}</span>
    </span>
);

/** 둘 중 하나를 고르는 칸 (반복 여부, 반복 종료). 아무것도 고르지 않은 상태(null)도 있다 */
function Segmented<T extends boolean>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: T | null;
    options: readonly (readonly [T, string, ComponentType<{ className?: string }>])[];
    onChange: (value: T) => void;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={label}
            className="grid grid-cols-2 gap-1 rounded-2xl bg-neutral-100 p-1"
        >
            {options.map(([option, text, Icon]) => (
                <button
                    key={text}
                    type="button"
                    role="radio"
                    aria-checked={value === option}
                    className={cn(
                        'flex h-11 items-center justify-center gap-1.5 rounded-xl text-[15px] font-medium transition-[background-color,color,box-shadow] duration-150',
                        value === option
                            ? 'bg-surface font-bold text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]'
                            : 'text-neutral-600 hover:text-ink',
                    )}
                    onClick={() => onChange(option)}
                >
                    <Icon className="size-4" aria-hidden />
                    {text}
                </button>
            ))}
        </div>
    );
}

/** 달력을 펼치고 접는 줄 (고른 날짜, 없으면 안내 문구) */
const DateToggle = ({
    open,
    text,
    placeholder,
    onClick,
}: {
    open: boolean;
    text: string | null;
    placeholder: string;
    onClick: () => void;
}) => (
    <button
        type="button"
        aria-expanded={open}
        className={cn(
            pressable,
            boxShape,
            'flex h-14 w-full items-center justify-between gap-3 border border-neutral-200 bg-surface px-4 text-left hover:bg-neutral-50',
        )}
        onClick={onClick}
    >
        <span className="flex min-w-0 items-center gap-2.5">
            <CalendarDays className="size-5 shrink-0 text-neutral-500" aria-hidden />
            <span
                className={cn(
                    'truncate text-[16px]',
                    text ? 'font-bold text-ink' : 'text-neutral-500',
                )}
            >
                {text ?? placeholder}
            </span>
        </span>
        <ChevronDown
            className={cn(
                'size-5 shrink-0 text-neutral-400 transition-transform duration-200',
                open && 'rotate-180',
            )}
            aria-hidden
        />
    </button>
);

const Section = ({
    label,
    aside,
    sectionRef,
    children,
}: {
    label: string;
    aside?: ReactNode;
    sectionRef: (el: HTMLElement | null) => void;
    children: ReactNode;
}) => (
    <section ref={sectionRef} aria-label={label}>
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h3 className="text-[15px] font-bold text-ink">{label}</h3>
            {aside}
        </div>
        {children}
    </section>
);

/** 고르는 칩 (소요 시간). 고르면 검정 */
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
                ? 'border-ink bg-ink text-on-ink'
                : 'border-neutral-200 bg-surface text-ink hover:bg-neutral-50 disabled:border-neutral-100 disabled:text-neutral-300 disabled:hover:bg-surface',
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

/**
 * 팀 고르기: 메인의 팀 목록처럼 팀 색 바탕 칩 (22차, 이전: 흰 칩 + 색 점).
 * 고른 팀은 체크 표시와 팀 색 테두리(흰 간격을 둔 바깥 링). 팀 뒤에 소모임·일정
 */
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
                    'inline-flex h-9 max-w-full items-center gap-1 rounded-full px-3.5 text-[15px] font-medium text-white transition-[filter,scale] duration-150 hover:brightness-90 active:scale-[0.97]',
                    selected && 'font-bold',
                )}
                style={{
                    backgroundColor: option.color,
                    ...(selected && {
                        boxShadow: `0 0 0 2px var(--color-surface), 0 0 0 4px ${option.color}`,
                    }),
                }}
                onClick={() => onSelect(option.id)}
            >
                {selected && <Check className="-ml-0.5 size-4 shrink-0" aria-hidden />}
                <span className="truncate">{option.name}</span>
            </button>
        );
    };

    return (
        <div
            role="radiogroup"
            aria-label="팀"
            ref={scrollFadeRef}
            // 팀이 많으면 이 안에서 스크롤: 막대 없이 위·아래 끝을 흐리게 (V-3 5차).
            // 안쪽 여백은 안의 div에: 흐림(끝에 붙는 그러데이션)이 여백 안쪽이 아니라 테두리 바로 안에 붙게
            className={`${boxShape} edge-fade max-h-[264px] overflow-y-auto overscroll-contain border border-neutral-200 bg-surface`}
        >
            <div className="p-3">
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
        </div>
    );
};

/** 달력: min(오늘, 반복 종료는 시작 날짜)부터 고를 수 있다. 토요일은 파랑, 일요일은 빨강 (23차) */
const DatePicker = ({
    selected,
    min,
    onSelect,
}: {
    selected: Dayjs | null;
    min: Dayjs;
    onSelect: (date: Dayjs) => void;
}) => {
    const first = min.startOf('day');
    return (
        <div className={`${boxShape} mt-2 border border-neutral-200 bg-surface p-2`}>
            {/* 넓은 화면(PC 520px)에서 너무 퍼지지 않게 폭을 제한 */}
            <div className="mx-auto max-w-[360px]">
                <Calendar
                    mode="single"
                    required
                    locale={ko}
                    // 일요일부터 (25차, 이전: 합주판과 같이 월요일부터)
                    weekStartsOn={0}
                    selected={selected?.toDate()}
                    defaultMonth={(selected ?? first).toDate()}
                    startMonth={first.toDate()}
                    disabled={{ before: first.toDate() }}
                    showOutsideDays={false}
                    onSelect={(picked) => onSelect(dayjs(picked).startOf('day'))}
                    modifiers={{
                        saturday: (day) => day.getDay() === 6,
                        sunday: (day) => day.getDay() === 0,
                    }}
                    // 고른 날짜(검정 원)의 흰 글자가 이 색보다 우선한다 (data-selected 선택자가 더 구체적)
                    modifiersClassNames={{
                        saturday: '[&>button]:text-blue-600',
                        sunday: '[&>button]:text-red-500',
                    }}
                    className="w-full bg-transparent p-0 [--cell-radius:9999px] [--cell-size:--spacing(9)] [&_button]:rounded-full"
                    // 글자 크기는 px로 (공존 기간에는 html 글자 크기가 바뀌어 rem이 작아진다: 계획 문서 "공존 기간 규칙").
                    // 날짜 칸은 정사각형(폭에 따라 커짐) 대신 높이 38px 줄, 날짜 버튼은 36px 원 (22차: 달력이 크고 줄 간격이 넓었다)
                    classNames={{
                        root: 'w-full',
                        month: 'flex w-full flex-col gap-2',
                        caption_label: 'text-[16px] font-bold select-none',
                        // 요일 머리도 일(1번째)·토(7번째) 색
                        weekdays:
                            'flex [&>*:nth-child(1)]:text-red-500 [&>*:nth-child(7)]:text-blue-600',
                        weekday: 'flex-1 text-[13px] font-normal text-neutral-400 select-none',
                        week: 'mt-0.5 flex w-full',
                        day: 'group/day relative flex h-[38px] flex-1 items-center justify-center p-0 text-center select-none',
                        day_button: 'size-9 min-w-0 aspect-auto text-[15px]',
                        today: '[&>button]:bg-neutral-100',
                    }}
                />
            </div>
        </div>
    );
};

/** 막대·창·합주의 모서리 (모두 같은 값이라 양 끝에서 창과 합주가 막대 모서리에 딱 맞는다, 23차) */
const BAR_RADIUS = 'rounded-[10px]';

/**
 * 그날 동방: 09~24시 가로 막대에 그날 합주(겹치면 줄을 나눔, 쉬는 주는 점선)와 고른 시간(창).
 * 창을 좌우로 끌어 시작 시간을 고른다 (22차, 23차부터 시작 시간 칩 없이 이것만).
 * 창 밖을 누르면 그 자리를 가운데로 창이 옮겨 오고, 손을 떼지 않으면 이어서 끈다. 길이는 그대로, 막대 안에서만.
 * 세로로 밀면 Drawer가 스크롤된다 (touch-action: pan-y). 키보드는 슬라이더처럼 ←/→(30분)·PageUp/PageDown(1시간)·Home/End
 */
const DayBar = ({
    date,
    events,
    range,
    duration,
    color,
    onMove,
    notice,
}: {
    /** 날짜를 고르기 전에는 null (합주 없이 창만) */
    date: Dayjs | null;
    events: WithLane<CalendarEvent>[];
    range: SlotRange;
    /** 창의 길이 (시간칸 수) */
    duration: number;
    color: string;
    /** 창의 시작 시간칸이 바뀜 (길이가 막대 안에 들어가게 이미 맞춘 값) */
    onMove: (slot: TimeSlot) => void;
    /** 막대 아래 고정된 한 줄 (겹침 알림). 없으면 빈 줄 */
    notice: ReactNode;
}) => {
    const percent = (slots: number) => `${(slots / SLOT_COUNT) * 100}%`;
    const drag = useRef<{ pointerId: number; originX: number; originSlot: number } | null>(null);
    const [dragging, setDragging] = useState(false);
    const lastStart = SLOT_COUNT - duration;
    const clampStart = (slot: number) => Math.min(lastStart, Math.max(0, slot));
    const moveTo = (slot: number) => {
        const next = clampStart(slot);
        if (next !== range.startTime) onMove(next);
    };

    const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width === 0) return;
        const slotWidth = rect.width / SLOT_COUNT;
        const slot = Math.floor((e.clientX - rect.left) / slotWidth);
        let originSlot: number;
        if (range.startTime <= slot && slot <= range.endTime) {
            originSlot = range.startTime; // 창을 잡음
        } else {
            originSlot = clampStart(slot - Math.floor(duration / 2)); // 누른 자리를 가운데로
            moveTo(originSlot);
        }
        drag.current = { pointerId: e.pointerId, originX: e.clientX, originSlot };
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setDragging(true);
    };
    const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const current = drag.current;
        if (!current || current.pointerId !== e.pointerId) return;
        const slotWidth = e.currentTarget.getBoundingClientRect().width / SLOT_COUNT;
        moveTo(current.originSlot + Math.round((e.clientX - current.originX) / slotWidth));
    };
    const endDrag = () => {
        drag.current = null;
        setDragging(false);
    };
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const step = { ArrowLeft: -1, ArrowRight: 1, PageDown: -2, PageUp: 2 }[e.key];
        if (step !== undefined) moveTo(range.startTime + step);
        else if (e.key === 'Home') moveTo(0);
        else if (e.key === 'End') moveTo(lastStart);
        else return;
        e.preventDefault();
    };

    return (
        <div>
            <p className="mb-1.5 truncate text-[13px] text-neutral-500">
                {date ? `이날 동방 · ${formatDate(date)}` : '이날 동방'}
                <span className="text-neutral-400"> · 끌어서 시간을 선택하세요</span>
            </p>
            <div
                role="slider"
                tabIndex={0}
                aria-label="시작 시간"
                aria-valuemin={0}
                aria-valuemax={lastStart}
                aria-valuenow={range.startTime}
                aria-valuetext={formatTimeRange(range.startTime, range.endTime)}
                data-vaul-no-drag
                data-day-bar
                className={cn(
                    BAR_RADIUS,
                    'relative h-11 touch-pan-y overflow-hidden bg-neutral-100 outline-none select-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
                )}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={handleKeyDown}
            >
                {events.map((event) => (
                    <span
                        key={event.id}
                        className={cn(
                            BAR_RADIUS,
                            'pointer-events-none absolute',
                            event.status === 'skipped' && 'border-[1.5px] border-dashed',
                        )}
                        style={{
                            left: percent(event.startTime),
                            width: percent(event.endTime + 1 - event.startTime),
                            top: `${(event.lane / event.lanes) * 100}%`,
                            height: `${100 / event.lanes}%`,
                            // 연하게 (25차에 되돌림: 23차의 본래 색보다 고른 시간 창이 잘 보인다). 이웃한 합주와는 안쪽 흰 선으로 구분
                            ...(event.status === 'skipped'
                                ? { borderColor: event.color }
                                : {
                                      backgroundColor: event.color,
                                      opacity: 0.55,
                                      boxShadow: 'inset 0 0 0 1px var(--color-surface)',
                                  }),
                        }}
                    />
                ))}
                <span
                    data-selected-range
                    className={cn(
                        BAR_RADIUS,
                        'pointer-events-none absolute inset-y-0 flex items-center justify-center border-2',
                        !dragging && 'transition-[left,width] duration-150',
                    )}
                    style={{
                        left: percent(range.startTime),
                        width: percent(range.endTime + 1 - range.startTime),
                        borderColor: color,
                        // 본래 색인 합주 위에서도 보이게 테두리 안쪽에 바탕색 선 (밝은 화면은 흰 선)
                        boxShadow:
                            'inset 0 0 0 2px color-mix(in srgb, var(--color-surface) 90%, transparent)',
                        backgroundColor: `color-mix(in srgb, ${color} 30%, transparent)`,
                    }}
                >
                    {/* 끌 수 있다는 표시 (1시간 이상일 때만, 30분 창은 너무 좁음) */}
                    {duration >= 2 && (
                        <GripVertical
                            className="size-4 shrink-0 drop-shadow-[0_0_1px_white]"
                            style={{ color }}
                        />
                    )}
                </span>
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
            {/* 겹침 알림 자리: 있든 없든 높이가 같아 아래 배치가 움직이지 않는다 */}
            <div role="status" className="mt-1.5 flex h-5 items-center text-[13px] font-medium">
                {notice}
            </div>
        </div>
    );
};

export default AddEnsembleDrawer;
