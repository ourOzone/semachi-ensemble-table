import { BookMarked, MessageSquarePlus, Settings } from 'lucide-react';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';
import { cn } from '@/lib/utils';
import { useDrawerStore } from '@/stores/drawer';

// 헤더 (View 개편 V-2에서 새로 만듦: 이전은 antd Layout.Header + styled-components, 반투명 블러).
// 배경은 페이지와 같은 색, 스크롤을 내리면 위로 들어가고 올리면 다시 나온다.
// V-3 1차: 합주판 보기 방식 스위치 → 설정 버튼 (설정 Drawer에서 보기 방식·다크 모드)

const DRIVE_URL =
    'https://drive.google.com/drive/folders/1FneJEkXY-hSqpM_XOBic7ep8lJZ3tdFn?usp=sharing';
/** 건의사항 (구글 스프레드시트, 30차) */
const SUGGESTION_URL =
    'https://docs.google.com/spreadsheets/d/12aTPjfPIgbE3pxtfLGwW1ArbScX6UpfWr2iJN_r9UkY/edit?usp=drivesdk';

const iconButton =
    'inline-flex size-10 items-center justify-center rounded-full text-ink transition-[background-color,scale] duration-150 hover:bg-ink/5 active:scale-[0.95]';

const Header = () => {
    const hidden = useHideOnScroll();
    const openDrawer = useDrawerStore((state) => state.openDrawer);

    return (
        <header
            className={cn(
                'ui sticky top-0 z-10 w-full bg-page transition-transform duration-300 ease-out',
                hidden && '-translate-y-full',
            )}
        >
            <div className="mx-auto flex h-14 max-w-[1112px] items-center justify-between px-5 md:h-16">
                <span className="text-xl font-bold text-ink select-none md:text-2xl">
                    세마치 합주판
                </span>
                <div className="ml-auto flex items-center gap-1">
                    <a
                        href={SUGGESTION_URL}
                        aria-label="건의사항 (구글 스프레드시트)"
                        title="건의사항"
                        className={iconButton}
                    >
                        <MessageSquarePlus className="size-6" aria-hidden />
                    </a>
                    <a
                        href={DRIVE_URL}
                        aria-label="회칙 등 문서 (구글 드라이브)"
                        title="회칙 등 문서 구글 드라이브"
                        className={iconButton}
                    >
                        <BookMarked className="size-6" aria-hidden />
                    </a>
                    <button
                        type="button"
                        aria-label="설정"
                        title="설정"
                        className={iconButton}
                        onClick={() => openDrawer('settings')}
                    >
                        <Settings className="size-6" aria-hidden />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
