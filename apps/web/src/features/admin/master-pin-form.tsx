import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { pinBlockedSeconds } from '@/api/pin';
import { useChangeMasterPin, useOverview } from '@/queries/admin';

// 마스터 PIN 바꾸기 (관리자 화면, 사용자 요청: B-6에서 API, B-7에서 화면)
// 지금 마스터 PIN을 한 번 더 넣고, 새 PIN 4자리를 두 번. 바꾼 PIN은 서버 DB에 해시로 (같은 DB의 새 서버들이 바로 따른다)
// 옛 서버(api.js)는 운영 전환(B-14) 전까지 .env의 처음 PIN을 계속 쓴다
const PIN = /^\d{4}$/;

const MasterPinForm = () => {
    const { data } = useOverview();
    const change = useChangeMasterPin();
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    const problem = !PIN.test(currentPin)
        ? '지금 마스터 PIN 4자리를 입력해 주세요'
        : !PIN.test(newPin)
          ? '새 PIN은 숫자 4자리예요'
          : newPin !== confirmPin
            ? '새 PIN이 서로 달라요'
            : newPin === currentPin
              ? '지금 PIN과 같아요'
              : null;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (problem || change.isPending) return;
        try {
            await change.mutateAsync({ currentPin, newPin });
            toast.success('마스터 PIN을 바꿨어요.');
            setCurrentPin('');
            setNewPin('');
            setConfirmPin('');
        } catch (err) {
            const blocked = pinBlockedSeconds(err);
            if (blocked !== null) {
                toast.error(
                    `너무 많이 틀렸어요. ${Math.ceil(blocked / 60)}분 뒤에 다시 해 주세요.`,
                );
            } else if (axios.isAxiosError(err) && err.response?.status === 403) {
                toast.error('지금 마스터 PIN이 맞지 않아요.');
            } else {
                toast.error('바꾸지 못했어요. 잠시 후 다시 시도해 주세요.');
            }
        }
    };

    return (
        <section className="ui w-full rounded-card bg-surface p-4 shadow-card md:p-6">
            <h2 className="text-[17px] font-bold text-ink">마스터 PIN 바꾸기</h2>
            <p className="mt-1 text-[14px] break-keep text-neutral-500">
                {data?.masterPinSource === 'db'
                    ? '지금 마스터 PIN: 관리자 화면에서 바꾼 PIN'
                    : '지금 마스터 PIN: 서버 설정(.env)의 처음 PIN'}
                . 모든 팀·날적이·공지의 PIN 자리에서 통과하니 팀원에게 알려 주지 마세요.
            </p>
            <form
                className="mt-4 flex max-w-[360px] flex-col gap-3"
                onSubmit={(e) => void submit(e)}
            >
                <PinField label="지금 마스터 PIN" value={currentPin} onChange={setCurrentPin} />
                <PinField label="새 PIN" value={newPin} onChange={setNewPin} />
                <PinField label="새 PIN 한 번 더" value={confirmPin} onChange={setConfirmPin} />
                <button
                    type="submit"
                    disabled={problem !== null || change.isPending}
                    className="h-12 rounded-xl bg-ink text-[15px] font-bold text-on-ink disabled:bg-neutral-100 disabled:text-neutral-400"
                >
                    {change.isPending ? '바꾸는 중…' : (problem ?? '바꾸기')}
                </button>
            </form>
        </section>
    );
};

const PinField = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) => (
    <label className="flex flex-col gap-1 text-[14px] text-neutral-600">
        {label}
        <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
            className="h-11 rounded-xl border border-neutral-200 bg-surface px-3 text-[16px] tracking-[0.3em] text-ink"
        />
    </label>
);

export default MasterPinForm;
