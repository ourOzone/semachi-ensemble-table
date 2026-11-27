import { useState } from 'react';
import { X } from 'lucide-react';
import { checkNotePin } from '@/api/note';
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
import { useKeyboardSheet } from '@/components/sheet/keyboard-sheet';
import PinStep from '@/components/sheet/pin-step';
import { cn } from '@/lib/utils';
import { useDrawerStore } from '@/stores/drawer';
import type { Note } from '@/types/index';

// 날적이 삭제 Drawer (View 개편 V-4). 아래에서 올라오는 Drawer에서 PIN 4칸 → "삭제하기"
// (이전: 오른쪽에서 열리는 옛 Drawer에 PIN 한 칸·"진짜 삭제해요", 알림 없음).
// 합주·팀 삭제의 PIN 단계와 같은 모양 (PinStep, 틀리면 흔든 뒤 비움, PC는 Enter로도 삭제)

interface DeleteNoteDrawerProps {
    /** 삭제할 날적이. 닫혀도 그대로 둔다 (내려가는 동안 내용 유지) */
    note: Note | null;
    /** 삭제. 성공하면 true (Drawer는 삭제하는 쪽이 닫는다), 실패하면 false → PIN부터 다시 */
    /** pin: PIN 단계에서 맞은 PIN (서버가 다시 확인, 백엔드 개편 B-6) */
    onDelete: (id: string, pin: string) => Promise<boolean>;
}

const DeleteNoteDrawer = ({ note, onDelete }: DeleteNoteDrawerProps) => {
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);
    const closeDrawer = useDrawerStore((state) => state.closeDrawer);
    const open = openedDrawers[openedDrawers.length - 1] === 'deleteNote';

    // 열 때마다 PIN을 새로 받는다
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
            repositionInputs={false}
        >
            <DrawerContent
                className={sheetClassName}
                style={sheet.style}
                overlayClassName={overlayClassName}
                handleClassName="absolute inset-x-0 top-2.5 z-10 mt-0 w-10 bg-neutral-300"
            >
                {note && (
                    <div ref={scrollFadeRef} className={scrollAreaClassName}>
                        <div className="px-5 pt-[26px] pb-[calc(24px+env(safe-area-inset-bottom))] md:px-7">
                            <div className="flex items-start justify-between gap-3">
                                <DrawerTitle className="pt-1.5 text-[24px] leading-tight font-bold text-ink md:text-[26px]">
                                    날적이를 삭제할까요?
                                </DrawerTitle>
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
                            {/* 어떤 날적이인지 (세 줄까지) */}
                            <p
                                className={cn(
                                    boxShape,
                                    'mt-3 line-clamp-3 bg-neutral-50 px-4 py-3 text-[15px] leading-relaxed break-keep whitespace-pre-line text-ink [overflow-wrap:anywhere]',
                                )}
                            >
                                {note.text}
                            </p>
                            <DrawerDescription className="mt-3 text-[15px] break-keep text-neutral-500">
                                되돌릴 수 없어요. 남길 때 정한 PIN 4자리를 입력해 주세요
                            </DrawerDescription>
                            <div className="mt-7">
                                <PinStep
                                    key={session}
                                    checkPin={(pin) => checkNotePin(note.id, pin)}
                                    confirmLabel="삭제하기"
                                    danger
                                    onConfirm={(pin) => onDelete(note.id, pin)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </DrawerContent>
            {sheet.cover}
        </Drawer>
    );
};

export default DeleteNoteDrawer;
