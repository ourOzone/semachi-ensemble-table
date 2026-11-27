import { useRef, useState, type FormEvent } from 'react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Check, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { checkTeamPin } from '@/api/team';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import { pressable } from './drawer-parts';

// PIN 4자리 확인 (View 개편 V-2: 합주 수정·미루기·바로 하기·반복으로 바꾸기·삭제).
// - 4자리를 다 넣으면 서버에 확인한다. 확인하는 동안은 "확인하는 중"으로 두고, 결과가 온 뒤에만 맞음·틀림을 보인다
//   (이전: 4자리를 넣는 즉시 틀림(빨강)으로 표시했다가 응답이 오면 바꿔, 맞는 PIN도 잠깐 빨갛게 보였다).
//   응답이 오기 전에 PIN을 고치면 이전 응답은 버린다.
// - 맞으면: 확인 버튼이 없는 동작은 바로 실행, 있는 동작(삭제)은 버튼을 눌러 실행 (16차)
// - 틀리면: 흔든 뒤 칸을 비워 첫 칸부터 다시 넣는다 (16차)
// - 실행에 실패하면(onConfirm이 false) 칸을 비워 PIN부터 다시 (실패 알림은 실행한 쪽에서)

export const PIN_LENGTH = 4;
/** 틀린 PIN을 비우기까지 (흔들기 애니메이션 0.36초가 끝난 뒤) */
const CLEAR_DELAY_MS = 450;

type Status = 'typing' | 'checking' | 'valid' | 'invalid' | 'submitting';

interface PinStepProps {
    /** 팀 PIN으로 확인할 팀 (합주·팀). checkPin을 주면 쓰지 않는다 */
    teamId?: string;
    /** 팀 PIN이 아닌 것의 PIN 확인 (한마디, V-4). 없으면 팀 PIN(checkTeamPin) */
    checkPin?: (pin: string) => Promise<boolean>;
    /** 확인 버튼 문구. 없으면 PIN이 맞는 즉시 onConfirm */
    confirmLabel?: string;
    /** 되돌릴 수 없는 동작(삭제): 빨간 버튼 */
    danger?: boolean;
    /** PIN이 맞은 뒤 실행. false를 돌려주면(실패) PIN부터 다시 넣게 한다 */
    onConfirm: () => Promise<boolean | void> | boolean | void;
}

