import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Board from '@/components/board';
import Teams from '@/components/teams';
import { useToday } from '@/hooks/useToday';
import { formatWeekRange, getWeekStart, MAX_WEEK_OFFSET } from '@/lib/calendar';
import { getTodayIdx } from '@/lib/week';

// 합주판 카드 (View 개편 V-2): 팀 목록 → 주 제목·이동 → 주 단위 캘린더 (날짜 행은 캘린더에 붙여 둔다).
// 이번 주부터 MAX_WEEK_OFFSET주 뒤까지 볼 수 있다 (지난 주는 보여주지 않는다).
// `ui` 클래스: 옛 전역 스타일이 적용되지 않는 새 코드 영역 (src/styles/index.css)

// 누를 수 있는 버튼: 스쿼클 모양, 마우스를 올리면 옅은 회색 바탕, 누르면 살짝 작아짐 (비활성이면 없음)
const pressable =
    'squircle transition-[background-color,scale] duration-150 enabled:active:scale-[0.95]';

const navButton = `${pressable} inline-flex size-8 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 disabled:text-neutral-300 disabled:hover:bg-transparent md:size-10`;

type Direction = 'prev' | 'next' | null;

const Schedule = () => {
    const today = useToday();
    const [week, setWeek] = useState<{ offset: number; direction: Direction }>({
        offset: 0,
        direction: null,
    });
    const weekStart = getWeekStart(today, week.offset);

    const moveTo = (offset: number) =>
        setWeek((prev) =>
            offset === prev.offset
                ? prev
                : { offset, direction: offset > prev.offset ? 'next' : 'prev' },
        );

    return (
        <section className="ui w-full max-w-[1080px] rounded-card bg-white p-4 shadow-[0_2px_10px_2px_rgb(0_0_0/0.06)] md:p-7">
            <Teams />

            <div className="mt-4 flex items-center justify-between gap-2 md:mt-6">
                <h2 className="text-xl font-bold text-ink md:text-[28px]">
                    {formatWeekRange(weekStart)}
                </h2>
                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        aria-label="이전 주"
                        className={navButton}
                        disabled={week.offset === 0}
                        onClick={() => moveTo(week.offset - 1)}
                    >
                        <ChevronLeft className="size-5 md:size-6" aria-hidden />
                    </button>
                    <button
                        type="button"
                        className={`${pressable} h-8 rounded-full border border-neutral-300 px-3 text-[13px] font-medium text-neutral-800 hover:bg-neutral-100 disabled:text-neutral-400 disabled:hover:bg-transparent md:h-10 md:px-4 md:text-[15px]`}
                        disabled={week.offset === 0}
                        onClick={() => moveTo(0)}
                    >
                        오늘
                    </button>
                    <button
                        type="button"
                        aria-label="다음 주"
                        className={navButton}
                        disabled={week.offset === MAX_WEEK_OFFSET}
                        onClick={() => moveTo(week.offset + 1)}
                    >
                        <ChevronRight className="size-5 md:size-6" aria-hidden />
                    </button>
                </div>
            </div>

            <Board
                weekStart={weekStart}
                todayIdx={week.offset === 0 ? getTodayIdx(today) : null}
                direction={week.direction}
            />
        </section>
    );
};

export default Schedule;
