import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

// 켜고 끄는 스위치 (V-3 1차, 설정 Drawer). 흰 원(손잡이) 안에 아이콘이 있고 원과 함께 움직인다.
// 켜지면 파란 바탕 (다크 모드에서도 같은 색: 밝기가 바뀌는 ink 대신)

interface IconSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** 읽기 프로그램용 이름 (보이는 라벨과 같게) */
    label: string;
    icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

export function IconSwitch({ checked, onChange, label, icon: Icon }: IconSwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full p-1 transition-[background-color,scale] duration-200 active:scale-[0.96]',
                checked ? 'bg-blue-600' : 'bg-neutral-200',
            )}
        >
            <span
                className={cn(
                    'inline-flex size-6 items-center justify-center rounded-full bg-[#fff] shadow-[0_1px_3px_rgb(0_0_0/0.2)] transition-transform duration-200 ease-out',
                    checked && 'translate-x-5',
                )}
            >
                <Icon
                    className={cn(
                        'size-3.5 transition-colors duration-200',
                        checked ? 'text-blue-600' : 'text-[#8e8e93]',
                    )}
                    aria-hidden
                />
            </span>
        </button>
    );
}
