import type { ReactNode } from 'react';
import { CalendarDays, Moon, X } from 'lucide-react';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerTitle,
} from '@/components/ui/drawer';
import { IconSwitch } from '@/components/ui/icon-switch';
import { useBoardViewStore } from '@/components/schedule/boardViewStore';
import {
    boxShape,
    overlayClassName,
    pressable,
    scrollAreaClassName,
    sheetClassName,
} from '@/components/schedule/drawerParts';
import { useDrawerStore } from '@/stores/drawer';
import { useThemeStore } from './themeStore';

// 설정 Drawer (V-3 1차). 헤더의 설정 버튼으로 연다. 이전에는 헤더에 합주판 보기 방식 스위치가 바로 있었다.
// 모든 설정은 이 브라우저(기기)에 기억한다.
// - 합주판 오늘부터 보기: 끄면(기본) 일~토 요일 고정, 켜면 오늘이 맨 왼쪽 (26·27차의 보기 방식)
// - 다크 모드: 처음에는 기기 설정을 따른다 (themeStore)

const SettingsDrawer = () => {
    const openedDrawers = useDrawerStore((state) => state.openedDrawers);
    const closeDrawer = useDrawerStore((state) => state.closeDrawer);
    const open = openedDrawers[openedDrawers.length - 1] === 'settings';
    const view = useBoardViewStore((state) => state.view);
    const setView = useBoardViewStore((state) => state.setView);
    const dark = useThemeStore((state) => state.dark);
    const setDark = useThemeStore((state) => state.setDark);

    return (
        <Drawer open={open} onOpenChange={(next) => !next && closeDrawer()}>
            <DrawerContent
                className={sheetClassName}
                overlayClassName={overlayClassName}
                handleClassName="absolute inset-x-0 top-2.5 z-10 mt-0 w-10 bg-neutral-300"
            >
                <div className={scrollAreaClassName}>
                    <div className="px-5 pt-[26px] pb-[calc(24px+env(safe-area-inset-bottom))] md:px-7">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <DrawerTitle className="text-[26px] leading-tight font-bold text-ink md:text-[28px]">
                                    설정
                                </DrawerTitle>
                                {/* 화면에는 보이지 않는 설명 (V-3 3차: 회색 안내 문구 삭제, 읽기 프로그램용으로만) */}
                                <DrawerDescription className="sr-only">
                                    이 기기에만 저장돼요
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

                        <div
                            className={`${boxShape} mt-6 divide-y divide-neutral-100 border border-neutral-200`}
                        >
                            <SettingRow title="합주판 오늘부터 보기">
                                <IconSwitch
                                    label="합주판 오늘부터 보기"
                                    icon={CalendarDays}
                                    checked={view === 'rolling'}
                                    onChange={(on) => setView(on ? 'rolling' : 'weekday')}
                                />
                            </SettingRow>
                            <SettingRow title="다크 모드">
                                <IconSwitch
                                    label="다크 모드"
                                    icon={Moon}
                                    checked={dark}
                                    onChange={setDark}
                                />
                            </SettingRow>
                        </div>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
};

const SettingRow = ({ title, children }: { title: string; children: ReactNode }) => (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 md:px-5 md:py-4">
        <p className="min-w-0 text-[16px] font-bold text-ink">{title}</p>
        {children}
    </div>
);

export default SettingsDrawer;