const PinStep = ({ teamId, checkPin, confirmLabel, danger = false, onConfirm }: PinStepProps) => {
    const [pin, setPin] = useState('');
    const [status, setStatus] = useState<Status>('typing');
    // 틀릴 때마다 흔들기 애니메이션을 다시 시작한다
    const [attempt, setAttempt] = useState(0);
    // 마지막으로 입력한 PIN. 늦게 온 응답이 지금 PIN의 것인지 확인한다
    const latestPin = useRef('');

    const reset = () => {
        latestPin.current = '';
        setPin('');
    };

    const confirm = async () => {
        setStatus('submitting');
        let ok: boolean | void = false;
        try {
            ok = await onConfirm();
        } catch {
            ok = false;
        }
        if (ok === false) {
            reset();
            setStatus('typing');
        } else {
            setStatus('valid');
        }
    };

    const handleChange = async (value: string) => {
        setPin(value);
        latestPin.current = value;
        if (value.length < PIN_LENGTH) {
            setStatus('typing');
            return;
        }
        setStatus('checking');
        try {
            const ok = await (checkPin ? checkPin(value) : checkTeamPin(teamId ?? '', value));
            if (latestPin.current !== value) return; // 그새 PIN을 고쳤다
            if (!ok) {
                setStatus('invalid');
                setAttempt((n) => n + 1);
                // 흔들기가 끝나면 비운다 (그새 다시 넣기 시작했으면 두기)
                setTimeout(() => {
                    if (latestPin.current === value) reset();
                }, CLEAR_DELAY_MS);
                return;
            }
            setStatus('valid');
            if (!confirmLabel) await confirm();
        } catch {
            if (latestPin.current !== value) return;
            reset();
            setStatus('typing');
            toast.error('PIN을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
        }
    };

    const invalid = status === 'invalid';
    const ready = status === 'valid' || status === 'submitting';

    // 확인 버튼이 있는 단계(삭제)는 PIN이 맞으면 Enter로도 실행한다 (24차, PC). 입력칸에서 Enter = 폼 제출
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (confirmLabel && status === 'valid') void confirm();
    };

    return (
        <form className="flex flex-col items-center" onSubmit={handleSubmit}>
            <PinSlots
                value={pin}
                onChange={handleChange}
                invalid={invalid}
                attempt={attempt}
                disabled={status === 'submitting'}
            />

            {/* 확인 결과 (화면 읽기 프로그램에도 알린다) */}
            <p
                role="status"
                className={cn(
                    'mt-3 flex h-5 items-center gap-1 text-[14px]',
                    invalid ? 'text-red-600' : 'text-neutral-500',
                )}
            >
                {status === 'checking' && (
                    <>
                        <LoaderCircle className="size-4 animate-spin" aria-hidden />
                        확인하는 중…
                    </>
                )}
                {invalid && 'PIN이 맞지 않아요. 다시 입력해 주세요'}
                {status === 'submitting' && !confirmLabel ? (
                    <>
                        <LoaderCircle className="size-4 animate-spin" aria-hidden />
                        저장하는 중…
                    </>
                ) : (
                    ready && (
                        <>
                            <Check className="size-4 text-ink" aria-hidden />
                            <span className="text-ink">확인됐어요</span>
                        </>
                    )
                )}
            </p>

            {confirmLabel && (
                <button
                    type="submit"
                    disabled={status !== 'valid'}
                    className={cn(
                        pressable,
                        'mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-bold disabled:active:scale-100',
                        danger
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-ink text-on-ink hover:bg-neutral-800',
                        !ready && 'bg-neutral-100 text-neutral-400 hover:bg-neutral-100',
                    )}
                >
                    {status === 'submitting' && (
                        <LoaderCircle className="size-5 animate-spin" aria-hidden />
                    )}
                    {confirmLabel}
                </button>
            )}
        </form>
    );
};

/**
 * PIN 4칸 (점으로 가림, 숫자만). 틀리면(invalid) 빨강 + 흔들기 (attempt가 바뀔 때마다 다시 흔든다).
 * PIN 확인(PinStep)과 PIN 만들기(팀 추가, V-3 10차)가 함께 쓴다. aria-label은 "PIN 4자리"
 */
export const PinSlots = ({
    value,
    onChange,
    invalid,
    attempt,
    disabled = false,
}: {
    value: string;
    onChange: (value: string) => void;
    invalid: boolean;
    attempt: number;
    disabled?: boolean;
}) => (
    <div key={attempt} className={cn(invalid && 'animate-shake')}>
        <InputOTP
            maxLength={PIN_LENGTH}
            value={value}
            onChange={onChange}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            aria-label={`PIN ${PIN_LENGTH}자리`}
            disabled={disabled}
        >
            <InputOTPGroup className="gap-3 has-aria-invalid:ring-0">
                {Array.from({ length: PIN_LENGTH }, (_, index) => (
                    <InputOTPSlot
                        key={index}
                        index={index}
                        mask
                        aria-invalid={invalid}
                        className={cn(
                            'size-14 rounded-2xl border border-neutral-200 bg-neutral-50 text-ink first:rounded-2xl last:rounded-2xl md:size-16',
                            'data-[active=true]:border-ink data-[active=true]:bg-surface data-[active=true]:ring-4 data-[active=true]:ring-neutral-900/8',
                            'aria-invalid:border-red-400 aria-invalid:bg-red-50 aria-invalid:text-red-600 data-[active=true]:aria-invalid:border-red-400 data-[active=true]:aria-invalid:ring-red-500/15',
                        )}
                    />
                ))}
            </InputOTPGroup>
        </InputOTP>
    </div>
);

export default PinStep;
