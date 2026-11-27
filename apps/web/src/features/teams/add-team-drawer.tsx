import { useRef, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
    CalendarX2,
    ChevronLeft,
    Globe,
    Infinity as InfinityIcon,
    LoaderCircle,
    School,
    Users,
    X,
} from 'lucide-react';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerTitle,
} from '@/components/ui/drawer';
import { scrollFadeRef } from '@/components/ui/scroll-fade';
import {
    boxShape,
    overlayClassName,
    pressable,
    scrollAreaClassName,
    sheetClassName,
} from '@/components/sheet/drawer-parts';
import {
    DatePicker,
    DateToggle,
    Hint,
    Section,
    Segmented,
    useSectionScroll,
} from '@/components/sheet/form-parts';
import { useKeyboardSheet } from '@/components/sheet/keyboard-sheet';
import { PIN_LENGTH, PinSlots } from '@/components/sheet/pin-step';
import { days, demoNames } from '@/constants/index';
import { cn } from '@/lib/utils';
import { useDrawerStore } from '@/stores/drawer';
import { eventColors } from '@/constants/colors';
import type { LegacyTeamType, TeamType } from '@/types/index';
import { useEditTeamStore, type EditTeamTarget } from './edit-team-store';
import { TEAM_DUE_ENABLED } from './team-due';
import type { HandleAddTeam, HandleUpdateTeam } from './types';

// 팀 추가 Drawer (View 개편 V-3 10차). 아래에서 올라오는 Drawer 하나에서 모두 입력한다
// (이전: 오른쪽에서 쌓이는 옛 Drawer 6단계: 종류 → 이름 → 팀원 → 셋리 → PIN 두 번 → 완료 화면 "팀을 만들었어요").
// 입력(종류·이름·팀원·셋리스트·자동 삭제) → "다음" → 같은 Drawer 안의 PIN 만들기(한 번 넣고, 확인으로 한 번 더) → 저장.
// 합주 잡기 Drawer에서 해결한 것들을 그대로 따른다: 스크롤 막대 없이 끝 흐림, 끝에서 튕기지 않음, 아래 끝은 Drawer 바탕,
// 아이폰 키보드 처리(keyboardSheet), 글자 크기 16px(아이폰이 입력칸을 누를 때 확대하지 않게), 닫히는 동안 내용 유지

/** 팀 종류 (V-3 10차: 4개 → 3개, 서버에 이 문자열 그대로) */
const TEAM_TYPES = [
    ['교내 공연', '교내 공연', School],
    ['외부 공연', '외부 공연', Globe],
    ['기타 팀', '기타 팀', Users],
] as const;

/** 옛 팀 종류(V-3 10차 전) → 새 종류. 수정할 때 새 종류로 바꿔 채운다 (저장하면 새 종류로 바뀐다) */
const FROM_LEGACY: Record<LegacyTeamType, TeamType> = {
    '세마치공연(정기/연말)': '교내 공연',
    '교내공연(축제/버스킹)': '교내 공연',
    '외부공연(연합/대외)': '외부 공연',
    '기타 등등': '기타 팀',
};

function toTeamType(type: string): TeamType | null {
    if (TEAM_TYPES.some(([value]) => value === type)) return type as TeamType;
    return FROM_LEGACY[type as LegacyTeamType] ?? null;
}

const TYPE_HINTS: Record<TeamType, string> = {
    '교내 공연': '정기공연, 연말공연, 축제, 버스킹 등',
    '외부 공연': '연합공연, 대외공연, 버스킹 등',
    '기타 팀': '공연 없는 팀, 기타 일정 등',
};

/** desc의 앞 6칸 (7번째는 셋리스트). 팀 정보 Drawer와 같은 순서·색 */
const MEMBER_LABELS = ['보컬', '기타', '베이스', '드럼', '키보드', '매니저'];

/** 글자 수 제한 (옛 Drawer와 같음): 팀명 20, 팀원 칸마다 12, 셋리스트 200 */
const NAME_MAX = 20;
const MEMBER_MAX = 12;
const SETLIST_MAX = 200;
/** 셋리스트 칸 높이: 줄 수만큼 4~10줄 (옛 Drawer와 같음) */
const SETLIST_MIN_ROWS = 4;
const SETLIST_MAX_ROWS = 10;

