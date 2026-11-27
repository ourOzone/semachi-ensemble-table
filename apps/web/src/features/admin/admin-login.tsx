import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { pinBlockedSeconds, type PinAttempts } from '@/api/pin';
import { PIN_LENGTH, PinSlots } from '@/components/sheet/pin-step';
import { cn } from '@/lib/utils';
import { useAdminLogin } from '@/queries/admin';

// 관리자 로그인: 마스터 PIN 4자리 (사용자 결정, 백엔드 개편 B-7). 틀리면 흔들고 비운 뒤 "(1/10)", 막히면 남은 분
const AdminLogin = () => {
    const login = useAdminLogin();
    const [pin, setPin] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [message, setMessage] = useState<string | null>(null);

    const handleChange = async (value: string) => {
        setPin(value);
        if (value.length < PIN_LENGTH) return;
        setMessage(null);
        try {
            const result = await login.mutateAsync(value);
            if (result.ok) return;
            setAttempt((n) => n + 1);
            setMessage(`PIN이 맞지 않아요${formatAttempts(result.attempts)}`);
        } catch (err) {
            const blocked = pinBlockedSeconds(err);
            if (blocked !== null) {
                setMessage(
                    `너무 많이 틀렸어요. ${Math.max(1, Math.ceil(blocked / 60))}분 뒤에 다시 입력해 주세요`,
                );
            } else {
                toast.error('로그인하지 못했어요. 잠시 후 다시 시도해 주세요.');
            }
        }
        setPin('');
    };

    return (
        <section className="ui mx-auto mt-[12vh] flex w-full max-w-[420px] flex-col items-center rounded-card bg-surface px-6 py-10 shadow-card">
            <h1 className="text-[24px] font-bold text-ink">세마치 합주판 관리자</h1>
            <p className="mt-2 text-[15px] text-neutral-500">마스터 PIN 4자리를 입력해 주세요</p>
            <div className="mt-8">
                <PinSlots
                    value={pin}
                    onChange={(value) => void handleChange(value)}
                    invalid={message !== null}
                    attempt={attempt}
                    disabled={login.isPending}
                />
            </div>
            <p
                role="status"
                className={cn(
                    'mt-3 flex h-5 items-center gap-1 text-[14px]',
                    message ? 'text-red-600' : 'text-neutral-500',
                )}
            >
                {login.isPending ? (
                    <>
                        <LoaderCircle className="size-4 animate-spin" aria-hidden />
                        확인하는 중…
                    </>
                ) : (
                    message
                )}
            </p>
        </section>
    );
};

const formatAttempts = (attempts: PinAttempts | undefined) =>
    attempts ? ` (${attempts.used}/${attempts.limit})` : '';

export default AdminLogin;
