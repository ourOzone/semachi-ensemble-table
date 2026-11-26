import type { ComponentType, ReactNode } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { ko } from 'react-day-picker/locale';
import { CalendarDays, ChevronDown, Info } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { boxShape, pressable } from './drawerParts';

// 입력 Drawer(합주 잡기·수정, 팀 추가)가 함께 쓰는 입력 부품 (V-3 10차에 합주 잡기 Drawer에서 꺼냄, 모양 그대로)

/** 소제목 + 내용. 오른쪽에 덧붙일 것(aside)이 있으면 같은 줄에 */
export const Section = ({
    label,
    aside,
    sectionRef,
    children,
}: {
    label: string;
    aside?: ReactNode;
    sectionRef?: (el: HTMLElement | null) => void;
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

/** 소제목 아래의 작은 안내 문구 (정보 아이콘) */
export const Hint = ({ children, className }: { children: ReactNode; className?: string }) => (
    <p
        className={cn(
            'mt-2 flex items-start gap-1.5 text-[13px] leading-snug break-keep text-neutral-500',
            className,
        )}
    >
        <Info className="mt-px size-3.5 shrink-0" aria-hidden />
        <span>{children}</span>
    </p>
);

/**
 * 여러 개 중 하나를 고르는 칸 (반복 여부, 반복 종료, 팀 종류). 아무것도 고르지 않은 상태(null)도 있다.
 * disabled로 고를 수 없는 칸을 정한다 (팀 삭제 예정일이 있으면 "계속 반복", V-3 10차)
 */
export function Segmented<T extends boolean | string>({
    label,
    value,
    options,
    onChange,
    disabled,
}: {
    label: string;
    value: T | null;
    options: readonly (readonly [T, string, ComponentType<{ className?: string }>?])[];
    onChange: (value: T) => void;
    disabled?: (value: T) => boolean;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={label}
            className="grid gap-1 rounded-2xl bg-neutral-100 p-1"
            style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        >
            {options.map(([option, text, Icon]) => {
                const off = disabled?.(option) ?? false;
                return (
                    <button
                        key={text}
                        type="button"
                        role="radio"
                        aria-checked={value === option}
                        disabled={off}
                        className={cn(
                            'flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1 text-[15px] font-medium transition-[background-color,color,box-shadow] duration-150',
                            value === option
                                ? 'bg-surface font-bold text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]'
                                : 'text-neutral-600 hover:text-ink',
                            off && 'text-neutral-300 hover:text-neutral-300',
                        )}
                        onClick={() => onChange(option)}
                    >
                        {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
                        <span className="truncate">{text}</span>
                    </button>
                );
            })}
        </div>
    );
}

/** 달력을 펼치고 접는 줄 (고른 날짜, 없으면 안내 문구) */
export const DateToggle = ({
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

/**
 * 달력: min(오늘, 반복 종료는 시작 날짜)부터 max(있으면: 팀 삭제 예정일, V-3 10차)까지 고를 수 있다.
 * 토요일은 파랑, 일요일은 빨강 (23차)
 */
export const DatePicker = ({
    selected,
    min,
    max,
    onSelect,
}: {
    selected: Dayjs | null;
    min: Dayjs;
    max?: Dayjs | null;
    onSelect: (date: Dayjs) => void;
}) => {
    const first = min.startOf('day');
    const last = max?.startOf('day');
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
                    endMonth={last?.toDate()}
                    disabled={
                        last
                            ? [{ before: first.toDate() }, { after: last.toDate() }]
                            : { before: first.toDate() }
                    }
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
