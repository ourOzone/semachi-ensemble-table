import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LayoutGrid, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// 팀 목록 (View 개편 V-2).
// - PC(md 이상): 모두 펼쳐 보여준다 ("전체" 버튼 없음)
// - 모바일: 한 줄을 좌우로 밀어 본다. 밀기 시작하면 "전체" 버튼이 아이콘만 남고, 맨 왼쪽까지 돌아오면 글자가 다시 나온다.
//   "전체"를 누르면 화면 폭 전체로 펼치고, 펼친 동안 버튼은 "닫기"가 된다. (높이만 부드럽게 바뀜. 투명도 애니메이션은 흰색으로 깜빡여 뺐다)

export interface Chip {
    key: string;
    name: string;
    color: string;
    onClick: () => void;
}

interface TeamChipsProps {
    teams: Chip[];
    /** 팀 아닌 일정 (소모임·회의 등). 팀 뒤에 이어서 보여준다 */
    events: Chip[];
    onAddTeam: () => void;
}

// 누르는 느낌: 마우스를 올리면(마우스가 있는 기기만) 색이 살짝 진해지고, 누르면 살짝 작아진다
const pressable = 'transition-[filter,background-color,scale] duration-150 active:scale-[0.97]';

const chipBase = cn(
    'inline-flex h-8 shrink-0 items-center rounded-full px-3 text-sm font-medium whitespace-nowrap md:h-9 md:px-4 md:text-[15px]',
    pressable,
);

const TeamChips = ({ teams, events, onAddTeam }: TeamChipsProps) => {
    const [expanded, setExpanded] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { innerRef, style: heightStyle } = useAnimatedHeight();

    const allButton = (
        <button
            type="button"
            aria-expanded={expanded}
            onClick={() => {
                setExpanded((prev) => !prev);
                setScrolled(false);
            }}
            className={cn(
                'inline-flex h-8 shrink-0 items-center rounded-full border border-neutral-300 bg-neutral-100 px-2.5 text-sm font-medium text-black hover:bg-neutral-200 md:hidden',
                pressable,
            )}
        >
            {expanded ? (
                <>
                    <X className="size-3.5 shrink-0" aria-hidden />
                    <span className="ml-1 whitespace-nowrap">닫기</span>
                </>
            ) : (
                <>
                    <LayoutGrid className="size-3.5 shrink-0" aria-hidden />
                    {/* 밀고 있는 동안은 아이콘만 (글자는 폭을 0으로 줄여 숨긴다: 접근성 이름은 그대로) */}
                    <span
                        className={cn(
                            'overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200',
                            scrolled ? 'ml-0 max-w-0 opacity-0' : 'ml-1 max-w-24 opacity-100',
                        )}
                    >
                        전체 <span className="text-neutral-500">{teams.length}</span>
                    </span>
                </>
            )}
        </button>
    );

    const chips: ReactNode = (
        <>
            {teams.map((chip) => (
                <ChipButton key={chip.key} chip={chip} />
            ))}
            <button
                type="button"
                onClick={onAddTeam}
                className={cn(
                    chipBase,
                    'gap-1 border border-dashed border-neutral-500 bg-white text-neutral-800 hover:bg-neutral-100',
                )}
            >
                <Plus className="size-3.5" aria-hidden />팀 추가
            </button>
            {/* 펼쳤을 때(PC는 항상)는 팀 아닌 일정을 새 줄에서 시작 */}
            <div aria-hidden className={cn('hidden basis-full md:block', expanded && 'block')} />
            {events.map((chip) => (
                <ChipButton key={chip.key} chip={chip} />
            ))}
        </>
    );

    return (
        <div
            className="overflow-hidden transition-[height] duration-300 ease-out"
            style={heightStyle}
        >
            <div ref={innerRef}>
                {expanded ? (
                    // 펼침: "전체" 버튼도 같은 줄에 두어 버튼 아래까지 화면 폭 전체로 줄바꿈
                    <div className="flex flex-wrap gap-1.5">
                        {allButton}
                        {chips}
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        {allButton}
                        <div
                            onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}
                            className={cn(
                                'flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] mask-r-from-88% mask-r-to-100% md:flex-wrap md:overflow-visible md:mask-none [&::-webkit-scrollbar]:hidden',
                                // 밀어서 왼쪽이 "전체" 버튼 밑으로 들어가는 동안은 왼쪽도 같은 폭으로 흐리게
                                scrolled && 'mask-l-from-88% mask-l-to-100%',
                            )}
                        >
                            {chips}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

function ChipButton({ chip }: { chip: Chip }) {
    return (
        <button
            type="button"
            onClick={chip.onClick}
            className={cn(chipBase, 'text-white hover:brightness-90')}
            style={{ backgroundColor: chip.color }}
        >
            {chip.name}
        </button>
    );
}

/**
 * 안쪽 내용의 높이를 재서 바깥 요소에 픽셀 높이로 준다 (height: auto는 transition이 안 되므로).
 * ResizeObserver가 없는 환경(테스트의 jsdom)에서는 높이를 정하지 않는다
 */
function useAnimatedHeight() {
    const innerRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number>();

    useEffect(() => {
        const inner = innerRef.current;
        if (!inner || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => setHeight(inner.offsetHeight));
        observer.observe(inner);
        return () => observer.disconnect();
    }, []);

    return { innerRef, style: height === undefined ? undefined : { height } };
}

export default TeamChips;
