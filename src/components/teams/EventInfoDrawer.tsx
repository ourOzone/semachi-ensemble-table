import { useState } from 'react';
import { CalendarPlus, X } from 'lucide-react';
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
} from '@/components/schedule/drawerParts';
import { openAddEnsemble } from '@/components/schedule/addEnsembleStore';
import { eventIds } from '@/constants';
import { useTeamContext } from '@/context';
import { useDrawerStore } from '@/stores/drawer';
import { EVENT_STRIPES } from '@/styles/patterns';
import theme from '@/styles/theme';

// 소모임·회의 등 정보 Drawer (View 개편 V-3). 팀 정보 Drawer와 같은 모양의 머리만 있다 (전체 이름 + 일정 잡기).
// 이전: 오른쪽에서 열리는 옛 Drawer

const name2FullName: Record<string, string> = {
    보소: '보컬 소모임',
    기소: '기타 소모임',
    베소: '베이스 소모임',
    드소: '드럼 소모임',
    키소: '키보드 소모임',
};

const EventInfoDrawer = () => {
    const { id, name, setTeamStates } = useTeamContext();
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);
    const closeDrawer = useDrawerStore((state) => state.closeDrawer);
    const open = openedDrawers[openedDrawers.length - 1] === 'eventInfo';

    // 내려가는 동안 내용이 그대로 보이게 열려 있을 때의 값을 붙잡아 둔다
    const [shown, setShown] = useState<{ id: string; name: string } | null>(null);
    if (open && id && (shown?.id !== id || shown.name !== name)) setShown({ id, name });

    const handleClose = () => {
        closeDrawer();
        setTeamStates();
    };

    const idx = shown ? eventIds.indexOf(shown.id) : -1;
    const color = theme.eventColors[idx] ?? theme.blueGray;
    const club = shown ? name2FullName[shown.name] : undefined; // 소모임이면 전체 이름

    return (
        <Drawer open={open} onOpenChange={(next) => !next && handleClose()}>
            <DrawerContent
                className={sheetClassName}
                overlayClassName={overlayClassName}
                handleClassName="absolute inset-x-0 top-2.5 z-10 mt-0 w-10 bg-white/60"
            >
                {shown && (
                    <div className={scrollAreaClassName}>
                        {/* 합주판 블록·팀 목록 칩과 같은 줄무늬 */}
                        <div
                            className="px-5 pt-[26px] pb-[calc(24px+env(safe-area-inset-bottom))] text-white md:px-7"
                            style={{ backgroundColor: color, backgroundImage: EVENT_STRIPES }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 pt-1.5">
                                    <DrawerTitle className="text-[28px] leading-tight font-bold break-keep text-white md:text-[32px]">
                                        {club ?? shown.name}
                                    </DrawerTitle>
                                    <DrawerDescription className="mt-1.5 text-[15px] text-white/90">
                                        {club ? '소모임' : '팀 아닌 일정'}
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
                            <button
                                type="button"
                                className={`${pressable} ${boxShape} mt-5 flex h-12 w-full items-center justify-center gap-1.5 bg-white px-3 text-[16px] font-bold text-black/85 hover:bg-white/90 md:h-13`}
                                // 일정을 골라 둔 합주 잡기 Drawer로 바뀐다 (닫으면 이 Drawer로 돌아온다)
                                onClick={() =>
                                    openAddEnsemble({ teamId: shown.id, returnTo: 'eventInfo' })
                                }
                            >
                                <CalendarPlus className="size-5 shrink-0" aria-hidden />
                                일정 잡기
                            </button>
                        </div>
                    </div>
                )}
            </DrawerContent>
        </Drawer>
    );
};

export default EventInfoDrawer;
