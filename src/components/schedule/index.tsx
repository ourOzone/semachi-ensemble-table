import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Board from '@/components/board';
import Teams from '@/components/teams';
import { useToday } from '@/hooks/useToday';
import { formatWeekRange, getWeekStart, MAX_WEEK_OFFSET } from '@/lib/calendar';
import { getTodayIdx } from '@/lib/week';

// 합주판 카드 (View 개편 V-2): 주 제목·이동 → 팀 목록 → 주 단위 캘린더.
// 이번 주부터 MAX_WEEK_OFFSET주 뒤까지 볼 수 있다 (지난 주는 보여주지 않는다).
// `ui` 클래스: 옛 전역 스타일이 적용되지 않는 새 코드 영역 (src/styles/index.css)

const navButton =
    'inline-flex size-8 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 disabled:text-neutral-300 disabled:hover:bg-transparent';

const Schedule = () => {
    const today = useToday();
    const [weekOffset, setWeekOffset] = useState(0);
    const weekStart = getWeekStart(today, weekOffset);

    return (
        <section className="ui w-full max-w-[1080px] rounded-[24px] bg-white p-4 shadow-[0_2px_10px_2px_rgb(0_0_0/0.1)] md:p-6">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-neutral-900 md:text-2xl">
                    {formatWeekRange(weekStart)}
                </h2>
                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        aria-label="이전 주"
                        className={navButton}
                        disabled={weekOffset === 0}
                        onClick={() => setWeekOffset((offset) => offset - 1)}
                    >
                        <ChevronLeft className="size-5" aria-hidden />
                    </button>
                    <button
                        type="button"
                        className="h-8 rounded-full border border-neutral-300 px-3 text-[13px] font-medium text-neutral-800 hover:bg-neutral-50 disabled:text-neutral-400"
                        disabled={weekOffset === 0}
                        onClick={() => setWeekOffset(0)}
                    >
                        오늘
                    </button>
                    <button
                        type="button"
                        aria-label="다음 주"
                        className={navButton}
                        disabled={weekOffset === MAX_WEEK_OFFSET}
                        onClick={() => setWeekOffset((offset) => offset + 1)}
                    >
                        <ChevronRight className="size-5" aria-hidden />
                    </button>
                </div>
            </div>

            <Teams />
            <Board weekStart={weekStart} todayIdx={weekOffset === 0 ? getTodayIdx(today) : null} />
        </section>
    );
};

export default Schedule;