/** 계속 유지를 뜻하는 팀 due (합주의 계속 반복과 같은 값) */
const NO_TEAM_DUE = '2099-12-31';

/** "12월 21일 월요일" (합주 잡기 Drawer와 같은 모양) */
const formatLongDate = (date: Dayjs) =>
    `${date.month() + 1}월 ${date.date()}일 ${days[(date.day() + 6) % 7]}요일`;

interface AddTeamDrawerProps {
    /** add: 팀 추가(입력 → PIN 만들기), update: 팀 수정(팀 정보에서 PIN이 맞은 뒤, V-3 13차) */
    mode?: 'add' | 'update';
    onSubmit?: HandleAddTeam;
    onUpdate?: HandleUpdateTeam;
}

const AddTeamDrawer = ({ mode = 'add', onSubmit, onUpdate }: AddTeamDrawerProps) => {
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);
    const closeDrawer = useDrawerStore((state) => state.closeDrawer);
    const setOpenedDrawers = useDrawerStore((state) => state.setOpenedDrawers);
    const target = useEditTeamStore((state) => state.target);
    const open =
        openedDrawers[openedDrawers.length - 1] === (mode === 'update' ? 'updateTeam' : 'addTeam');
    // 수정은 저장하지 않고 닫아도 팀 정보로 돌아간다 (합주 수정과 같음)
    const handleClose = () => (mode === 'update' ? setOpenedDrawers(['teamInfo']) : closeDrawer());

    // 열 때마다 입력을 새로 시작한다 (session). 닫히는 동안은 마지막 입력이 그대로 보인다
    const [session, setSession] = useState(0);
    const [wasOpen, setWasOpen] = useState(false);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) setSession((n) => n + 1);
    }

    // 입력칸이 있어 열려 있는 동안 키보드 처리 (keyboardSheet)
    const sheet = useKeyboardSheet(open);

    return (
        <Drawer
            open={open}
            onOpenChange={(next) => !next && handleClose()}
            // 키보드 위치 맞추기는 직접 한다 (keyboardSheet)
            repositionInputs={false}
        >
            <DrawerContent
                className={sheetClassName}
                style={sheet.style}
                overlayClassName={overlayClassName}
                handleClassName="absolute inset-x-0 top-2.5 z-10 mt-0 w-10 bg-neutral-300"
            >
                {session > 0 && (mode === 'add' || target) && (
                    <AddTeamForm
                        key={session}
                        edit={mode === 'update' ? target : null}
                        onSubmit={onSubmit}
                        onUpdate={onUpdate}
                        keyboardOpen={sheet.keyboardOpen}
                    />
                )}
            </DrawerContent>
            {sheet.cover}
        </Drawer>
    );
};

/** 터치 화면(휴대폰·태블릿): 글자를 쓰는 동안 "다음" 버튼을 숨긴다 */
const isTouch = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;

/** 글자 입력칸 (팀명·팀원·셋리스트) */
const isTextField = (el: EventTarget | null) =>
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

