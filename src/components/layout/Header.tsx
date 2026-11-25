import { BookMarked, CalendarClock, CalendarDays, MessageSquarePlus } from 'lucide-react';
import { useBoardViewStore } from '@/components/schedule/boardViewStore';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';
import type { BoardView } from '@/lib/calendar';
import { cn } from '@/lib/utils';

// 헤더 (View 개편 V-2에서 새로 만듦: 이전은 antd Layout.Header + styled-components, 반투명 블러).
// 배경은 페이지와 같은 회색, 스크롤을 내리면 위로 들어가고 올리면 다시 나온다.

const DRIVE_URL =
    'https://drive.google.com/drive/folders/1FneJEkXY-hSqpM_XOBic7ep8lJZ3tdFn?usp=sharing';
/** 건의사항 (구글 스프레드시트, 30차) */
const SUGGESTION_URL =
    'https://docs.google.com/spreadsheets/d/12aTPjfPIgbE3pxtfLGwW1ArbScX6UpfWr2iJN_r9UkY/edit?usp=drivesdk';

const linkClassName =
    'inline-flex size-10 items-center justify-center rounded-full text-ink transition-[background-color,scale] duration-150 hover:bg-black/5 active:scale-[0.95]';

/** 합주판 보기 방식 스위치의 두 칸 (27차: 왼쪽이 기본인 요일 고정) */
const VIEW_OPTIONS = [
    { view: 'weekday', label: '요일 고정으로 보기', Icon: CalendarDays },
    { view: 'rolling', label: '오늘부터 보기', Icon: CalendarClock },
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
                    {/*
                      보기 방식 스위치 (27차): 어디를 눌러도 다른 쪽으로 바뀐다 (이전: 아이콘을 골라 누름).
                      흰 원(손잡이)이 지금 방식의 아이콘 아래로 미끄러진다. 켜짐(checked) = 오늘부터 보기
                    */}
                    <button
                        type="button"
                        role="switch"
                        aria-checked={view === 'rolling'}
                        aria-label="오늘부터 보기"
                        title={
                            view === 'rolling'
                                ? '오늘부터 보기 (누르면 요일 고정)'
                                : '요일 고정으로 보기 (누르면 오늘부터)'
                        }
                        className="relative flex items-center gap-0.5 rounded-full bg-black/5 p-1 transition-[background-color,scale] duration-150 hover:bg-black/8 active:scale-[0.97]"
                        onClick={() => setView(view === 'rolling' ? 'weekday' : 'rolling')}
                    >
                        <span
                            aria-hidden
                            className={cn(
                                'absolute top-1 left-1 size-8 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.15)] transition-transform duration-200 ease-out md:size-9',
                                view === 'rolling' && 'translate-x-[calc(100%+2px)]',
                            )}
                        />
                        {VIEW_OPTIONS.map(({ view: option, Icon }) => (
                            <span
                                key={option}
                                aria-hidden
                                className={cn(
                                    'relative inline-flex size-8 items-center justify-center rounded-full transition-colors duration-200 md:size-9',
                                    view === option ? 'text-ink' : 'text-neutral-500',
                                )}
                            >
                                <Icon className="size-[18px] md:size-5" />
                            </span>
                        ))}
                    </button>
                    <a
                        href={SUGGESTION_URL}
                        aria-label="건의사항 (구글 스프레드시트)"
                        title="건의사항"
                        className={linkClassName}
                    >
                        <MessageSquarePlus className="size-6" aria-hidden />
                    </a>
                    <a
                        href={DRIVE_URL}
                        aria-label="회칙 등 문서 (구글 드라이브)"
                        title="회칙 등 문서 구글 드라이브"
                        className={linkClassName}
                    >
                        <BookMarked className="size-6" aria-hidden />
                    </a>
                </div>
            </div>
        </header>
    );
};

export default Header;
