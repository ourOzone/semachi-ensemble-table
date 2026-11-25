import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// 카드 머리 줄의 추가 버튼 (V-3 1차): 옅은 회색 알약 + 왼쪽에 ink 원 안의 +. "팀 추가", "한마디 남기기"

interface AddPillProps {
    label: string;
    onClick: () => void;
    className?: string;
}

export function AddPill({ label, onClick, className }: AddPillProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 pr-3 pl-1 text-[13px] font-bold whitespace-nowrap text-ink transition-[background-color,scale] duration-150 hover:bg-neutral-200 active:scale-[0.97] md:h-9 md:pr-3.5 md:text-[14px]',
                className,
            )}
        >
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-ink text-on-ink md:size-7">
                <Plus className="size-3.5 md:size-4" strokeWidth={2.75} aria-hidden />
            </span>
            {label}
        </button>
    );
}
