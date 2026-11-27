import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useActivities } from '@/queries/admin';
import ActivityRow from './activity-row';
import { ACTION_FILTERS, RESULT_FILTERS } from './labels';

// 활동 기록 찾기 (관리자 화면, 백엔드 개편 B-7): 동작·결과·IP로 거르고 50건씩 "더 보기"
const ActivityList = ({ onVisitor }: { onVisitor: (visitorId: string) => void }) => {
    const [action, setAction] = useState('');
    const [result, setResult] = useState('');
    const [ip, setIp] = useState('');
    const query = useActivities({ action, result, ip: ip.trim() });
    const activities = query.data?.pages.flat() ?? [];

    return (
        <section className="ui w-full rounded-card bg-surface p-4 shadow-card md:p-6">
            <h2 className="sr-only">활동 기록</h2>
            <div className="flex flex-wrap gap-2">
                <Select label="동작" value={action} options={ACTION_FILTERS} onChange={setAction} />
                <Select label="결과" value={result} options={RESULT_FILTERS} onChange={setResult} />
                <input
                    aria-label="IP"
                    placeholder="IP"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    className="h-10 w-40 rounded-xl border border-neutral-200 bg-surface px-3 text-[14px] text-ink"
                />
            </div>
            {query.isPending ? (
                <Loading />
            ) : activities.length === 0 ? (
                <p className="py-10 text-center text-[14px] text-neutral-500">기록이 없어요</p>
            ) : (
                <ul className="mt-3">
                    {activities.map((activity) => (
                        <ActivityRow key={activity._id} activity={activity} onVisitor={onVisitor} />
                    ))}
                </ul>
            )}
            {query.hasNextPage && (
                <button
                    type="button"
                    disabled={query.isFetchingNextPage}
                    className="mt-3 h-11 w-full rounded-xl bg-neutral-100 text-[14px] font-bold text-neutral-700 hover:bg-neutral-200"
                    onClick={() => void query.fetchNextPage()}
                >
                    {query.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
                </button>
            )}
        </section>
    );
};

export const Select = ({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: [string, string][];
    onChange: (value: string) => void;
}) => (
    <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-neutral-200 bg-surface px-3 text-[14px] text-ink"
    >
        {options.map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>
                {optionLabel}
            </option>
        ))}
    </select>
);

export const Loading = () => (
    <p className="flex items-center justify-center gap-1.5 py-10 text-[14px] text-neutral-500">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        불러오는 중…
    </p>
);

export default ActivityList;