const AddTeamForm = ({
    edit,
    onSubmit,
    onUpdate,
    keyboardOpen,
}: Omit<AddTeamDrawerProps, 'mode'> & {
    /** 수정할 팀의 지금 값 (팀 추가면 null) */
    edit: EditTeamTarget | null;
    /** 화면 키보드가 열려 있는지 (keyboardSheet) */
    keyboardOpen: boolean;
}) => {
    const [step, setStep] = useState<'form' | 'pin'>('form');
    // 고르거나 다 쓰면 그 소제목을 맨 위로 (팀원·셋리스트는 맨 아래로), 합주 잡기 Drawer와 같은 방식 (V-3 14차)
    const { areaRef, sectionRef, scrollTo } = useSectionScroll<'type' | 'name'>();
    const membersRef = useRef<HTMLDivElement>(null);
    // 기본은 교내 공연 (V-3 11차). 수정이면 지금 값 (옛 종류는 새 종류로)
    const initialType = edit ? toTeamType(edit.type) : '교내 공연';
    const [type, setType] = useState<TeamType | null>(initialType);
    const [submitting, setSubmitting] = useState(false);
    // 글자를 쓰는 중 (입력칸에 포커스). 입력칸 사이를 옮겨 다니는 동안은 계속 쓰는 중
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(edit?.name ?? '');
    // 팀명 칸의 예시: 세계적인 록 밴드 중 하나 (열 때마다 바뀜, 옛 Drawer와 같음)
    const [demoName] = useState(
        () => demoNames[Math.floor(Math.random() * demoNames.length)] ?? '',
    );
    const [members, setMembers] = useState<string[]>(() =>
        MEMBER_LABELS.map((_, idx) => edit?.desc[idx] ?? ''),
    );
    const [setlist, setSetlist] = useState(edit?.desc[6] ?? '');
    // 팀 자동 삭제 (적용 예정: TEAM_DUE_ENABLED). 기본은 계속 유지
    const [hasDue, setHasDue] = useState(edit?.due != null);
    const [due, setDue] = useState<Dayjs | null>(edit?.due ?? null);
    const [dueOpen, setDueOpen] = useState(false);

    const missing = !type
        ? '팀 종류를 골라 주세요'
        : !name.trim()
          ? '팀명을 써 주세요'
          : TEAM_DUE_ENABLED && hasDue && !due
            ? '삭제 날짜를 골라 주세요'
            : null;

    const desc = [...members.map((member) => member.trim()), setlist];
    const dueValue = hasDue && due ? due.format('YYYY-MM-DD') : NO_TEAM_DUE;
    // 수정: 지금 값에서 바뀐 것이 없으면 저장할 수 없다 (옛 종류는 새 종류로 바꿔 채운 것과 비교)
    const unchanged =
        edit !== null &&
        type === initialType &&
        name.trim() === edit.name &&
        desc.every(
            (value, idx) =>
                value === (idx < 6 ? (edit.desc[idx] ?? '').trim() : (edit.desc[6] ?? '')),
        ) &&
        (!TEAM_DUE_ENABLED ||
            (hasDue && due ? edit.due !== null && due.isSame(edit.due, 'day') : edit.due === null));

    // 수정 저장: 실패하면 입력을 그대로 두고 다시 누를 수 있게 (성공하면 팀 정보로 돌아간다)
    const update = async () => {
        if (!edit || !onUpdate || missing !== null || unchanged || submitting) return;
        setSubmitting(true);
        const saved = await onUpdate(
            edit.id,
            {
                type: type!, // missing === null
                name: name.trim(),
                desc,
                ...(TEAM_DUE_ENABLED && { due: dueValue }),
            },
            edit.pin,
        );
        if (!saved) setSubmitting(false);
    };

    const save = (pin: string) =>
        onSubmit!({
            type: type!, // PIN 단계는 빠진 것이 없을 때만 (missing === null)
            name: name.trim(),
            desc,
            pin,
            ...(TEAM_DUE_ENABLED && { due: dueValue }),
        });

    if (step === 'pin') {
        return (
            <PinCreateStep teamName={name.trim()} onBack={() => setStep('form')} onDone={save} />
        );
    }

    // 안 써도 되는 칸 (V-3 11차): 비어 있으면 "다음 (… 나중에 적기)" (팀 추가만. 12차의 테두리 버튼은 13차에 되돌림)
    const membersEmpty = members.every((member) => !member.trim());
    const setlistEmpty = !setlist.trim();
    const later =
        membersEmpty && setlistEmpty
            ? '팀원 및 셋리스트'
            : membersEmpty
              ? '팀원'
              : setlistEmpty
                ? '셋리스트'
                : null;
    // 휴대폰에서 글자를 쓰는 동안(키보드가 열려 있으면)은 "다음" 버튼을 숨긴다 (V-3 11차): 키보드 위에 딸려 올라와
    // 팀명만 쓰고 눌러야 할 것처럼 보였다 (팀원·셋리스트를 건너뛰고 PIN으로 넘어감)
    const hideFooter = keyboardOpen || (editing && isTouch());
    const ready = missing === null && !unchanged && !submitting;

    const setlistRows = Math.min(
        Math.max(setlist.split('\n').length, SETLIST_MIN_ROWS),
        SETLIST_MAX_ROWS,
    );

    return (
        <>
            <div
                ref={areaRef}
                className={cn(scrollAreaClassName, 'flex-1')}
                onFocus={(e) => isTextField(e.target) && setEditing(true)}
                onBlur={(e) => !isTextField(e.relatedTarget) && setEditing(false)}
            >
                {/* 머리 */}
                <div className="flex items-start justify-between gap-3 px-5 pt-[26px] md:px-7">
                    <div className="min-w-0">
                        <DrawerTitle className="text-[26px] leading-tight font-bold text-ink md:text-[28px]">
                            {edit ? '팀 수정' : '팀 추가'}
                        </DrawerTitle>
                        {/* 설명 문구는 화면에서 뺐다 (V-3 11차). 읽기 프로그램용으로만 */}
                        <DrawerDescription className="sr-only">
                            {edit ? '팀 정보를 고쳐요' : '팀 정보를 쓰고, 다음에 PIN을 만들어요'}
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

                <div className="flex flex-col gap-6 px-5 pt-5 pb-6 md:px-7">
                    {/* 팀 종류: 고르면 아래에 설명 */}
                    <Section label="팀 종류" sectionRef={sectionRef('type')}>
                        <Segmented
                            label="팀 종류"
                            value={type}
                            options={TEAM_TYPES}
                            onChange={(value) => {
                                setType(value);
                                scrollTo('type');
                            }}
                        />
                        {type && <Hint>{TYPE_HINTS[type]}</Hint>}
                    </Section>

                    {/* 팀명 */}
                    <Section
                        label="팀명"
                        sectionRef={sectionRef('name')}
                        aside={<Counter length={name.length} max={NAME_MAX} />}
                    >
                        <input
                            type="text"
                            aria-label="팀명"
                            value={name}
                            maxLength={NAME_MAX}
                            placeholder={demoName}
                            autoComplete="off"
                            enterKeyHint="next"
                            className={cn(
                                boxShape,
                                'h-14 w-full border border-neutral-200 bg-surface px-4 text-[17px] font-bold text-ink outline-none placeholder:font-normal placeholder:text-neutral-400 focus:border-ink',
                            )}
                            onChange={(e) => setName(e.target.value)}
                            // 다 쓰면(포커스가 빠지면) "팀명"을 맨 위로. 키보드의 다음(Enter)은 보컬 칸으로
                            onBlur={() => name.trim() && scrollTo('name')}
                            onKeyDown={(e) => {
                                if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                                e.preventDefault();
                                membersRef.current?.querySelector('input')?.focus();
                            }}
                        />
                    </Section>

                    {/* 팀원 (안 써도 된다) */}
                    <Section label="팀원">
                        <div
                            ref={membersRef}
                            className="grid grid-cols-2 gap-2 md:grid-cols-3"
                            // 팀원 칸들을 벗어나면(다 쓰면) 맨 아래로. 칸 사이를 옮겨 다니는 동안은 그대로
                            onBlur={(e) => {
                                if (e.currentTarget.contains(e.relatedTarget as Node | null))
                                    return;
                                if (members.some((member) => member.trim())) scrollTo('bottom');
                            }}
                        >
                            {MEMBER_LABELS.map((label, idx) => (
                                <label
                                    key={label}
                                    className={cn(
                                        boxShape,
                                        'block border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 transition-colors focus-within:border-ink focus-within:bg-surface',
                                    )}
                                >
                                    <span className="flex items-center gap-1.5 text-[13px] text-neutral-500">
                                        <span
                                            aria-hidden
                                            className="size-2 shrink-0 rounded-full"
                                            style={{ backgroundColor: eventColors[idx] }}
                                        />
                                        {label}
                                    </span>
                                    <input
                                        type="text"
                                        value={members[idx] ?? ''}
                                        maxLength={MEMBER_MAX}
                                        placeholder="이름"
                                        autoComplete="off"
                                        className="mt-0.5 w-full bg-transparent text-[16px] font-bold text-ink outline-none placeholder:font-normal placeholder:text-neutral-400"
                                        onChange={(e) =>
                                            setMembers((prev) =>
                                                prev.map((member, i) =>
                                                    i === idx ? e.target.value : member,
                                                ),
                                            )
                                        }
                                    />
                                </label>
                            ))}
                        </div>
                        <Hint>
                            가능한 한 실명으로 써주세요. 특별한 사유 없이 알아보지 못하게 쓰면
                            제재해요.
                        </Hint>
                    </Section>

                    {/* 셋리스트 및 팀 정보 (안 써도 된다) */}
                    <Section
                        label="셋리스트 및 팀 정보"
                        aside={<Counter length={setlist.length} max={SETLIST_MAX} />}
                    >
                        <textarea
                            aria-label="셋리스트 및 팀 정보"
                            value={setlist}
                            maxLength={SETLIST_MAX}
                            rows={setlistRows}
                            className={cn(
                                boxShape,
                                'block w-full resize-none border border-neutral-200 bg-surface px-4 py-3 text-[16px] leading-[1.6] text-ink outline-none placeholder:text-neutral-400 focus:border-ink',
                            )}
                            placeholder={'아티스트 - 제목\n...'}
                            onChange={(e) => setSetlist(e.target.value)}
                            // 다 쓰면 맨 아래로
                            onBlur={() => setlist.trim() && scrollTo('bottom')}
                        />
                        <Hint>가능한 한 작성해주세요.</Hint>
                    </Section>

                    {/* 팀 자동 삭제 (적용 예정: 백엔드 팀 스키마에 due가 생기면 TEAM_DUE_ENABLED를 켠다) */}
                    {TEAM_DUE_ENABLED && (
                        <Section label="팀 자동 삭제">
                            <Segmented
                                label="팀 자동 삭제"
                                value={hasDue}
                                options={[
                                    [false, '계속 유지', InfinityIcon],
                                    [true, '삭제 날짜 지정', CalendarX2],
                                ]}
                                onChange={(value) => {
                                    setHasDue(value);
                                    // 날짜를 지정하면 바로 달력을 연다
                                    setDueOpen(value && !due);
                                }}
                            />
                            {hasDue && (
                                <div className="mt-2.5">
                                    <DateToggle
                                        open={dueOpen}
                                        text={due ? `${formatLongDate(due)}까지` : null}
                                        placeholder="삭제 날짜 선택"
                                        onClick={() => setDueOpen(!dueOpen)}
                                    />
                                    {dueOpen && (
                                        <DatePicker
                                            selected={due}
                                            min={dayjs()}
                                            onSelect={(picked) => {
                                                setDue(picked);
                                                setDueOpen(false);
                                            }}
                                        />
                                    )}
                                    <Hint>이 날짜 이후에 자동으로 삭제돼요</Hint>
                                </div>
                            )}
                        </Section>
                    )}
                </div>
            </div>

            {/* 다음 버튼은 스크롤과 관계없이 맨 아래 (합주 잡기 Drawer와 같음). 휴대폰에서 글자를 쓰는 동안은 숨긴다 */}
            <div
                className={cn(
                    'border-t border-neutral-100 bg-surface px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:px-7',
                    hideFooter && 'hidden',
                )}
            >
                <button
                    type="button"
                    disabled={!ready}
                    className={cn(
                        boxShape,
                        // "다음"과 "(… 나중에 적기)" 사이 한 칸 (flex 안에서는 공백 글자가 사라져 gap으로)
                        'flex h-14 w-full items-center justify-center gap-[0.3em] text-[17px] font-bold transition-[background-color,scale] duration-150',
                        ready
                            ? 'bg-ink text-on-ink hover:bg-neutral-800 active:scale-[0.98]'
                            : 'bg-neutral-100 text-neutral-400',
                    )}
                    onClick={() => (edit ? void update() : setStep('pin'))}
                >
                    {missing ??
                        (edit ? (
                            submitting ? (
                                '저장하는 중…'
                            ) : unchanged ? (
                                '바뀐 내용이 없어요'
                            ) : (
                                '수정하기'
                            )
                        ) : (
                            <>
                                다음
                                {later && ' '}
                                {later && (
                                    <span className="text-[14px] font-medium opacity-70">
                                        ({later} 나중에 적기)
                                    </span>
                                )}
                            </>
                        ))}
                </button>
            </div>
        </>
    );
};

