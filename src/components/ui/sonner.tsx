import type { ReactNode } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { Check, Info, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import { useThemeStore } from '@/features/settings/theme-store';
import { cn } from '@/lib/utils';

// 알림 (V-1에서 shadcn Sonner로 시작, V-3 14차에 다시 디자인).
// - 모양: 화면 위쪽 가운데에 떠 있는 둥근 "섬". 바탕은 화면과 반대 색(밝은 모드는 짙게, 다크 모드는 밝게)이라 무엇 위에 떠도 또렷하다.
//   왼쪽에 결과 색의 동그란 아이콘(성공 초록·실패 빨강·안내 파랑·주의 노랑), 굵은 한 문장.
//   알림은 늘 한 문장만 쓴다 (V-3 15차, description 없음: 이전에는 팀 이름·합주 요약을 작게 덧붙였고 다크 모드에서 보이지 않았다)
// - 위치: 위쪽 가운데 그대로 (아래에서 올라오는 Drawer와 겹치지 않게, 사전 결정 6). 아이폰 위 노치·상태 표시줄 아래로
// - 다크 모드는 앱 설정(themeStore)을 따른다. ui 클래스: body로 옮겨 그려지므로 글꼴·글자 크기를 받게 (index.css의 .ui)

/** 결과 색의 동그란 아이콘 */
const Badge = ({ className, children }: { className: string; children: ReactNode }) => (
    <span
        className={cn('grid size-7 shrink-0 place-items-center rounded-full text-white', className)}
    >
        {children}
    </span>
);

const Toaster = ({ ...props }: ToasterProps) => {
    const dark = useThemeStore((state) => state.dark);
    return (
        <Sonner
            theme={dark ? 'dark' : 'light'}
            position="top-center"
            className="toaster group ui"
            // 위 노치·상태 표시줄 아래로 (휴대폰), PC는 헤더와 겹치지 않게 조금 더 아래
            offset={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
            mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 10px)' }}
            duration={3200}
            gap={8}
            icons={{
                success: (
                    <Badge className="bg-emerald-500">
                        <Check className="size-4" strokeWidth={3} aria-hidden />
                    </Badge>
                ),
                error: (
                    <Badge className="bg-red-500">
                        <X className="size-4" strokeWidth={3} aria-hidden />
                    </Badge>
                ),
                info: (
                    <Badge className="bg-blue-500">
                        <Info className="size-4" strokeWidth={2.5} aria-hidden />
                    </Badge>
                ),
                warning: (
                    <Badge className="bg-amber-500">
                        <TriangleAlert className="size-4" strokeWidth={2.5} aria-hidden />
                    </Badge>
                ),
                loading: (
                    <Badge className="bg-on-ink/15 text-on-ink">
                        <LoaderCircle className="size-4 animate-spin" aria-hidden />
                    </Badge>
                ),
            }}
            toastOptions={{
                // 기본 모양은 쓰지 않고 아래 클래스로만 그린다 (위치·쌓임·밀어서 닫기는 Sonner 그대로)
                unstyled: true,
                classNames: {
                    toast: 'flex w-full items-center gap-3 rounded-[22px] bg-ink/95 py-3 pr-5 pl-3 text-on-ink shadow-[0_10px_30px_-6px_rgb(0_0_0/0.35)] backdrop-blur-md supports-[corner-shape:squircle]:rounded-[32px] squircle',
                    icon: 'm-0! size-7! shrink-0',
                    content: 'min-w-0',
                    title: 'text-[15px] leading-snug font-bold break-keep',
                },
            }}
            {...props}
        />
    );
};

export { Toaster };
