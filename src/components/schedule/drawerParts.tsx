import type { Dayjs } from 'dayjs';
import { CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { days, idx2hour } from '@/constants';
import type { TimeSlot } from '@/types';

// 합주판의 아래에서 올라오는 Drawer들(합주 정보·합주 잡기)이 함께 쓰는 모양·문구

/** "11/26(목)" */
export function formatDate(date: Dayjs): string {
    return `${date.month() + 1}/${date.date()}(${days[(date.day() + 6) % 7]})`;
}

/** "20:00 – 22:00" (endTime은 마지막 시간칸이라 끝나는 시각은 다음 칸의 시작) */
export function formatTimeRange(startTime: TimeSlot, endTime: TimeSlot): string {
    return `${idx2hour[startTime] ?? ''} – ${idx2hour[endTime + 1] ?? ''}`;
}

/** 누를 수 있는 것: 마우스를 올리면 바탕이 바뀌고, 누르면 살짝 작아짐 */
export const pressable = 'transition-[background-color,scale] duration-150 active:scale-[0.97]';

/** 모양이 고정된 버튼·카드는 스쿼클 (corner-shape 지원 브라우저만, 그 외는 일반 둥근 모서리) */
export const boxShape = 'squircle rounded-2xl supports-[corner-shape:squircle]:rounded-[24px]';

/**
 * Drawer 바깥 틀. 흰 바탕: vaul이 Drawer 아래에 바탕색을 이어 붙여(::after) 위로 끌어올려도 뒤가 비치지 않고,
 * 사파리 아래 도구 막대 쪽 여백도 흰색이 된다 (overflow-hidden이면 이 ::after가 잘린다). PC는 가운데 520px
 */
export const sheetClassName =
    'ui mx-auto w-full max-w-[520px] bg-white data-[vaul-drawer-direction=bottom]:border-t-0 data-[vaul-drawer-direction=bottom]:max-h-[92dvh] data-[vaul-drawer-direction=bottom]:rounded-t-[24px] squircle supports-[corner-shape:squircle]:data-[vaul-drawer-direction=bottom]:rounded-t-[36px]';

export const overlayClassName = 'ui bg-black/40 supports-backdrop-filter:backdrop-blur-none';

/**
 * Drawer 안의 스크롤 영역. 위 모서리를 바깥과 같은 모양으로 잘라 색 머리가 모서리 밖으로 나가지 않게.
 * 가로는 숨긴다: 단계가 바뀔 때 옆에서 밀려 들어오는 애니메이션이 잠깐 오른쪽으로 넘쳐 가로 스크롤 막대가 생겼다 사라졌다 (PC)
 */
export const scrollAreaClassName =
    'squircle min-h-0 overflow-x-hidden overflow-y-auto rounded-t-[24px] supports-[corner-shape:squircle]:rounded-t-[36px]';

/**
 * 맨 아래 "합주 잡기" 줄 (합주 정보: "같은 시간에 다른 팀 합주 잡기", 빈 시간: "이 시간에 합주 잡기").
 * 합주를 잡을 팀을 고르는 화면이 아직 없어 "준비 중" 알림만 띄운다 (ISSUES V11)
 */
export const BookFooter = ({ label }: { label: string }) => (
    <div className="border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 py-4 text-[15px] font-medium text-[#1d5fb4] transition-colors duration-150 hover:bg-neutral-50 active:bg-neutral-100"
            onClick={() => toast('준비 중인 기능이에요')}
        >
            <CalendarPlus className="size-[18px]" aria-hidden />
            {label}
        </button>
    </div>
);
