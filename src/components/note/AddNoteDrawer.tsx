import { useState, type FormEvent } from 'react';
import { ChevronLeft, LoaderCircle, X } from 'lucide-react';
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
} from '@/components/schedule/drawerParts';
import { Section } from '@/components/schedule/formParts';
import { useKeyboardSheet } from '@/components/schedule/keyboardSheet';
import { PIN_LENGTH, PinSlots } from '@/components/schedule/PinStep';
import { cn } from '@/lib/utils';
import { useDrawerStore } from '@/stores/drawer';

// 날적이 남기기 Drawer (View 개편 V-4). 아래에서 올라오는 Drawer 하나에서 글 → "다음" → 같은 Drawer 안의 PIN → "남기기"
// (이전: 오른쪽에서 열리는 옛 Drawer에 글·PIN 한 칸·"완료", 알림 없음).
// 팀 추가 Drawer와 같은 규칙: 스크롤 막대 없이 끝 흐림, 아이폰 키보드 처리(keyboardSheet), 글자 16px 이상,
// 휴대폰에서 글을 쓰는 동안 아래 버튼 숨김, 닫히는 동안 내용 유지.
// PIN은 한 번만 받는다 (사용자 결정: 잊어도 관리자가 지울 수 있는 가벼운 기능)

/** 글자 수 제한 (옛 Drawer와 같음) */
const TEXT_MAX = 200;
/** 글 칸 높이: 줄 수만큼 4~10줄 (옛 Drawer와 같음) */
const MIN_ROWS = 4;
const MAX_ROWS = 10;

interface AddNoteDrawerProps {
    /** 저장. 성공하면 true (Drawer는 저장하는 쪽이 닫는다), 실패하면 false (알림도 저장하는 쪽에서) */
    onSubmit: (text: string, pin: string) => Promise<boolean>;
}

const AddNoteDrawer = ({ onSubmit }: AddNoteDrawerProps) => {
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);
    const closeDrawer = useDrawerStore((state) => state.closeDrawer);
    const open = openedDrawers[openedDrawers.length - 1] === 'addNote';

    // 열 때마다 입력을 새로 시작한다 (session). 닫히는 동안은 마지막 입력이 그대로 보인다 (팀 추가와 같음)
    const [session, setSession] = useState(0);
    const [wasOpen, setWasOpen] = useState(false);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) setSession((n) => n + 1);
    }

    const sheet = useKeyboardSheet(open);

    return (
        <Drawer
            open={open}
            onOpenChange={(next) => !next && closeDrawer()}
            // 키보드 위치 맞추기는 직접 한다 (keyboardSheet)
            repositionInputs={false}
        >
            <DrawerContent
                className={sheetClassName}
                style={sheet.style}
                overlayClassName={overlayClassName}
                handleClassName="absolute inset-x-0 top-2.5 z-10 mt-0 w-10 bg-neutral-300"
            >
                {session > 0 && (
                    <AddNoteForm
                        key={session}
                        onSubmit={onSubmit}
                        keyboardOpen={sheet.keyboardOpen}
                    />
                )}
            </DrawerContent>
            {sheet.cover}
        </Drawer>
    );
};

/** 터치 화면(휴대폰·태블릿): 글을 쓰는 동안 "다음" 버튼을 숨긴다 (팀 추가와 같음) */
const isTouch = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;

