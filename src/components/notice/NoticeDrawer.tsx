import { useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, LoaderCircle, Megaphone, X } from 'lucide-react';
import { checkNoticePin } from '@/api/notice';
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
import { useKeyboardSheet } from '@/components/schedule/keyboardSheet';
import PinStep from '@/components/schedule/PinStep';
import { linkify } from '@/components/note/linkify';
import { cn } from '@/lib/utils';
import { useDrawerStore } from '@/stores/drawer';
import type { Notice } from '@/types';

// 공지 Drawer (View 개편 V-5). 아래에서 올라오는 Drawer 하나에서 목록·올리기·삭제를 모두 한다
// (이전: 오른쪽에서 열리는 옛 Drawer 3개 — 목록, 올리기(글 + PIN 한 칸 + "완료"), 삭제(PIN 한 칸 + "진짜 삭제해요"), 알림 없음).
// 공지는 관리자만 쓰고, PIN은 고정된 관리자 PIN이다 (서버 check-notice-pin). 그래서 올리기는 PIN을 먼저 확인한 뒤 글을 쓴다
// (관리자가 아니면 글을 쓰기 전에 막힌다). 단계: 목록 → (올리기) PIN → 글 → 올리기 / (삭제) PIN → 삭제하기.
// 올리거나 삭제하면 목록으로 돌아온다. 팀 정보 Drawer와 같은 규칙: 스크롤 막대 없이 끝 흐림, 키보드 처리(keyboardSheet)

type Step = 'list' | 'addPin' | 'write' | 'delete';

interface NoticeDrawerProps {
    notices: Notice[];
    /** 올리기. 성공하면 true (알림은 부르는 쪽에서) */
    onAdd: (text: string) => Promise<boolean>;
    /** 삭제할 공지가 아직 있는지. 없거나 확인하지 못하면 false (알림은 부르는 쪽에서) */
    checkExists: (id: string) => Promise<boolean>;
    /** 삭제. 성공하면 true, 실패하면 false → PIN부터 다시 */
    onDelete: (id: string) => Promise<boolean>;
}

/** "2026.11.26" (올린 날짜) */
const formatDate = (ms: number) => dayjs(ms).format('YYYY.MM.DD');

/** 터치 화면(휴대폰·태블릿): 글을 쓰는 동안 아래 버튼을 숨긴다 (팀 추가·날적이와 같음) */
const isTouch = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;

const MIN_ROWS = 4;
const MAX_ROWS = 10;

