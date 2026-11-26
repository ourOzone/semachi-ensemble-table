import type { Dayjs } from 'dayjs';
import { CalendarPlus, OctagonAlert } from 'lucide-react';
import { days, idx2hour } from '@/constants';
import { MAX_OVERLAP } from '@/lib/calendar';
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

/** 시간칸 수의 길이: "2시간", "1시간 30분", "30분" (시간칸 하나 = 30분) */
export function formatSlots(slots: number): string {
    const hours = Math.floor(slots / 2);
    const minutes = slots % 2 === 1 ? '30분' : '';
    return hours > 0 ? `${hours}시간${minutes ? ` ${minutes}` : ''}` : minutes;
}

/** 저장 알림의 설명: "테스트밴드 · 11/27(금)부터 매주 12:00 – 14:00 (12/25(금)까지)" */
export function formatEnsembleSummary({
    team,
    repeat,
    date,
    startTime,
    endTime,
    repeatEnd,
}: {
    team: { name: string };
    repeat: boolean;
    date: Dayjs;
    startTime: TimeSlot;
    endTime: TimeSlot;
    repeatEnd: Dayjs | null;
}): string {
    return `${team.name} · ${formatDate(date)}${repeat ? '부터 매주' : ''} ${formatTimeRange(startTime, endTime)}${repeatEnd ? ` (${formatDate(repeatEnd)}까지)` : ''}`;
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
    'ui mx-auto w-full max-w-[520px] bg-surface data-[vaul-drawer-direction=bottom]:border-t-0 data-[vaul-drawer-direction=bottom]:max-h-[92dvh] data-[vaul-drawer-direction=bottom]:rounded-t-[24px] squircle supports-[corner-shape:squircle]:data-[vaul-drawer-direction=bottom]:rounded-t-[36px]';

export const overlayClassName = 'ui bg-black/40 supports-backdrop-filter:backdrop-blur-none';

/**
 * Drawer 안의 스크롤 영역. 위 모서리를 바깥과 같은 모양으로 잘라 색 머리가 모서리 밖으로 나가지 않게.
 * 가로는 숨긴다: 단계가 바뀔 때 옆에서 밀려 들어오는 애니메이션이 잠깐 오른쪽으로 넘쳐 가로 스크롤 막대가 생겼다 사라졌다 (PC)
 * 세로 스크롤 막대도 숨기고 위·아래 끝을 흐리게 한다 (V-3 5차, scroll-fade: 쓰는 곳에서 ref={scrollFadeRef}).
 * 끝에서 더 당겨도 튕기지 않는다 (overscroll-y-none, V-3 5차): 아이폰에서 맨 위에서 아래로 당기면 내용만 내려가 머리 위가
 * 비었다. 튕기지 않으면 그다음 당김은 vaul이 Drawer를 끌어내린다.
 * 바탕은 Drawer와 같은 단색(bg-surface)으로 둔다 (V-3 6차): 아이폰 사파리 26은 아래 도구 막대 색을 화면 아래 끝의
 * 고정 요소에서 가져오는데, 5차에 이 영역 바탕을 팀 색 그러데이션(headerBackdrop)으로 바꾸자 막대가 팀 색이 됐다.
 * 이 영역에는 팀 색 바탕(배경 이미지 포함)을 넣지 않는다. 팀 색은 안쪽 머리 요소에만
 */
export const scrollAreaClassName =
    'squircle scroll-fade min-h-0 bg-surface overflow-x-hidden overflow-y-auto overscroll-y-none rounded-t-[24px] supports-[corner-shape:squircle]:rounded-t-[36px]';

/**
 * 맨 아래 "합주 잡기" 줄 (합주 정보: "같은 시간에 다른 팀 합주 잡기", 빈 시간: "이 시간에 합주 잡기").
 * 누르면 그 날짜·시간을 채운 합주 잡기 Drawer로 바뀐다 (21차, 이전: "준비 중" 알림. ISSUES V11)
 */
export const BookFooter = ({
    label,
    onClick,
    full = false,
}: {
    label: string;
    onClick: () => void;
    /** 그 시간에 이미 MAX_OVERLAP개가 겹쳐 있으면 누를 수 없고 이유를 보여 준다 (24차) */
    full?: boolean;
}) => (
    <div className="border-t border-neutral-200 bg-surface pb-[env(safe-area-inset-bottom)]">
        <button
            type="button"
            disabled={full}
            className="flex w-full items-center justify-center gap-1.5 py-4 text-[15px] font-medium text-link transition-colors duration-150 hover:bg-neutral-50 active:bg-neutral-100 disabled:text-neutral-400 disabled:hover:bg-surface disabled:active:bg-surface"
            onClick={onClick}
        >
            {full ? (
                <>
                    <OctagonAlert className="size-[18px]" aria-hidden />
                    {MAX_OVERLAP}개가 겹쳐 있어 더 잡을 수 없어요
                </>
            ) : (
                <>
                    <CalendarPlus className="size-[18px]" aria-hidden />
                    {label}
                </>
            )}
        </button>
    </div>
);
