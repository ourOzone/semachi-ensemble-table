import { useState } from 'react';
import { CalendarPlus, ChevronLeft, X } from 'lucide-react';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerTitle,
} from '@/components/ui/drawer';
import {
    boxShape,
    overlayClassName,
    pressable,
    scrollAreaClassName,
    sheetClassName,
} from '@/components/sheet/drawer-parts';
import { useKeyboardSheet } from '@/components/sheet/keyboard-sheet';
import PinStep from '@/components/sheet/pin-step';
import { openAddEnsemble } from '@/features/schedule/add-ensemble-store';
import { scrollFadeRef } from '@/components/ui/scroll-fade';
import { eventIds } from '@/constants/index';
import { cn } from '@/lib/utils';
import { useTeamSelectionStore } from '@/stores/selection';
import { useDrawerStore } from '@/stores/drawer';
import { defaultTeamColor, eventColors } from '@/constants/colors';

// 소모임·회의 등 정보 Drawer (View 개편 V-3). 팀 정보 Drawer와 같은 모양의 머리만 있다 (전체 이름 + 일정 잡기).
// 이전: 오른쪽에서 열리는 옛 Drawer
// 일정 잡기: 그 일정의 PIN을 먼저 받고, 맞으면 일정이 고정된 합주 잡기 Drawer로 (백엔드 개편 B-6 뒤 사용자 결정, 팀 정보와 같음)

const name2FullName: Record<string, string> = {
    보소: '보컬 소모임',
    기소: '기타 소모임',
    베소: '베이스 소모임',
    드소: '드럼 소모임',
    키소: '키보드 소모임',
};

const EventInfoDrawer = () => {
    const { id, name, setTeamStates } = useTeamSelectionStore();
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);
    const closeDrawer = useDrawerStore((state) => state.closeDrawer);
    const open = openedDrawers[openedDrawers.length - 1] === 'eventInfo';

    // 내려가는 동안 내용이 그대로 보이게 열려 있을 때의 값을 붙잡아 둔다. 새로 열리면 정보부터
    const [shown, setShown] = useState<{ id: string; name: string } | null>(null);
    const [pinStep, setPinStep] = useState(false);
    const [wasOpen, setWasOpen] = useState(false);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) setPinStep(false);
    }
    if (open && id && (shown?.id !== id || shown.name !== name)) setShown({ id, name });

    // PIN 단계의 키보드 처리 (팀 정보 Drawer와 같음: sheet/keyboard-sheet)
    const pinSheet = useKeyboardSheet(open && pinStep);

    const handleClose = () => {
        closeDrawer();
        setTeamStates();
    };

    const idx = shown ? eventIds.indexOf(shown.id) : -1;
    const color = eventColors[idx] ?? defaultTeamColor;
    const club = shown ? name2FullName[shown.name] : undefined; // 소모임이면 전체 이름

    const content = (() => {
        if (!shown) return null;

        if (pinStep) {
            return (
                <div ref={scrollFadeRef} className={scrollAreaClassName}>
                    <div className="px-5 pt-[26px] pb-[calc(24px+env(safe-area-inset-bottom))] duration-200 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 md:px-7">
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                aria-label="뒤로"
                                className={`${pressable} -ml-2 inline-flex size-10 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100`}
                                onClick={() => setPinStep(false)}
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
                        {/* 어떤 일정인지 */}
                        <p className="mt-3 flex min-w-0 items-center gap-1.5 text-[14px] text-neutral-500">
                            <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                            />
                            <span className="truncate">{club ?? shown.name}</span>
                        </p>
                        <DrawerTitle className="mt-1.5 text-[24px] leading-tight font-bold text-ink md:text-[26px]">
                            일정을 잡을까요?
                        </DrawerTitle>
                        <DrawerDescription className="mt-1.5 text-[15px] break-keep text-neutral-500">
                            일정 PIN 4자리를 입력해 주세요
                        </DrawerDescription>
                        <div className="mt-7">
                            <PinStep
                                teamId={shown.id}
                                onConfirm={(pin) => {
                                    openAddEnsemble({
                                        teamId: shown.id,
                                        returnTo: 'eventInfo',
                                        pin,
                                    });
                                    return true;
                                }}
                            />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div ref={scrollFadeRef} className={scrollAreaClassName}>
                <div
                    data-fade-skip
                    className="px-5 pt-[26px] pb-6 text-white md:px-7"
                    style={{ backgroundColor: color }}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 pt-1.5">
                            <DrawerTitle className="text-[28px] leading-tight font-bold break-keep text-white md:text-[32px]">
                                {club ?? shown.name}
                            </DrawerTitle>
                            <DrawerDescription className="mt-1.5 text-[15px] text-white/90">
                                {club ? '소모임' : '일정'}
                            </DrawerDescription>
                        </div>
                        <DrawerClose asChild>
                            <button
                                type="button"
                                aria-label="닫기"
                                className={`${pressable} -mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/20`}
                            >
                                <X className="size-6" aria-hidden />
                            </button>
                        </DrawerClose>
                    </div>
                </div>
                {/*
                  버튼은 머리 아래 바탕(흰색·검은색)에 둔다 (V-3 6차): Drawer 아래 끝이 팀 색이면 아이폰 사파리 26의
                  아래 도구 막대가 팀 색으로 물든다. 팀 정보·합주 정보처럼 아래 끝은 늘 Drawer 바탕
                */}
                <div className="px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] md:px-7">
                    <button
                        type="button"
                        className={`${pressable} ${boxShape} flex h-13 w-full items-center justify-center gap-1.5 px-3 text-[16px] font-bold text-white hover:brightness-95 md:h-14`}
                        style={{ backgroundColor: color }}
                        // PIN 단계로 (맞으면 일정이 고정된 합주 잡기 Drawer, 닫으면 이 Drawer로 돌아온다)
                        onClick={() => setPinStep(true)}
                    >
                        <CalendarPlus className="size-5 shrink-0" aria-hidden />
                        일정 잡기
                    </button>
                </div>
            </div>
        );
    })();

    return (
        <Drawer
            open={open}
            onOpenChange={(next) => !next && handleClose()}
            // 키보드 위치 맞추기는 직접 한다 (keyboardSheet)
            repositionInputs={false}
        >
            <DrawerContent
                className={sheetClassName}
                style={pinSheet.style}
                overlayClassName={overlayClassName}
                // 손잡이는 머리 위에 겹친다 (정보: 색 머리, PIN: 흰 머리)
                handleClassName={cn(
                    'absolute inset-x-0 top-2.5 z-10 mt-0 w-10',
                    pinStep ? 'bg-neutral-300' : 'bg-white/60',
                )}
            >
                {content}
            </DrawerContent>
            {pinSheet.cover}
        </Drawer>
    );
};

export default EventInfoDrawer;