const AddNoteForm = ({
    onSubmit,
    keyboardOpen,
}: AddNoteDrawerProps & { keyboardOpen: boolean }) => {
    const [step, setStep] = useState<'form' | 'pin'>('form');
    const [text, setText] = useState('');
    const [editing, setEditing] = useState(false);
    // 공백·줄바꿈만 있는 글은 남길 수 없다 (V-4, 이전: 그대로 남겨졌다). 앞뒤 공백은 빼고 보낸다
    const trimmed = text.trim();

    if (step === 'pin') {
        return (
            <PinCreateStep
                text={trimmed}
                onBack={() => setStep('form')}
                onDone={(pin) => onSubmit(trimmed, pin)}
            />
        );
    }

    const hideFooter = keyboardOpen || (editing && isTouch());
    const ready = trimmed.length > 0;
    const rows = Math.min(Math.max(text.split('\n').length, MIN_ROWS), MAX_ROWS);

    return (
        <>
            <div ref={scrollFadeRef} className={cn(scrollAreaClassName, 'flex-1')}>
                {/* 머리 */}
                <div className="flex items-start justify-between gap-3 px-5 pt-[26px] md:px-7">
                    <div className="min-w-0">
                        <DrawerTitle className="text-[26px] leading-tight font-bold text-ink md:text-[28px]">
                            날적이 남기기
                        </DrawerTitle>
                        <DrawerDescription className="sr-only">
                            날적이를 쓰고, 다음에 PIN을 정해요
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

                <div className="px-5 pt-5 pb-6 md:px-7">
                    <Section
                        label="내용"
                        aside={
                            <span
                                className={cn(
                                    'text-[13px] tabular-nums',
                                    text.length >= TEXT_MAX
                                        ? 'font-bold text-ink'
                                        : 'text-neutral-400',
                                )}
                            >
                                {text.length}/{TEXT_MAX}
                            </span>
                        }
                    >
                        <textarea
                            aria-label="날적이"
                            value={text}
                            maxLength={TEXT_MAX}
                            rows={rows}
                            // 쓰는 규칙 (V-4 2차, 사용자 문구)
                            placeholder={
                                '비방, 도배, 따끔한 일갈 등은 안 돼요. 정색 계열은 그냥 안 돼요.\n공지나 건의 등도 다른 창구를 이용해요. 유쾌하게만 사용해요.'
                            }
                            className={cn(
                                boxShape,
                                'block w-full resize-none border border-neutral-200 bg-surface px-4 py-3 text-[16px] leading-[1.6] break-keep text-ink outline-none placeholder:text-neutral-400 focus:border-ink',
                            )}
                            onChange={(e) => setText(e.target.value)}
                            onFocus={() => setEditing(true)}
                            onBlur={() => setEditing(false)}
                        />
                    </Section>
                </div>
            </div>

            {/* 다음 버튼은 맨 아래 (팀 추가와 같음). 휴대폰에서 글을 쓰는 동안은 숨긴다 */}
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
                        'flex h-14 w-full items-center justify-center text-[17px] font-bold transition-[background-color,scale] duration-150',
                        ready
                            ? 'bg-ink text-on-ink hover:bg-neutral-800 active:scale-[0.98]'
                            : 'bg-neutral-100 text-neutral-400',
                    )}
                    onClick={() => setStep('pin')}
                >
                    {ready ? '다음' : '내용을 써 주세요'}
                </button>
            </div>
        </>
    );
};

/**
 * PIN 정하기: 4자리를 넣고 "남기기" (PC는 Enter). 한 번만 받는다.
 * 저장에 실패하면 칸을 비워 다시 (알림은 저장하는 쪽에서), 성공하면 Drawer가 닫힌다
 */
const PinCreateStep = ({
    text,
    onBack,
    onDone,
}: {
    text: string;
    onBack: () => void;
    onDone: (pin: string) => Promise<boolean>;
}) => {
    const [pin, setPin] = useState('');
    const [saving, setSaving] = useState(false);
    const ready = pin.length === PIN_LENGTH && !saving;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!ready) return;
        setSaving(true);
        if (!(await onDone(pin))) {
            setPin('');
            setSaving(false);
        }
    };

    return (
        <div ref={scrollFadeRef} className={scrollAreaClassName}>
            <div className="px-5 pt-[26px] pb-[calc(24px+env(safe-area-inset-bottom))] duration-200 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 md:px-7">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        aria-label="뒤로"
                        disabled={saving}
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
                {/* 무엇을 남기는지 (두 줄까지) */}
                <p className="mt-3 line-clamp-2 text-[14px] break-keep whitespace-pre-line text-neutral-500 [overflow-wrap:anywhere]">
                    {text}
                </p>
                <DrawerTitle className="mt-1.5 text-[24px] leading-tight font-bold text-ink md:text-[26px]">
                    PIN을 정해 주세요
                </DrawerTitle>
                <DrawerDescription className="mt-1.5 text-[15px] break-keep text-neutral-500">
                    숫자 4자리. 날적이를 지울 때 필요해요
                </DrawerDescription>
                <form className="mt-7 flex flex-col items-center" onSubmit={handleSubmit}>
                    <PinSlots
                        value={pin}
                        onChange={setPin}
                        invalid={false}
                        attempt={0}
                        disabled={saving}
                    />
                    <button
                        type="submit"
                        disabled={!ready}
                        className={cn(
                            pressable,
                            boxShape,
                            'mt-8 flex h-14 w-full items-center justify-center gap-2 text-[16px] font-bold disabled:active:scale-100',
                            ready || saving
                                ? 'bg-ink text-on-ink hover:bg-neutral-800'
                                : 'bg-neutral-100 text-neutral-400',
                        )}
                    >
                        {saving && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
                        {saving ? '남기는 중…' : '남기기'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddNoteDrawer;
