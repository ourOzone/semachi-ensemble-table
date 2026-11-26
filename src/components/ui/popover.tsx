import type { ComponentProps } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

// 작은 말풍선 (shadcn Popover와 같은 구성, V-4 2차: 날적이 설명).
// 내용은 body로 옮겨 그려지므로 `ui` 클래스를 붙여 새 코드 스타일(공존 기간 규칙)을 받는다

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = ({
    className,
    align = 'center',
    sideOffset = 6,
    ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) => (
    <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
            data-slot="popover-content"
            align={align}
            sideOffset={sideOffset}
            collisionPadding={16}
            className={cn(
                'ui z-50 w-72 rounded-2xl bg-ink/95 px-4 py-3 text-[13px] leading-relaxed break-keep text-on-ink shadow-lg outline-none',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                className,
            )}
            {...props}
        />
    </PopoverPrimitive.Portal>
);

export { Popover, PopoverContent, PopoverTrigger };
