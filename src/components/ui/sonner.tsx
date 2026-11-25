import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useThemeStore } from '@/components/settings/themeStore';
import {
    CircleCheckIcon,
    InfoIcon,
    TriangleAlertIcon,
    OctagonXIcon,
    Loader2Icon,
} from 'lucide-react';

// shadcn 기본 구성에서 바꾼 것 (V-1):
// - next-themes 제거: 다크 모드는 앱의 설정(themeStore, V-3 1차)을 따른다
// - 위치 위쪽 가운데: 모바일에서 아래에서 올라오는 Drawer와 겹치지 않게 (사전 결정 6)
// - ui 클래스: 옛 전역 스타일(legacy.css)이 알림 안에 적용되지 않게 (index.css의 .ui)
const Toaster = ({ ...props }: ToasterProps) => {
    const dark = useThemeStore((state) => state.dark);
    return (
        <Sonner
            theme={dark ? 'dark' : 'light'}
            position="top-center"
            className="toaster group ui"
            icons={{
                success: <CircleCheckIcon className="size-4" />,
                info: <InfoIcon className="size-4" />,
                warning: <TriangleAlertIcon className="size-4" />,
                error: <OctagonXIcon className="size-4" />,
                loading: <Loader2Icon className="size-4 animate-spin" />,
            }}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                    '--border-radius': 'var(--radius)',
                } as CSSProperties
            }
            toastOptions={{
                classNames: {
                    toast: 'cn-toast',
                },
            }}
            {...props}
        />
    );
};

export { Toaster };
