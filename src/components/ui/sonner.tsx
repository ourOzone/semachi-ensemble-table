import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
    CircleCheckIcon,
    InfoIcon,
    TriangleAlertIcon,
    OctagonXIcon,
    Loader2Icon,
} from 'lucide-react';

// shadcn 기본 구성에서 바꾼 것 (V-1):
// - next-themes 제거: 앱에 다크 모드가 없어 밝은 테마로 고정한다 (다크 모드 여부는 V-2 디자인 컨셉에서)
// - 위치 위쪽 가운데: 모바일에서 아래에서 올라오는 Drawer와 겹치지 않게 (사전 결정 6)
const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="light"
            position="top-center"
            className="toaster group"
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
