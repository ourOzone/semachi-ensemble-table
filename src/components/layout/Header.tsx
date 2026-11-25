import { BookMarked, CalendarClock, CalendarDays } from 'lucide-react';
import { useBoardViewStore } from '@/components/schedule/boardViewStore';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';
import type { BoardView } from '@/lib/calendar';
import { cn } from '@/lib/utils';

// 헤더 (View 개편 V-2에서 새로 만듦: 이전은 antd Layout.Header + styled-components, 반투명 블러).
// 배경은 페이지와 같은 회색, 스크롤을 내리면 위로 들어가고 올리면 다시 나온다.

const DRIVE_URL =
    'https://drive.google.com/drive/folders/1FneJEkXY-hSqpM_XOBic7ep8lJZ3tdFn?usp=sharing';

/** 합주판 보기 방식 (26차): 오늘부터 7일 / 요일 고정(일~토) */
const VIEW_OPTIONS = [
    { view: 'rolling', label: '오늘부터 보기', Icon: CalendarClock },
    { view: 'weekday', label: '요일 고정으로 보기', Icon: CalendarDays },
] as const satisfies readonly { view: BoardView; label: string; Icon: unknown }[];

const Header = () => {
    const hidden = useHideOnScroll();
    const view = useBoardViewStore((state) => state.view);
    const setView = useBoardViewStore((state) => state.setView);

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
                <div className="ml-auto flex items-center gap-1.5">
                    <div
                        role="radiogroup"
                        aria-label="합주판 보기 방식"
                        className="flex items-center gap-0.5 rounded-full bg-black/5 p-1"
                    >
                        {VIEW_OPTIONS.map(({ view: option, label, Icon }) => (
                            <button
                                key={option}
                                type="button"
                                role="radio"
                                aria-checked={view === option}
                                aria-label={label}
                                title={label}
                                className={cn(
                                    'inline-flex size-8 items-center justify-center rounded-full transition-[background-color,color,box-shadow] duration-150 md:size-9',
                                    view === option
                                        ? 'bg-white text-ink shadow-[0_1px_3px_rgb(0_0_0/0.15)]'
                                        : 'text-neutral-500 hover:text-ink',
                                )}
                                onClick={() => setView(option)}
                            >
                                <Icon className="size-[18px] md:size-5" aria-hidden />
                            </button>
                        ))}
                    </div>
                    <a
                        href={DRIVE_URL}
                        aria-label="회칙 등 문서 (구글 드라이브)"
                        title="회칙 등 문서 구글 드라이브"
                        className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-[background-color,scale] duration-150 hover:bg-black/5 active:scale-[0.95]"
                    >
                        <BookMarked className="size-6" aria-hidden />
                    </a>
                </div>
            </div>
        </header>
    );
};

export default Header;
