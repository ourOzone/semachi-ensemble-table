import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// 불러오는 동안 자리를 잡아 두는 회색 상자 (V-3 1차, shadcn Skeleton과 같은 모양). 처음 불러올 때만 쓴다.
// 색은 neutral 토큰이라 다크 모드에서 함께 어두워진다

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="skeleton"
            aria-hidden
            className={cn('animate-pulse rounded-md bg-neutral-200/70', className)}
            {...props}
        />
    );
}
