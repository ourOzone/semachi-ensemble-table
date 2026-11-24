import { BookMarked } from 'lucide-react';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';
import { cn } from '@/lib/utils';

// 헤더 (View 개편 V-2에서 새로 만듦: 이전은 antd Layout.Header + styled-components, 반투명 블러).
// 배경은 페이지와 같은 회색, 스크롤을 내리면 위로 들어가고 올리면 다시 나온다.

const DRIVE_URL =
    'https://drive.google.com/drive/folders/1FneJEkXY-hSqpM_XOBic7ep8lJZ3tdFn?usp=sharing';

const Header = () => {
    const hidden = useHideOnScroll();

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
                <a
                    href={DRIVE_URL}
                    aria-label="회칙 등 문서 (구글 드라이브)"
                    title="회칙 등 문서 구글 드라이브"
                    className="squircle inline-flex size-10 items-center justify-center rounded-full text-ink transition-[background-color,scale] duration-150 hover:bg-black/5 active:scale-[0.95]"
                >
                    <BookMarked className="size-6" aria-hidden />
                </a>
            </div>
        </header>
    );
};

export default Header;