/** 글자 수 "3/20" (꽉 차면 진하게) */
const Counter = ({ length, max }: { length: number; max: number }) => (
    <span
        className={cn(
            'text-[13px] tabular-nums',
            length >= max ? 'font-bold text-ink' : 'text-neutral-400',
        )}
    >
        {length}/{max}
    </span>
);

/** 틀린(서로 다른) PIN을 비우기까지 (흔들기 애니메이션 0.36초가 끝난 뒤, PinStep과 같음) */
const CLEAR_DELAY_MS = 450;
/** 첫 PIN을 다 넣은 뒤 확인 단계로 넘어가기까지 (4칸이 다 찬 것을 잠깐 보여준다) */
const NEXT_DELAY_MS = 180;

/**
 * PIN 만들기: 4자리를 넣고, 확인으로 한 번 더 (같은 칸이 비워지며 "한 번 더"로 바뀐다).
 * 두 번 받는 이유: PIN은 팀 수정·삭제와 합주 변경에 쓰는데 되찾을 방법이 없어, 잘못 누른 채 만들면 팀을 못 바꾼다.
 * 서로 다르면 흔든 뒤 처음부터. 같으면 바로 저장하고, 실패하면 처음부터 (알림은 저장하는 쪽에서)
 */
const PinCreateStep = ({
    teamName,
    onBack,
    onDone,
}: {
    teamName: string;
    onBack: () => void;
    onDone: (pin: string) => Promise<boolean>;
}) => {
    const [phase, setPhase] = useState<'first' | 'confirm' | 'saving'>('first');
    const [first, setFirst] = useState('');
    const [value, setValue] = useState('');
    const [mismatch, setMismatch] = useState(false);
    const [attempt, setAttempt] = useState(0);

    const restart = () => {
        setFirst('');
        setValue('');
        setPhase('first');
    };

    const handleChange = async (next: string) => {
        setValue(next);
        if (next.length > 0) setMismatch(false);
        if (next.length < PIN_LENGTH) return;
        if (phase === 'first') {
            setFirst(next);
            setTimeout(() => {
                setValue('');
                setPhase('confirm');
            }, NEXT_DELAY_MS);
            return;
        }
        if (next !== first) {
            setMismatch(true);
            setAttempt((n) => n + 1);
            setTimeout(restart, CLEAR_DELAY_MS);
            return;
        }
        setPhase('saving');
        if (!(await onDone(next))) restart(); // 성공하면 Drawer가 닫힌다
    };

    const confirming = phase !== 'first';

    return (
        <div ref={scrollFadeRef} className={scrollAreaClassName}>
            <div className="px-5 pt-[26px] pb-[calc(24px+env(safe-area-inset-bottom))] duration-200 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 md:px-7">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        aria-label="뒤로"
                        disabled={phase === 'saving'}
                        className={`${pressable} -ml-2 inline-flex size-10 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100`}
                        onClick={onBack}
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
                {/* 어떤 팀인지 */}
                <p className="mt-3 truncate text-[14px] text-neutral-500">{teamName}</p>
                <DrawerTitle className="mt-1.5 text-[24px] leading-tight font-bold text-ink md:text-[26px]">
                    {confirming ? '한 번 더 입력해 주세요' : 'PIN을 만들어 주세요'}
                </DrawerTitle>
                <DrawerDescription className="mt-1.5 text-[15px] break-keep text-neutral-500">
                    {confirming
                        ? '확인을 위해 같은 PIN을 다시 입력해 주세요'
                        : '숫자 4자리. 잊지 않게 팀원과 공유해 두세요'}
                </DrawerDescription>
                <div className="mt-7 flex flex-col items-center">
                    <PinSlots
                        value={value}
                        onChange={handleChange}
                        invalid={mismatch}
                        attempt={attempt}
                        disabled={phase === 'saving'}
                    />
                    <p
                        role="status"
                        className={cn(
                            'mt-3 flex h-5 items-center gap-1 text-[14px]',
                            mismatch ? 'text-red-600' : 'text-neutral-500',
                        )}
                    >
                        {mismatch && 'PIN이 서로 달라요. 처음부터 다시 입력해 주세요'}
                        {phase === 'saving' && (
                            <>
                                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                                팀을 만드는 중…
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AddTeamDrawer;