const NoticeDrawer = ({ notices, onAdd, checkExists, onDelete }: NoticeDrawerProps) => {
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);
    const closeDrawer = useDrawerStore((state) => state.closeDrawer);
    const open = openedDrawers[openedDrawers.length - 1] === 'notice';

    const [step, setStep] = useState<Step>('list');
    // 삭제할 공지 (삭제 단계에서 보여 준다)
    const [target, setTarget] = useState<Notice | null>(null);
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    // PIN 단계를 열 때마다 PIN을 새로 받는다
    const [pinKey, setPinKey] = useState(0);
    // 열 때마다 목록부터
    const [wasOpen, setWasOpen] = useState(false);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setStep('list');
            setText('');
        }
    }

    const sheet = useKeyboardSheet(open && step !== 'list');

    const goPin = (next: 'addPin' | 'delete') => {
        setPinKey((n) => n + 1);
        setStep(next);
    };

    const handleClickDelete = async (notice: Notice) => {
        if (!(await checkExists(notice.id))) return;
        setTarget(notice);
        goPin('delete');
    };

    const trimmed = text.trim();
    const submit = async () => {
        if (!trimmed || saving) return;
        setSaving(true);
        const ok = await onAdd(trimmed);
        setSaving(false);
        if (ok) {
            setText('');
            setStep('list');
        }
    };

    const content = (() => {
        if (step === 'list') {
            return (
                <>
                    <div ref={scrollFadeRef} className={cn(scrollAreaClassName, 'flex-1')}>
                        <div className="flex items-start justify-between gap-3 px-5 pt-[26px] md:px-7">
                            <DrawerTitle className="pt-1 text-[26px] leading-tight font-bold text-ink md:text-[28px]">
                                공지
                            </DrawerTitle>
                            <DrawerDescription className="sr-only">세마치 공지</DrawerDescription>
                            <CloseButton />
                        </div>
                        <div className="px-5 pt-4 pb-6 md:px-7">
                            {notices.length === 0 ? (
                                <p
                                    className={`${boxShape} bg-neutral-50 py-8 text-center text-[15px] text-neutral-500`}
                                >
                                    공지가 딱히 없네요
                                </p>
                            ) : (
                                <ul className="flex flex-col gap-2">
                                    {notices.map((notice) => (
                                        <li
                                            key={notice.id}
                                            className={`${boxShape} flex items-start gap-1 bg-neutral-50 py-3 pr-1.5 pl-4`}
                                        >
                                            <div className="min-w-0 flex-1 py-1">
                                                <p className="text-[15px] leading-relaxed break-keep whitespace-pre-line text-ink [overflow-wrap:anywhere] md:text-[16px]">
                                                    {linkify(notice.text)}
                                                </p>
                                                {notice.createdAt !== null && (
                                                    <time
                                                        dateTime={dayjs(
                                                            notice.createdAt,
                                                        ).toISOString()}
                                                        className="mt-1 block text-[12px] text-neutral-400 tabular-nums md:text-[13px]"
                                                    >
                                                        {formatDate(notice.createdAt)}
                                                    </time>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                aria-label="공지 삭제"
                                                onClick={() => void handleClickDelete(notice)}
                                                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-[background-color,color,scale] duration-150 hover:bg-neutral-200 hover:text-ink active:scale-[0.95]"
                                            >
                                                <X className="size-4" aria-hidden />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    {/* 올리기는 관리자만: 목록 아래 한 줄 (합주 정보의 "합주 잡기" 줄과 같은 모양) */}
                    <div className="border-t border-neutral-200 bg-surface pb-[env(safe-area-inset-bottom)]">
                        <button
                            type="button"
                            className="flex w-full items-center justify-center gap-1.5 py-4 text-[15px] font-medium text-link transition-colors duration-150 hover:bg-neutral-50 active:bg-neutral-100"
                            onClick={() => goPin('addPin')}
                        >
                            <Megaphone className="size-[18px]" aria-hidden />
                            공지 올리기 (관리자)
                        </button>
                    </div>
                </>
            );
        }

        if (step === 'write') {
            const ready = trimmed.length > 0 && !saving;
            const rows = Math.min(Math.max(text.split('\n').length, MIN_ROWS), MAX_ROWS);
            return (
                <>
                    <div ref={scrollFadeRef} className={cn(scrollAreaClassName, 'flex-1')}>
                        <StepBody onBack={() => setStep('list')} backDisabled={saving}>
                            <DrawerTitle className="mt-3 text-[24px] leading-tight font-bold text-ink md:text-[26px]">
                                공지 올리기
                            </DrawerTitle>
                            <DrawerDescription className="sr-only">
                                공지 내용을 써 주세요
                            </DrawerDescription>
                            <textarea
                                aria-label="공지 내용"
                                value={text}
                                rows={rows}
                                placeholder="공지 내용을 써 주세요"
                                className={cn(
                                    boxShape,
                                    'mt-5 block w-full resize-none border border-neutral-200 bg-surface px-4 py-3 text-[16px] leading-[1.6] break-keep text-ink outline-none placeholder:text-neutral-400 focus:border-ink',
                                )}
                                onChange={(e) => setText(e.target.value)}
                                onFocus={() => setEditing(true)}
                                onBlur={() => setEditing(false)}
                            />
                        </StepBody>
                    </div>
                    <div
                        className={cn(
                            'border-t border-neutral-100 bg-surface px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:px-7',
                            (sheet.keyboardOpen || (editing && isTouch())) && 'hidden',
                        )}
                    >
                        <button
                            type="button"
                            disabled={!ready}
                            className={cn(
                                boxShape,
                                'flex h-14 w-full items-center justify-center gap-2 text-[17px] font-bold transition-[background-color,scale] duration-150',
                                ready || saving
                                    ? 'bg-ink text-on-ink hover:bg-neutral-800 active:scale-[0.98]'
                                    : 'bg-neutral-100 text-neutral-400',
                            )}
                            onClick={() => void submit()}
                        >
                            {saving && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
                            {saving ? '올리는 중…' : trimmed ? '올리기' : '내용을 써 주세요'}
                        </button>
                    </div>
                </>
            );
        }

        // PIN 단계 (올리기 전 / 삭제)
        const deleting = step === 'delete';
        return (
            <div ref={scrollFadeRef} className={scrollAreaClassName}>
                <StepBody onBack={() => setStep('list')}>
                    <DrawerTitle className="mt-3 text-[24px] leading-tight font-bold text-ink md:text-[26px]">
                        {deleting ? '공지를 삭제할까요?' : '공지를 올릴까요?'}
                    </DrawerTitle>
                    {deleting && target && (
                        <p
                            className={cn(
                                boxShape,
                                'mt-3 line-clamp-3 bg-neutral-50 px-4 py-3 text-[15px] leading-relaxed break-keep whitespace-pre-line text-ink [overflow-wrap:anywhere]',
                            )}
                        >
                            {target.text}
                        </p>
                    )}
                    <DrawerDescription className="mt-3 text-[15px] break-keep text-neutral-500">
                        {deleting && '되돌릴 수 없어요. '}관리자 PIN 4자리를 입력해 주세요
                    </DrawerDescription>
                    <div className="mt-7">
                        <PinStep
                            key={pinKey}
                            checkPin={checkNoticePin}
                            // 삭제만 확인 버튼. 올리기는 PIN이 맞으면 바로 글쓰기로
                            confirmLabel={deleting ? '삭제하기' : undefined}
                            danger={deleting}
                            onConfirm={async () => {
                                if (!deleting) {
                                    setStep('write');
                                    return true;
                                }
                                if (!target) return false;
                                const ok = await onDelete(target.id);
                                if (ok) setStep('list');
                                return ok;
                            }}
                        />
                    </div>
                </StepBody>
            </div>
        );
    })();

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
                {content}
            </DrawerContent>
            {sheet.cover}
        </Drawer>
    );
};

const CloseButton = () => (
    <DrawerClose asChild>
        <button
            type="button"
            aria-label="닫기"
            className={`${pressable} -mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100`}
        >
            <X className="size-6" aria-hidden />
        </button>
    </DrawerClose>
);

/** 목록이 아닌 단계의 틀: 뒤로(목록)·닫기 + 밀려 들어오는 내용 */
const StepBody = ({
    onBack,
    backDisabled = false,
    children,
}: {
    onBack: () => void;
    backDisabled?: boolean;
    children: ReactNode;
}) => (
    <div className="px-5 pt-[26px] pb-[calc(24px+env(safe-area-inset-bottom))] duration-200 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 md:px-7">
        <div className="flex items-center justify-between">
            <button
                type="button"
                aria-label="뒤로"
                disabled={backDisabled}
                className={`${pressable} -ml-2 inline-flex size-10 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100`}
                onClick={onBack}
            >
                <ChevronLeft className="size-6" aria-hidden />
            </button>
            <CloseButton />
        </div>
        {children}
    </div>
);

export default NoticeDrawer;
